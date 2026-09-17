# pyright: reportMissingImports=false, reportAttributeAccessIssue=false, reportGeneralTypeIssues=false, reportOptionalMemberAccess=false, reportUnusedFunction=false
# type: ignore

"""
Management command: seed_school_data
-------------------------------------
Parses the frontend TypeScript mock data files and seeds the Django database
with realistic testing data for Everest International Schools EMIS.

Usage:
    python manage.py seed_school_data          # seed all data
    python manage.py seed_school_data --flush  # wipe & re-seed

Idempotent: uses get_or_create / update_or_create throughout.
"""

import json
import re
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


# ---------------------------------------------------------------------------
# TypeScript -> Python JSON parser utilities
# ---------------------------------------------------------------------------
def _read_file(filepath):
    """Read a file and return its content as a string."""
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def _js_to_json(js_str):
    """
    Transform JavaScript/TypeScript object or array literal text into standard JSON:
    - Preserves string contents intact without stripping URL slashes or quotes inside strings
    - Converts single-quoted strings to double-quoted strings
    - Escapes inner double-quotes inside converted single-quoted strings
    - Automatically double-quotes unquoted object property keys
    - Converts non-boolean/null identifier values into string literals
    - Strips comments (// and /* */) without touching string contents
    - Removes trailing commas before } or ]
    """
    res = []
    i = 0
    n = len(js_str)

    while i < n:
        ch = js_str[i]

        # 1. Skip single-line comment
        if ch == "/" and i + 1 < n and js_str[i + 1] == "/":
            while i < n and js_str[i] != "\n":
                i += 1
            continue

        # 2. Skip multi-line comment
        if ch == "/" and i + 1 < n and js_str[i + 1] == "*":
            i += 2
            while i + 1 < n and not (js_str[i] == "*" and js_str[i + 1] == "/"):
                i += 1
            i += 2
            continue

        # 3. Double-quoted string: pass through exactly, escaping as needed
        if ch == '"':
            res.append('"')
            i += 1
            while i < n:
                c = js_str[i]
                if c == "\\":
                    res.append(c)
                    if i + 1 < n:
                        res.append(js_str[i + 1])
                        i += 2
                    else:
                        i += 1
                    continue
                res.append(c)
                i += 1
                if c == '"':
                    break
            continue

        # 4. Single-quoted string -> convert to double-quoted JSON string
        if ch == "'":
            res.append('"')
            i += 1
            while i < n:
                c = js_str[i]
                if c == "\\":
                    next_c = js_str[i + 1] if i + 1 < n else ""
                    if next_c == "'":
                        res.append("'")
                        i += 2
                    else:
                        res.append("\\")
                        res.append(next_c)
                        i += 2
                    continue
                if c == '"':
                    res.append('\\"')
                    i += 1
                    continue
                if c == "\n":
                    res.append("\\n")
                    i += 1
                    continue
                if c == "\r":
                    i += 1
                    continue
                res.append(c)
                i += 1
                if c == "'":
                    res[-1] = '"'
                    break
            continue

        # 5. Identifier: unquoted key, boolean, null, or identifier value
        if ch.isalpha() or ch == "_" or ch == "$":
            ident_start = i
            while i < n and (js_str[i].isalnum() or js_str[i] in ("_", "$")):
                i += 1
            ident = js_str[ident_start:i]

            peek = i
            while peek < n and js_str[peek] in " \t\r\n":
                peek += 1

            if peek < n and js_str[peek] == ":" and (peek + 1 >= n or js_str[peek + 1] != ":"):
                # Unquoted property key
                res.append(f'"{ident}"')
            else:
                if ident in ("true", "false", "null"):
                    res.append(ident)
                else:
                    res.append(f'"{ident}"')
            continue

        # 6. Trailing comma before } or ]
        if ch == ",":
            peek = i + 1
            while peek < n:
                if js_str[peek] in " \t\r\n":
                    peek += 1
                elif js_str[peek] == "/" and peek + 1 < n and js_str[peek + 1] == "/":
                    while peek < n and js_str[peek] != "\n":
                        peek += 1
                else:
                    break
            if peek < n and js_str[peek] in "}]":
                i += 1
                continue

        res.append(ch)
        i += 1

    return "".join(res)


def _extract_ts_array(content, var_name):
    """
    Extract a TypeScript array variable from source content and parse it as JSON.
    Handles: export const VAR_NAME: Type[] = [ ... ];
    """
    pattern = re.compile(
        rf"(?:export\s+)?(?:const|let|var)\s+{re.escape(var_name)}\s*(?::\s*[^=]+)?\s*=\s*\[",
        re.DOTALL,
    )
    match = pattern.search(content)
    if not match:
        return []

    start = match.end() - 1
    depth = 0
    end = start
    for i in range(start, len(content)):
        if content[i] == "[":
            depth += 1
        elif content[i] == "]":
            depth -= 1
            if depth == 0:
                end = i + 1
                break

    raw = content[start:end]
    clean_json = _js_to_json(raw)
    try:
        return json.loads(clean_json)
    except json.JSONDecodeError as e:
        raise CommandError(
            f"Could not parse TypeScript array '{var_name}': {e}"
        )


def _extract_ts_object(content, var_name):
    """
    Extract a TypeScript object variable and parse it as JSON.
    Handles: export const VAR_NAME: Type = { ... };
    """
    pattern = re.compile(
        rf"(?:export\s+)?(?:const|let|var)\s+{re.escape(var_name)}\s*(?::\s*[^=]+)?\s*=\s*\{{",
        re.DOTALL,
    )
    match = pattern.search(content)
    if not match:
        return {}

    start = match.end() - 1
    depth = 0
    end = start
    for i in range(start, len(content)):
        if content[i] == "{":
            depth += 1
        elif content[i] == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break

    raw = content[start:end]
    clean_json = _js_to_json(raw)
    try:
        return json.loads(clean_json)
    except json.JSONDecodeError as e:
        return {}





class Command(BaseCommand):
    help = "Seed the database with mock data from the frontend TypeScript files."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all existing data before seeding.",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Starting seed_school_data..."))
        self.stdout.write("")

        # Resolve file paths
        workspace = Path(settings.BASE_DIR).parent  # School Portal root
        mock_data_file = workspace / "src" / "data" / "mockDataset100.ts"
        initial_mock_file = workspace / "src" / "data" / "initialMockData.ts"
        enterprise_file = workspace / "src" / "data" / "initialEnterpriseData.ts"
        context_file = workspace / "src" / "context" / "SchoolDataContext.tsx"

        for f in [mock_data_file, initial_mock_file, enterprise_file]:
            if not f.exists():
                raise CommandError(f"Required data file not found: {f}")

        self.stdout.write(f"  Reading data from: {workspace / 'src' / 'data'}")

        # Load file contents
        mock_content = _read_file(mock_data_file)
        initial_content = _read_file(initial_mock_file)
        enterprise_content = _read_file(enterprise_file)
        context_content = _read_file(context_file) if context_file.exists() else ""

        if options["flush"]:
            self._flush()

        with transaction.atomic():
            # 1) Super Admin
            admin_user = self._seed_superadmin()

            # 2) Academic Sessions & Terms
            session, terms = self._seed_sessions_and_terms(initial_content)

            # 3) Subjects
            subjects_map = self._seed_subjects(initial_content)

            # 4) Class Levels
            levels_map = self._seed_class_levels(initial_content)

            # 5) Staff accounts
            staff_map = self._seed_staff(mock_content)

            # 6) Wire form masters on class arms
            arms_map = self._seed_class_arms(mock_content, levels_map, staff_map)

            # 7) Parents
            parents_map = self._seed_parents(mock_content, staff_map)

            # 8) Students
            students_map = self._seed_students(mock_content, arms_map, subjects_map, parents_map)

            # 9) Teacher Allocations
            alloc_count = self._seed_allocations(mock_content, staff_map, arms_map, subjects_map, terms)

            # 10) Subject Scores
            scores_count = self._seed_scores(mock_content, students_map, arms_map, subjects_map, terms)

            # 11) Affective & Psychomotor
            affective_count = self._seed_affective(mock_content, students_map, terms)

            # 12) School Settings
            self._seed_school_settings(enterprise_content)

            # 13) Audit Logs
            audit_count = self._seed_audit_logs(enterprise_content, staff_map)

            # 14) Portal Messages
            msg_count = self._seed_portal_messages(context_content, staff_map, parents_map)

            # 15) Disciplinary Incidents
            incidents_count = self._seed_disciplinary_incidents(enterprise_content, students_map, staff_map)

            # 16) Campus Exeats
            exeats_count = self._seed_campus_exeats(enterprise_content, students_map)

            # 17) Parent Inquiries
            inquiries_count = self._seed_parent_inquiries(enterprise_content, students_map, staff_map, parents_map)

            # 18) Marksheet Submissions
            submissions_count = self._seed_marksheet_submissions(enterprise_content, arms_map, subjects_map, terms, staff_map)

            # 19) Broadsheet Seals
            seals_count = self._seed_broadsheet_seals(enterprise_content, arms_map, terms, staff_map)

            # 20) Weekly Timetable Periods
            periods_count = self._seed_weekly_timetables(enterprise_content, arms_map, subjects_map, staff_map)

            # 21) Exam Timetable Entries
            exams_count = self._seed_exam_timetables(subjects_map, staff_map)

            # 22) Daily Attendance
            attendance_count = self._seed_daily_attendance(students_map)

        # Summary
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("  SEED COMPLETE - Comprehensive School EMIS Database"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(f"  Sessions:             1 (2025/2026)")
        self.stdout.write(f"  Terms:                {len(terms)}")
        self.stdout.write(f"  Class Levels:         {len(levels_map)}")
        self.stdout.write(f"  Class Arms:           {len(arms_map)}")
        self.stdout.write(f"  Subjects:             {len(subjects_map)}")
        self.stdout.write(f"  Super Admin:          admin (Password123!)")
        self.stdout.write(f"  Faculty & Staff:      {len(staff_map)}")
        self.stdout.write(f"  Parents (FK linked):  {len(parents_map)}")
        self.stdout.write(f"  Students (Enrolled):  {len(students_map)}")
        self.stdout.write(f"  Teacher Allocations:  {alloc_count}")
        self.stdout.write(f"  Subject Scores:       {scores_count}")
        self.stdout.write(f"  Affective & Remarks:  {affective_count}")
        self.stdout.write(f"  Audit Logs:           {audit_count}")
        self.stdout.write(f"  Portal Messages:      {msg_count}")
        self.stdout.write(f"  Disciplinary Logs:    {incidents_count}")
        self.stdout.write(f"  Campus Exeats:        {exeats_count}")
        self.stdout.write(f"  Parent Inquiries:     {inquiries_count}")
        self.stdout.write(f"  Marksheet Subs:       {submissions_count}")
        self.stdout.write(f"  Broadsheet Seals:     {seals_count}")
        self.stdout.write(f"  Timetable Periods:    {periods_count}")
        self.stdout.write(f"  Exam Entries:         {exams_count}")
        self.stdout.write(f"  Daily Attendance:     {attendance_count}")
        self.stdout.write(self.style.SUCCESS("=" * 60))

    # -----------------------------------------------------------------------
    # Flush
    # -----------------------------------------------------------------------
    def _flush(self):
        from django.db import connection
        self.stdout.write(self.style.WARNING("  Flushing all existing records across all domains..."))

        from apps.communications.models import PortalMessage, ParentInquiry
        from apps.student_affairs.models import DisciplinaryIncident, CampusExeat
        from apps.timetables.models import WeeklyTimetablePeriod, ExamTimetableEntry
        from apps.grading.models import SubjectScore, SubjectMarksheetSubmission, BroadsheetSeal
        from apps.governance.models import AuditLogEntry
        from apps.students.models import Student, AffectivePsychomotor, DailyAttendance, DroppedSubjectRecord
        from apps.academics.models import (
            AcademicSession, AcademicTerm, ClassLevel, ClassArm, Subject,
            TeacherAllocation,
        )
        from apps.accounts.models import CustomUser

        with connection.cursor() as cursor:
            cursor.execute("PRAGMA foreign_keys = OFF;")

            PortalMessage.objects.all().delete()
            ParentInquiry.objects.all().delete()
            DisciplinaryIncident.objects.all().delete()
            CampusExeat.objects.all().delete()
            WeeklyTimetablePeriod.objects.all().delete()
            ExamTimetableEntry.objects.all().delete()
            SubjectScore.objects.all().delete()
            SubjectMarksheetSubmission.objects.all().delete()
            BroadsheetSeal.objects.all().delete()
            AuditLogEntry.objects.all().delete()
            DailyAttendance.objects.all().delete()
            AffectivePsychomotor.objects.all().delete()
            DroppedSubjectRecord.objects.all().delete()

            cursor.execute("DELETE FROM students_student_registered_subjects;")
            Student.objects.all().delete()
            TeacherAllocation.objects.all().delete()
            ClassArm.objects.all().delete()
            ClassLevel.objects.all().delete()
            Subject.objects.all().delete()
            AcademicTerm.objects.all().delete()
            AcademicSession.objects.all().delete()
            CustomUser.objects.all().delete()

            cursor.execute("PRAGMA foreign_keys = ON;")

        self.stdout.write("  Flush complete.")

    # -----------------------------------------------------------------------
    # 1. Sessions & Terms
    # -----------------------------------------------------------------------
    def _seed_sessions_and_terms(self, content):
        from apps.academics.models import AcademicSession, AcademicTerm

        self.stdout.write("  [1/13] Seeding Academic Sessions & Terms...")

        # Create session 2025/2026
        session, _ = AcademicSession.objects.update_or_create(
            name="2025/2026",
            defaults={"is_current": True},
        )

        terms_data = [
            {
                "name": "1st Term",
                "resumption_date": date(2025, 9, 8),
                "closing_date": date(2025, 12, 12),
                "next_term_resumption_date": date(2026, 1, 12),
                "is_active": False,
                "is_results_published": True,
                "is_results_approved_by_principal": False,
            },
            {
                "name": "2nd Term",
                "resumption_date": date(2026, 1, 12),
                "closing_date": date(2026, 4, 10),
                "next_term_resumption_date": date(2026, 5, 4),
                "is_active": True,
                "is_results_published": True,
                "is_results_approved_by_principal": True,
            },
            {
                "name": "3rd Term",
                "resumption_date": date(2026, 5, 4),
                "closing_date": date(2026, 7, 24),
                "next_term_resumption_date": date(2026, 9, 14),
                "is_active": False,
                "is_results_published": False,
                "is_results_approved_by_principal": False,
            },
        ]

        terms = {}
        for td in terms_data:
            term, _ = AcademicTerm.objects.update_or_create(
                session=session,
                name=td["name"],
                defaults=td,
            )
            terms[td["name"]] = term

        self.stdout.write(self.style.SUCCESS(f"    -> 1 session, {len(terms)} terms"))
        return session, terms

    # -----------------------------------------------------------------------
    # 2. Subjects
    # -----------------------------------------------------------------------
    def _seed_subjects(self, content):
        from apps.academics.models import Subject

        self.stdout.write("  [2/13] Seeding Subjects...")

        subjects_data = _extract_ts_array(content, "INITIAL_SUBJECTS")
        subjects_map = {}  # ts_id -> Subject ORM instance

        for s in subjects_data:
            ts_id = s.get("id", "")
            subj, _ = Subject.objects.update_or_create(
                code=s["code"],
                defaults={
                    "name": s["name"],
                    "category": s.get("category", "CORE"),
                    "applicable_to": s.get("applicableTo", "ALL"),
                    "group": s.get("group", "CORE"),
                    "is_compulsory_junior": s.get("isCompulsoryJunior", False),
                    "is_compulsory_senior_science": s.get("isCompulsorySeniorScience", False),
                },
            )
            subjects_map[ts_id] = subj

        self.stdout.write(self.style.SUCCESS(f"    -> {len(subjects_map)} subjects"))
        return subjects_map

    # -----------------------------------------------------------------------
    # 3. Class Levels
    # -----------------------------------------------------------------------
    def _seed_class_levels(self, content):
        from apps.academics.models import ClassLevel

        self.stdout.write("  [3/13] Seeding Class Levels...")

        levels_data = _extract_ts_array(content, "INITIAL_CLASS_LEVELS")
        levels_map = {}  # ts_id -> ClassLevel ORM instance

        for lv in levels_data:
            ts_id = lv.get("id", "")
            level, _ = ClassLevel.objects.update_or_create(
                name=lv["name"],
                defaults={
                    "section": lv.get("section", "JUNIOR"),
                    "order": lv.get("order", 1),
                },
            )
            levels_map[ts_id] = level

        self.stdout.write(self.style.SUCCESS(f"    -> {len(levels_map)} class levels"))
        return levels_map

    # -----------------------------------------------------------------------
    # 4. Staff Accounts
    # -----------------------------------------------------------------------
    def _seed_staff(self, content):
        from apps.accounts.models import CustomUser

        self.stdout.write("  [4/13] Seeding Staff Accounts...")

        staff_data = _extract_ts_array(content, "FULL_STAFF")
        staff_map = {}  # ts_id -> CustomUser ORM instance
        password = "Password123!"

        for s in staff_data:
            ts_id = s.get("id", "")
            name = s.get("name", "")
            email = s.get("email", "")
            identifier = s.get("identifier", ts_id)
            roles = s.get("roles", [])
            active_role = roles[0] if roles else "SUBJECT_TEACHER"

            # Parse name
            name_parts = name.split()
            # Remove titles like Dr., Mrs., Mr., Engr., etc
            titles = {"Dr.", "Dr", "Mrs.", "Mr.", "Engr.", "Prof.", "(Mrs)", "(PhD)", "(Mrs.)"}
            clean_parts = [p for p in name_parts if p not in titles]
            first_name = clean_parts[0] if clean_parts else name_parts[0]
            last_name = clean_parts[-1] if len(clean_parts) > 1 else ""

            # Generate username from identifier
            username = identifier.replace("/", "_").lower()

            user, created = CustomUser.objects.update_or_create(
                identifier=identifier,
                defaults={
                    "username": username,
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "roles": roles,
                    "active_role": active_role,
                    "phone_number": s.get("phoneNumber", ""),
                    "is_staff": active_role in ("SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL_ACADEMICS", "VICE_PRINCIPAL_ADMIN", "EXAM_OFFICER"),
                    "is_superuser": active_role == "SUPER_ADMIN",
                },
            )
            user.set_password(password)
            user.save()

            staff_map[ts_id] = user

        self.stdout.write(self.style.SUCCESS(f"    -> {len(staff_map)} staff accounts"))
        return staff_map

    # -----------------------------------------------------------------------
    # 5. Class Arms (with form master links)
    # -----------------------------------------------------------------------
    def _seed_class_arms(self, content, levels_map, staff_map):
        from apps.academics.models import ClassArm

        self.stdout.write("  [5/13] Seeding Class Arms...")

        arms_data = _extract_ts_array(content, "FULL_CLASS_ARMS")
        arms_map = {}  # ts_id -> ClassArm ORM instance

        for a in arms_data:
            ts_id = a.get("id", "")
            level_ts_id = a.get("classLevelId", "")
            level = levels_map.get(level_ts_id)
            if not level:
                self.stdout.write(self.style.WARNING(f"    Skipping arm {ts_id}: level {level_ts_id} not found"))
                continue

            form_master_id = a.get("formMasterId", "")
            form_master = staff_map.get(form_master_id)

            arm, _ = ClassArm.objects.update_or_create(
                class_level=level,
                name=a.get("name", ""),
                defaults={
                    "full_name": a.get("fullName", f"{level.name} {a.get('name', '')}"),
                    "form_master": form_master,
                },
            )
            arms_map[ts_id] = arm

        self.stdout.write(self.style.SUCCESS(f"    -> {len(arms_map)} class arms"))
        return arms_map

    # -----------------------------------------------------------------------
    # 6. Parents
    # -----------------------------------------------------------------------
    def _seed_parents(self, content, staff_map):
        from apps.accounts.models import CustomUser

        self.stdout.write("  [6/13] Seeding Parent Accounts...")

        parents_data = _extract_ts_array(content, "FULL_PARENTS")
        parents_map = {}  # ts_id -> CustomUser ORM instance
        password = "Password123!"

        for p in parents_data:
            ts_id = p.get("id", "")
            full_name = p.get("fullName", "")
            email = p.get("email", "")
            phone = p.get("phoneNumber", "") or p.get("phone", "")

            # Generate identifier from email or id
            identifier = email or ts_id

            # Parse name
            name_parts = full_name.split()
            titles = {"Chief", "Dr.", "Dr", "Mrs.", "Mr.", "Engr.", "Prof.", "Barr.",
                       "Alhaji", "Hajia", "Pastor", "Senator", "Capt.", "Architect",
                       "&", "(Mrs.)", "(Mrs)", "(PhD)"}
            clean_parts = [p_part for p_part in name_parts if p_part not in titles]
            first_name = clean_parts[0] if clean_parts else name_parts[0] if name_parts else "Parent"
            last_name = clean_parts[-1] if len(clean_parts) > 1 else ""

            username = f"parent_{ts_id.replace('-', '_')}"

            user, created = CustomUser.objects.update_or_create(
                identifier=identifier,
                defaults={
                    "username": username,
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "roles": ["PARENT"],
                    "active_role": "PARENT",
                    "phone_number": phone,
                    "address": p.get("address", ""),
                },
            )
            user.set_password(password)
            user.save()

            parents_map[ts_id] = user

        self.stdout.write(self.style.SUCCESS(f"    -> {len(parents_map)} parent accounts"))
        return parents_map

    # -----------------------------------------------------------------------
    # 7. Students
    # -----------------------------------------------------------------------
    def _seed_students(self, content, arms_map, subjects_map, parents_map):
        from apps.students.models import Student

        self.stdout.write("  [7/13] Seeding Students (100 records)...")

        students_data = _extract_ts_array(content, "FULL_STUDENTS")
        students_map = {}  # ts_id -> Student ORM instance

        for s in students_data:
            ts_id = s.get("id", "")
            arm_ts_id = s.get("currentClassArmId", "")
            arm = arms_map.get(arm_ts_id)
            if not arm:
                self.stdout.write(self.style.WARNING(f"    Skipping student {ts_id}: arm {arm_ts_id} not found"))
                continue

            parent_ts_id = s.get("parentId", "")
            parent_user = parents_map.get(parent_ts_id)

            student, _ = Student.objects.update_or_create(
                admission_number=s["admissionNumber"],
                defaults={
                    "first_name": s.get("firstName", ""),
                    "last_name": s.get("lastName", ""),
                    "middle_name": s.get("middleName", ""),
                    "gender": s.get("gender", "MALE"),
                    "date_of_birth": s.get("dateOfBirth", "2013-01-01"),
                    "state_of_origin": s.get("stateOfOrigin", ""),
                    "lga": s.get("lga", ""),
                    "house": s.get("house", "Emerald"),
                    "blood_group": s.get("bloodGroup", "O+"),
                    "genotype": s.get("genotype", "AA"),
                    "parent": parent_user,
                    "parent_name": s.get("parentName", ""),
                    "parent_phone": s.get("parentPhone", ""),
                    "parent_email": s.get("parentEmail", ""),
                    "current_class_arm": arm,
                    "is_boarder": s.get("isBoarder", True),
                    "status": s.get("status", "ACTIVE"),
                },
            )

            # Set registered subjects
            subj_ids = s.get("registeredSubjectIds", [])
            subject_objs = [subjects_map[sid] for sid in subj_ids if sid in subjects_map]
            if subject_objs:
                student.registered_subjects.set(subject_objs)

            students_map[ts_id] = student

        self.stdout.write(self.style.SUCCESS(f"    -> {len(students_map)} students"))
        return students_map

    # -----------------------------------------------------------------------
    # 8. Teacher Allocations
    # -----------------------------------------------------------------------
    def _seed_allocations(self, content, staff_map, arms_map, subjects_map, terms):
        from apps.academics.models import TeacherAllocation

        self.stdout.write("  [8/13] Seeding Teacher Allocations...")

        allocs_data = _extract_ts_array(content, "FULL_ALLOCATIONS")
        count = 0

        # Get 2nd term (active term)
        term2 = terms.get("2nd Term")

        for a in allocs_data:
            teacher_ts_id = a.get("teacherId", "")
            arm_ts_id = a.get("classArmId", "")
            subj_ts_id = a.get("subjectId", "")

            teacher = staff_map.get(teacher_ts_id)
            arm = arms_map.get(arm_ts_id)
            subj = subjects_map.get(subj_ts_id)

            if not all([teacher, arm, subj]):
                continue

            TeacherAllocation.objects.update_or_create(
                class_arm=arm,
                subject=subj,
                term=term2,
                defaults={"teacher": teacher},
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"    -> {count} allocations"))
        return count

    # -----------------------------------------------------------------------
    # 9. Subject Scores
    # -----------------------------------------------------------------------
    def _seed_scores(self, content, students_map, arms_map, subjects_map, terms):
        from apps.grading.models import SubjectScore

        self.stdout.write("  [9/13] Seeding Subject Scores...")

        scores_data = _extract_ts_array(content, "FULL_SCORES")
        count = 0

        # Build term lookup by ts_id
        term_lookup = {
            "term-1-2025": terms.get("1st Term"),
            "term-2-2025": terms.get("2nd Term"),
            "term-3-2025": terms.get("3rd Term"),
        }

        for sc in scores_data:
            student_ts_id = sc.get("studentId", "")
            subj_ts_id = sc.get("subjectId", "")
            arm_ts_id = sc.get("classArmId", "")
            term_ts_id = sc.get("termId", "")

            student = students_map.get(student_ts_id)
            subject = subjects_map.get(subj_ts_id)
            arm = arms_map.get(arm_ts_id)
            term = term_lookup.get(term_ts_id)

            if not all([student, subject, arm, term]):
                continue

            # SubjectScore.save() auto-calculates total and grade
            SubjectScore.objects.update_or_create(
                student=student,
                subject=subject,
                term=term,
                defaults={
                    "class_arm": arm,
                    "ca1": Decimal(str(sc.get("ca1", 0))),
                    "ca2": Decimal(str(sc.get("ca2", 0))),
                    "assignment": Decimal(str(sc.get("assignment", 0))),
                    "project": Decimal(str(sc.get("project", 0))),
                    "exam": Decimal(str(sc.get("exam", 0))),
                    "is_locked": sc.get("isLocked", False),
                },
            )
            count += 1

            if count % 200 == 0:
                self.stdout.write(f"    ... {count} scores seeded")

        # Ensure complete score coverage for 2nd Term (active term) for all students
        term2 = terms.get("2nd Term")
        if term2:
            for idx, student in enumerate(students_map.values()):
                for s_idx, subject in enumerate(student.registered_subjects.all()):
                    if not SubjectScore.objects.filter(student=student, subject=subject, term=term2).exists():
                        base = 65 + ((idx * 7 + s_idx * 11) % 28)
                        ca1 = Decimal(str(min(10, max(5, int(base * 0.10)))))
                        ca2 = Decimal(str(min(10, max(5, int(base * 0.09)))))
                        assign = Decimal(str(min(10, max(6, int(base * 0.10)))))
                        proj = Decimal(str(min(10, max(6, int(base * 0.10)))))
                        rem_exam = max(Decimal("25"), min(Decimal("58"), Decimal(str(base)) - (ca1 + ca2 + assign + proj)))

                        SubjectScore.objects.create(
                            student=student,
                            subject=subject,
                            term=term2,
                            class_arm=student.current_class_arm,
                            ca1=ca1,
                            ca2=ca2,
                            assignment=assign,
                            project=proj,
                            exam=rem_exam,
                            is_locked=False,
                        )
                        count += 1

        self.stdout.write(self.style.SUCCESS(f"    -> {count} scores"))
        return count

    # -----------------------------------------------------------------------
    # 10. Affective & Psychomotor
    # -----------------------------------------------------------------------
    def _seed_affective(self, content, students_map, terms):
        from apps.students.models import AffectivePsychomotor

        self.stdout.write("  [10/13] Seeding Affective & Psychomotor Records...")

        affective_data = _extract_ts_array(content, "FULL_AFFECTIVE")
        count = 0

        term_lookup = {
            "term-1-2025": terms.get("1st Term"),
            "term-2-2025": terms.get("2nd Term"),
            "term-3-2025": terms.get("3rd Term"),
        }

        for af in affective_data:
            student_ts_id = af.get("studentId", "")
            term_ts_id = af.get("termId", "")

            student = students_map.get(student_ts_id)
            term = term_lookup.get(term_ts_id)

            if not student or not term:
                continue

            AffectivePsychomotor.objects.update_or_create(
                student=student,
                term=term,
                defaults={
                    "punctuality": af.get("punctuality", 4),
                    "neatness": af.get("neatness", 4),
                    "politeness": af.get("politeness", 5),
                    "attentiveness": af.get("attentiveness", 4),
                    "honesty": af.get("honesty", 5),
                    "relationship_with_peers": af.get("relationshipWithPeers", 4),
                    "handwriting": af.get("handwriting", 4),
                    "sports_and_games": af.get("sportsAndGames", 4),
                    "craftsmanship": af.get("craftsmanship", 3),
                    "musical_artistic_skill": af.get("musicalArtisticSkill", 4),
                    "form_master_remark": af.get("formMasterRemark", ""),
                    "principal_remark": af.get("principalRemark", ""),
                    "days_present": af.get("daysPresent", 62),
                    "days_absent": af.get("daysAbsent", 3),
                    "total_school_days": af.get("totalSchoolDays", 65),
                },
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"    -> {count} affective records"))
        return count

    # -----------------------------------------------------------------------
    # 11. School Settings (singleton)
    # -----------------------------------------------------------------------
    def _seed_school_settings(self, content):
        from apps.governance.models import SchoolSettings

        self.stdout.write("  [11/13] Seeding School Settings...")

        settings_data = _extract_ts_object(content, "DEFAULT_SCHOOL_SETTINGS")

        obj = SchoolSettings.load()
        obj.principal_name = settings_data.get("principalName", "Dr. Mrs. A. O. Adeleke")
        obj.principal_title = settings_data.get("principalTitle", "Principal & Head of Academics")
        obj.show_watermark_in_print = settings_data.get("showWatermarkInPrint", True)
        obj.show_watermark_in_preview = settings_data.get("showWatermarkInPreview", True)
        obj.auto_sign_report_cards = settings_data.get("autoSignReportCards", True)
        obj.school_motto = settings_data.get("schoolMotto", "Excellence - Character - Leadership")
        obj.school_address = settings_data.get("schoolAddress", "Plot 12, Academic Boulevard, Victoria Island Extension, Lagos, Nigeria")
        obj.school_phone = settings_data.get("schoolPhone", "+234 1 800 383 7378")
        obj.school_email = settings_data.get("schoolEmail", "admissions@everest.sch.ng")
        obj.save()

        self.stdout.write(self.style.SUCCESS("    -> School settings configured"))

    # -----------------------------------------------------------------------
    # 12. Audit Logs
    # -----------------------------------------------------------------------
    def _seed_audit_logs(self, content, staff_map):
        from apps.governance.models import AuditLogEntry

        self.stdout.write("  [12/13] Seeding Audit Logs...")

        logs_data = _extract_ts_array(content, "INITIAL_AUDIT_LOGS")
        count = 0

        for log in logs_data:
            user_ts_id = log.get("userId", "")
            user = staff_map.get(user_ts_id)

            # Parse diff items
            diff_items = log.get("diff", [])
            diff_json = []
            for d in diff_items:
                diff_json.append({
                    "field": d.get("field", ""),
                    "previousValue": d.get("previousValue", ""),
                    "newValue": d.get("newValue", ""),
                })

            timestamp = log.get("timestamp", "2026-03-28T00:00:00Z")

            AuditLogEntry.objects.update_or_create(
                action=log.get("action", ""),
                target_entity=log.get("targetEntity", ""),
                timestamp=timestamp,
                defaults={
                    "user": user,
                    "user_role": log.get("userRole", "SYSTEM"),
                    "details": log.get("details", ""),
                    "diff": diff_json if diff_json else None,
                    "metadata": log.get("metadata"),
                },
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"    -> {count} audit log entries"))
        return count

    # -----------------------------------------------------------------------
    # 13. Portal Messages
    # -----------------------------------------------------------------------
    def _seed_portal_messages(self, content, staff_map, parents_map):
        from apps.communications.models import PortalMessage

        self.stdout.write("  [13/13] Seeding Portal Messages...")

        if not content:
            self.stdout.write(self.style.WARNING("    -> SchoolDataContext.tsx not found, skipping messages"))
            return 0

        msgs_data = _extract_ts_array(content, "INITIAL_PORTAL_MESSAGES")
        count = 0

        # Build a combined user lookup
        all_users = {}
        all_users.update(staff_map)
        all_users.update(parents_map)
        # Also look up by other IDs used in messages (admin-001, par-001, etc)
        for key, user in list(staff_map.items()):
            all_users[key] = user
        for key, user in list(parents_map.items()):
            all_users[key] = user

        for msg in msgs_data:
            sender_ts_id = msg.get("senderId", "")
            recipient_ts_id = msg.get("recipientId", "")

            sender = all_users.get(sender_ts_id)
            recipient_user = all_users.get(recipient_ts_id)

            if not sender:
                # Try to find sender from any staff
                continue

            created_at = msg.get("createdAt", "2026-03-24T08:30:00.000Z")
            read_at_str = msg.get("readAt")
            read_at = None
            if read_at_str:
                try:
                    read_at = datetime.fromisoformat(read_at_str.replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    pass

            PortalMessage.objects.update_or_create(
                thread_id=msg.get("threadId", f"th-{count}"),
                subject=msg.get("subject", ""),
                sender=sender,
                defaults={
                    "recipient_user": recipient_user if recipient_ts_id != "ALL" else None,
                    "recipient_role": msg.get("recipientRole", "ALL"),
                    "content": msg.get("content", ""),
                    "is_read": msg.get("isRead", False),
                    "read_at": read_at,
                    "priority": msg.get("priority", "NORMAL"),
                    "related_entity": msg.get("relatedEntity"),
                    "created_at": created_at,
                },
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"    -> {count} portal messages"))
        return count

    # -----------------------------------------------------------------------
    # 14. Super Admin
    # -----------------------------------------------------------------------
    def _seed_superadmin(self):
        from apps.accounts.models import CustomUser

        self.stdout.write("  [1/22] Seeding Super Admin Account...")
        admin_user, created = CustomUser.objects.update_or_create(
            username="admin",
            defaults={
                "identifier": "admin",
                "email": "admin@everest.edu.ng",
                "first_name": "System",
                "last_name": "Administrator",
                "roles": ["SUPER_ADMIN"],
                "active_role": "SUPER_ADMIN",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin_user.set_password("Password123!")
        admin_user.save()
        self.stdout.write(self.style.SUCCESS("    -> Super Admin configured (admin / Password123!)"))
        return admin_user

    # -----------------------------------------------------------------------
    # 15. Disciplinary Incidents
    # -----------------------------------------------------------------------
    def _seed_disciplinary_incidents(self, content, students_map, staff_map):
        from apps.student_affairs.models import DisciplinaryIncident

        self.stdout.write("  [15/22] Seeding Disciplinary Incidents...")
        data = _extract_ts_array(content, "INITIAL_DISCIPLINARY_INCIDENTS")
        count = 0
        vp_admin = next((u for u in staff_map.values() if u.active_role == "VICE_PRINCIPAL_ADMIN"), None) or list(staff_map.values())[0]

        for item in data:
            std_ts_id = item.get("studentId", "")
            student = students_map.get(std_ts_id)
            if not student:
                adm = item.get("admissionNumber", "")
                student = next((s for s in students_map.values() if s.admission_number == adm), None)
            if not student:
                continue

            DisciplinaryIncident.objects.update_or_create(
                student=student,
                incident_type=item.get("incidentType", "UNIFORM_DRESS_CODE"),
                date=item.get("date", "2026-03-24"),
                defaults={
                    "severity": item.get("severity", "LOW"),
                    "description": item.get("description", ""),
                    "action_taken": item.get("actionTaken", "VERBAL_WARNING"),
                    "demerit_points": item.get("demeritPoints", 2),
                    "recorded_by": vp_admin,
                    "status": item.get("status", "RESOLVED"),
                    "resolution_notes": item.get("resolutionNotes", ""),
                },
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"    -> {count} disciplinary incidents"))
        return count

    # -----------------------------------------------------------------------
    # 16. Campus Exeats
    # -----------------------------------------------------------------------
    def _seed_campus_exeats(self, content, students_map):
        from apps.student_affairs.models import CampusExeat

        self.stdout.write("  [16/22] Seeding Campus Exeats...")
        data = _extract_ts_array(content, "INITIAL_CAMPUS_EXEATS")
        count = 0

        for item in data:
            std_ts_id = item.get("studentId", "")
            student = students_map.get(std_ts_id)
            if not student:
                adm = item.get("admissionNumber", "")
                student = next((s for s in students_map.values() if s.admission_number == adm), None)
            if not student:
                continue

            dep_str = item.get("departureDate", "2026-03-26T09:30:00Z")
            ret_str = item.get("expectedReturnDate", "2026-03-27T16:00:00Z")
            act_str = item.get("actualReturnDate")

            try:
                dep = datetime.fromisoformat(dep_str.replace("Z", "+00:00"))
                ret = datetime.fromisoformat(ret_str.replace("Z", "+00:00"))
                act = datetime.fromisoformat(act_str.replace("Z", "+00:00")) if act_str else None
            except Exception:
                continue

            CampusExeat.objects.update_or_create(
                student=student,
                departure_date=dep,
                destination=item.get("destination", "Lagos"),
                defaults={
                    "exeat_type": item.get("exeatType", "MEDICAL"),
                    "expected_return_date": ret,
                    "actual_return_date": act,
                    "reason": item.get("reason", ""),
                    "authorized_guardian": item.get("authorizedGuardian", ""),
                    "guardian_phone": item.get("guardianPhone", ""),
                    "status": item.get("status", "RETURNED"),
                },
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"    -> {count} campus exeats"))
        return count

    # -----------------------------------------------------------------------
    # 17. Parent Inquiries
    # -----------------------------------------------------------------------
    def _seed_parent_inquiries(self, content, students_map, staff_map, parents_map):
        from apps.communications.models import ParentInquiry

        self.stdout.write("  [17/22] Seeding Parent Inquiries...")
        data = _extract_ts_array(content, "INITIAL_PARENT_INQUIRIES")
        count = 0

        for item in data:
            std_ts_id = item.get("studentId", "")
            student = students_map.get(std_ts_id)
            parent_ts_id = item.get("parentId", "")
            parent = parents_map.get(parent_ts_id)
            staff_ts_id = item.get("recipientStaffId", "")
            staff = next((u for u in staff_map.values() if u.identifier == staff_ts_id), None) or list(staff_map.values())[0]

            if not student or not parent:
                continue

            replied_at_str = item.get("repliedAt")
            replied_at = None
            if replied_at_str:
                try:
                    replied_at = datetime.fromisoformat(replied_at_str.replace("Z", "+00:00"))
                except Exception:
                    pass

            ParentInquiry.objects.update_or_create(
                student=student,
                parent=parent,
                subject=item.get("subject", ""),
                defaults={
                    "recipient_staff": staff,
                    "message": item.get("message", ""),
                    "status": item.get("status", "RESOLVED"),
                    "staff_reply": item.get("staffReply", ""),
                    "replied_at": replied_at,
                },
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"    -> {count} parent inquiries"))
        return count

    # -----------------------------------------------------------------------
    # 18. Subject Marksheet Submissions
    # -----------------------------------------------------------------------
    def _seed_marksheet_submissions(self, content, arms_map, subjects_map, terms, staff_map):
        from apps.grading.models import SubjectMarksheetSubmission

        self.stdout.write("  [18/22] Seeding Subject Marksheet Submissions...")
        data = _extract_ts_array(content, "INITIAL_SUBJECT_SUBMISSIONS")
        count = 0
        term2 = terms.get("2nd Term")

        for item in data:
            arm_ts_id = item.get("classArmId", "")
            arm = arms_map.get(arm_ts_id)
            subj_ts_id = item.get("subjectId", "")
            subj = subjects_map.get(subj_ts_id)
            teacher_id = item.get("teacherId", "")
            teacher = next((u for u in staff_map.values() if u.identifier == teacher_id), None) or list(staff_map.values())[0]

            if not arm or not subj:
                continue

            sub_date_str = item.get("submittedAt")
            sub_date = None
            if sub_date_str:
                try:
                    sub_date = datetime.fromisoformat(sub_date_str.replace("Z", "+00:00"))
                except Exception:
                    pass

            SubjectMarksheetSubmission.objects.update_or_create(
                class_arm=arm,
                subject=subj,
                term=term2,
                defaults={
                    "teacher": teacher,
                    "status": item.get("status", "SUBMITTED"),
                    "submitted_at": sub_date,
                    "graded_students_count": item.get("gradedStudentsCount", 5),
                    "total_students_count": item.get("totalStudentsCount", 5),
                    "class_average": Decimal(str(item.get("classAverage", "70.0"))),
                    "submission_comments": item.get("submissionComments", ""),
                },
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"    -> {count} marksheet submissions"))
        return count

    # -----------------------------------------------------------------------
    # 19. Broadsheet Seals
    # -----------------------------------------------------------------------
    def _seed_broadsheet_seals(self, content, arms_map, terms, staff_map):
        from apps.grading.models import BroadsheetSeal

        self.stdout.write("  [19/22] Seeding Broadsheet Seals...")
        data = _extract_ts_array(content, "INITIAL_BROADSHEET_SEALS")
        count = 0
        term2 = terms.get("2nd Term")
        exam_officer = next((u for u in staff_map.values() if u.active_role == "EXAM_OFFICER"), None)

        for item in data:
            arm_ts_id = item.get("classArmId", "")
            arm = arms_map.get(arm_ts_id)
            if not arm:
                continue

            sealed_at_str = item.get("sealedAt")
            sealed_at = None
            if sealed_at_str:
                try:
                    sealed_at = datetime.fromisoformat(sealed_at_str.replace("Z", "+00:00"))
                except Exception:
                    pass

            BroadsheetSeal.objects.update_or_create(
                class_arm=arm,
                term=term2,
                defaults={
                    "is_sealed": item.get("isSealed", False),
                    "sealed_at": sealed_at,
                    "sealed_by": exam_officer if item.get("isSealed") else None,
                    "submission_notes": item.get("submissionNotes", ""),
                    "missing_marks_count": item.get("missingMarksCount", 0),
                },
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"    -> {count} broadsheet seals"))
        return count

    # -----------------------------------------------------------------------
    # 20. Weekly Timetables
    # -----------------------------------------------------------------------
    def _seed_weekly_timetables(self, content, arms_map, subjects_map, staff_map):
        from apps.timetables.models import WeeklyTimetablePeriod

        self.stdout.write("  [20/22] Seeding Weekly Timetable Periods...")
        data = _extract_ts_object(content, "INITIAL_WEEKLY_TIMETABLES")
        count = 0
        subj_by_code = {s.code: s for s in subjects_map.values()}
        default_teacher = list(staff_map.values())[0]

        for arm_ts_id, arm in arms_map.items():
            timetable_days = data.get(arm_ts_id)
            if not timetable_days:
                timetable_days = data.get("arm-sss2-gold", [])

            for day_info in timetable_days:
                day_name = day_info.get("day", "Monday")
                for p in day_info.get("periods", []):
                    code = p.get("subjectCode", "ENG")
                    subj = subj_by_code.get(code) or list(subjects_map.values())[0]
                    t_name = p.get("teacherName", "")
                    teacher = next((u for u in staff_map.values() if (u.last_name and u.last_name in t_name) or (u.first_name and u.first_name in t_name)), default_teacher)

                    WeeklyTimetablePeriod.objects.update_or_create(
                        class_arm=arm,
                        day=day_name,
                        period_number=p.get("periodNumber", 1),
                        defaults={
                            "time_range": p.get("timeRange", "08:15 - 09:00"),
                            "subject": subj,
                            "teacher": teacher,
                            "room_or_lab": p.get("roomOrLab", "Senior Wing 2A"),
                            "is_break": False,
                        },
                    )
                    count += 1

        self.stdout.write(self.style.SUCCESS(f"    -> {count} weekly timetable periods"))
        return count

    # -----------------------------------------------------------------------
    # 21. Exam Timetable Entries
    # -----------------------------------------------------------------------
    def _seed_exam_timetables(self, subjects_map, staff_map):
        from apps.timetables.models import ExamTimetableEntry

        self.stdout.write("  [21/22] Seeding Exam Timetable Entries...")
        count = 0
        exam_officer = next((u for u in staff_map.values() if u.active_role == "EXAM_OFFICER"), None) or list(staff_map.values())[0]
        subj_by_code = {s.code: s for s in subjects_map.values()}

        exams = [
            ("2026-04-06", "09:00 - 11:30 (Morning Session)", "MORNING", "ENG", ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"], "Main Auditorium Hall A"),
            ("2026-04-06", "13:30 - 15:30 (Afternoon Session)", "AFTERNOON", "CIV", ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"], "Main Auditorium Hall B"),
            ("2026-04-07", "09:00 - 11:30 (Morning Session)", "MORNING", "MTH", ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"], "Main Auditorium Hall A"),
            ("2026-04-07", "13:30 - 15:30 (Afternoon Session)", "AFTERNOON", "DP", ["SSS 1", "SSS 2", "SSS 3"], "ICT Hub 1 & 2"),
            ("2026-04-08", "09:00 - 11:30 (Morning Session)", "MORNING", "PHY", ["SSS 1", "SSS 2", "SSS 3"], "Physics & Science Amphitheatre"),
            ("2026-04-08", "13:30 - 15:30 (Afternoon Session)", "AFTERNOON", "BSC", ["JSS 1", "JSS 2", "JSS 3"], "Junior Science Wing"),
            ("2026-04-09", "09:00 - 11:30 (Morning Session)", "MORNING", "CHE", ["SSS 1", "SSS 2", "SSS 3"], "Chemistry Lab Hall"),
            ("2026-04-09", "13:30 - 15:30 (Afternoon Session)", "AFTERNOON", "BIO", ["SSS 1", "SSS 2", "SSS 3"], "Biology Lab Hall"),
            ("2026-04-10", "09:00 - 11:30 (Morning Session)", "MORNING", "ECO", ["SSS 1", "SSS 2", "SSS 3"], "Senior Wing Hall"),
        ]

        for dt, slot, stype, code, classes, hall in exams:
            subj = subj_by_code.get(code)
            if not subj:
                continue
            ExamTimetableEntry.objects.update_or_create(
                exam_date=date.fromisoformat(dt),
                time_slot=slot,
                defaults={
                    "session_type": stype,
                    "subject": subj,
                    "applicable_classes": classes,
                    "exam_hall": hall,
                    "chief_invigilator": exam_officer,
                    "special_instructions": "Non-programmable mathematical calculators permitted. All smart watches and cellular devices prohibited.",
                },
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"    -> {count} exam timetable entries"))
        return count

    # -----------------------------------------------------------------------
    # 22. Daily Attendance
    # -----------------------------------------------------------------------
    def _seed_daily_attendance(self, students_map):
        from apps.students.models import DailyAttendance

        self.stdout.write("  [22/22] Seeding Daily Attendance Records...")
        count = 0
        school_dates = [
            date(2026, 3, 23),
            date(2026, 3, 24),
            date(2026, 3, 25),
            date(2026, 3, 26),
            date(2026, 3, 27),
        ]

        for idx, student in enumerate(students_map.values()):
            for day_idx, day_date in enumerate(school_dates):
                stat = "PRESENT"
                if (idx + day_idx) % 17 == 0:
                    stat = "LATE"
                elif (idx + day_idx) % 29 == 0:
                    stat = "EXCUSED"

                DailyAttendance.objects.update_or_create(
                    student=student,
                    date=day_date,
                    defaults={
                        "class_arm": student.current_class_arm,
                        "status": stat,
                    },
                )
                count += 1

        self.stdout.write(self.style.SUCCESS(f"    -> {count} attendance records"))
        return count
