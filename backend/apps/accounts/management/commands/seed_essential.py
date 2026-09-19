from django.core.management.base import BaseCommand
from datetime import date
from apps.accounts.models import CustomUser
from apps.academics.models import AcademicSession, AcademicTerm, Subject

class Command(BaseCommand):
    help = "Seeds essential administrative accounts and academic data quickly (under 2 seconds)."

    def handle(self, *args, **options):
        self.stdout.write("Seeding essential school accounts and terms...")

        # 1. Super Admin
        admin_user, _ = CustomUser.objects.update_or_create(
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
            }
        )
        admin_user.set_password("Password123!")
        admin_user.save()

        # 2. Complete Staff Body (20 Staff Members matching FULL_STAFF)
        staff_data = [
            ("STF/2026/001", "stf_2026_001", "admin@everest.com", "Kenneth", "Balogun", ["SUPER_ADMIN"], "SUPER_ADMIN", "Systems Administrator & IT Director"),
            ("STF/2026/002", "stf_2026_002", "principal@everest.com", "Cordelia", "Okonkwo", ["PRINCIPAL"], "PRINCIPAL", "Principal & Head of Academics"),
            ("STF/2026/003", "stf_2026_003", "exam@everest.com", "Samuel", "Danjuma", ["EXAM_OFFICER"], "EXAM_OFFICER", "Chief Examination & Records Officer"),
            ("STF/2026/004", "stf_2026_004", "vp.admin@everest.com", "Ayodele", "Tinubu", ["VICE_PRINCIPAL_ADMIN", "ADMISSIONS_OFFICER"], "VICE_PRINCIPAL_ADMIN", "Vice Principal (Administration & Student Affairs)"),
            ("STF/2026/019", "stf_2026_019", "vp.academics@everest.com", "Babatunde", "Fashola", ["VICE_PRINCIPAL_ACADEMICS", "SUBJECT_TEACHER"], "VICE_PRINCIPAL_ACADEMICS", "Vice Principal (Academics & Instruction)"),
            ("STF/2026/005", "stf_2026_005", "f.alabi@everest.com", "Folashade", "Alabi", ["SUBJECT_TEACHER", "FORM_MASTER"], "SUBJECT_TEACHER", "Mathematics Teacher & Form Master JSS 1 Gold"),
            ("STF/2026/006", "stf_2026_006", "c.eze@everest.com", "Chukwuma", "Eze", ["SUBJECT_TEACHER", "FORM_MASTER"], "SUBJECT_TEACHER", "English Language Teacher & Form Master JSS 1 Emerald"),
            ("STF/2026/011", "stf_2026_011", "n.okeke@everest.com", "Ngozi", "Okeke", ["SUBJECT_TEACHER", "FORM_MASTER"], "SUBJECT_TEACHER", "Basic Science Teacher & Form Master JSS 2 Gold"),
            ("STF/2026/012", "stf_2026_012", "a.garba@everest.com", "Abubakar", "Garba", ["SUBJECT_TEACHER", "FORM_MASTER"], "SUBJECT_TEACHER", "Hausa Language Teacher & Form Master JSS 2 Diamond"),
            ("STF/2026/013", "stf_2026_013", "k.adeleke@everest.com", "Kemi", "Adeleke", ["SUBJECT_TEACHER", "FORM_MASTER"], "SUBJECT_TEACHER", "Yoruba Language Teacher & Form Master JSS 3 Gold"),
            ("STF/2026/014", "stf_2026_014", "e.okafor@everest.com", "Emmanuel", "Okafor", ["SUBJECT_TEACHER", "FORM_MASTER"], "SUBJECT_TEACHER", "Igbo Language Teacher & Form Master JSS 3 Diamond"),
            ("STF/2026/007", "stf_2026_007", "p.bello@everest.com", "Paul", "Bello", ["SUBJECT_TEACHER", "FORM_MASTER"], "SUBJECT_TEACHER", "Chemistry Teacher & Form Master SSS 1 Gold"),
            ("STF/2026/008", "stf_2026_008", "h.musa@everest.com", "Hadiza", "Musa", ["SUBJECT_TEACHER", "FORM_MASTER"], "SUBJECT_TEACHER", "Biology Teacher & Form Master SSS 1 Diamond"),
            ("STF/2026/018", "stf_2026_018", "m.adebayo@everest.com", "Michael", "Adebayo", ["SUBJECT_TEACHER", "FORM_MASTER"], "SUBJECT_TEACHER", "Senior Physics Master & Form Master SSS 2 Gold"),
            ("STF/2026/009", "stf_2026_009", "t.nwosu@everest.com", "Tochukwu", "Nwosu", ["SUBJECT_TEACHER", "FORM_MASTER"], "SUBJECT_TEACHER", "Civic Education Teacher & Form Master SSS 2 Diamond"),
            ("STF/2026/010", "stf_2026_010", "b.cole@everest.com", "Bridget", "Cole", ["SUBJECT_TEACHER", "FORM_MASTER"], "SUBJECT_TEACHER", "Economics Teacher & Form Master SSS 3 Gold"),
            ("STF/2026/015", "stf_2026_015", "a.umar@everest.com", "Amina", "Umar", ["SUBJECT_TEACHER", "FORM_MASTER"], "SUBJECT_TEACHER", "Agricultural Science Teacher & Form Master SSS 3 Diamond"),
            ("STF/2026/016", "stf_2026_016", "d.oladipo@everest.com", "David", "Oladipo", ["SUBJECT_TEACHER"], "SUBJECT_TEACHER", "Further Mathematics & Technical Drawing"),
            ("STF/2026/017", "stf_2026_017", "f.sanusi@everest.com", "Fatima", "Sanusi", ["SUBJECT_TEACHER"], "SUBJECT_TEACHER", "Computer Studies & Data Processing Lead"),
            ("STF/2026/020", "stf_2026_020", "g.bassey@everest.com", "Grace", "Bassey", ["SUBJECT_TEACHER"], "SUBJECT_TEACHER", "Food & Nutrition / Home Economics Head"),
        ]

        staff_map = {}
        for ident, uname, em, fn, ln, roles, active_role, title in staff_data:
            s_user, _ = CustomUser.objects.update_or_create(
                identifier=ident,
                defaults={
                    "username": uname,
                    "email": em,
                    "first_name": fn,
                    "last_name": ln,
                    "roles": roles,
                    "active_role": active_role,
                    "is_staff": True,
                    "is_active": True,
                }
            )
            s_user.set_password("Password123!")
            s_user.save()
            staff_map[ident] = s_user

        # 3. Parent Account
        parent, _ = CustomUser.objects.update_or_create(
            identifier="PRT/2026/001",
            defaults={
                "username": "prt_2026_001",
                "email": "parent@everest.com",
                "first_name": "Adeola",
                "last_name": "Balogun",
                "roles": ["PARENT"],
                "active_role": "PARENT",
                "is_active": True,
            }
        )
        parent.set_password("Password123!")
        parent.save()

        # 4. Session & All 3 Terms (1st, 2nd, 3rd)
        session, _ = AcademicSession.objects.update_or_create(
            name="2025/2026",
            defaults={"is_current": True}
        )
        AcademicTerm.objects.update_or_create(
            session=session,
            name="1st Term",
            defaults={
                "resumption_date": date(2025, 9, 8),
                "closing_date": date(2025, 12, 12),
                "next_term_resumption_date": date(2026, 1, 12),
                "is_active": False,
                "is_results_published": True,
            }
        )
        AcademicTerm.objects.update_or_create(
            session=session,
            name="2nd Term",
            defaults={
                "resumption_date": date(2026, 1, 12),
                "closing_date": date(2026, 4, 10),
                "next_term_resumption_date": date(2026, 5, 4),
                "is_active": True,
                "is_results_published": True,
                "is_results_approved_by_principal": True,
            }
        )
        AcademicTerm.objects.update_or_create(
            session=session,
            name="3rd Term",
            defaults={
                "resumption_date": date(2026, 5, 4),
                "closing_date": date(2026, 7, 24),
                "next_term_resumption_date": date(2026, 9, 14),
                "is_active": False,
                "is_results_published": False,
                "is_results_approved_by_principal": False,
            }
        )

        # 5. Class Levels & Arms with Form Masters
        from apps.academics.models import ClassLevel, ClassArm

        form_master_assignments = {
            ("JSS 1", "Gold"): "STF/2026/005",
            ("JSS 1", "Emerald"): "STF/2026/006",
            ("JSS 2", "Gold"): "STF/2026/011",
            ("JSS 2", "Diamond"): "STF/2026/012",
            ("JSS 3", "Gold"): "STF/2026/013",
            ("JSS 3", "Diamond"): "STF/2026/014",
            ("SSS 1", "Gold"): "STF/2026/007",
            ("SSS 1", "Diamond"): "STF/2026/008",
            ("SSS 2", "Gold"): "STF/2026/018",
            ("SSS 2", "Diamond"): "STF/2026/009",
            ("SSS 3", "Gold"): "STF/2026/010",
            ("SSS 3", "Diamond"): "STF/2026/015",
        }
        
        levels_data = [
            ("JSS 1", "JUNIOR", 1, ["Gold", "Emerald", "Diamond"]),
            ("JSS 2", "JUNIOR", 2, ["Gold", "Diamond", "Emerald"]),
            ("JSS 3", "JUNIOR", 3, ["Gold", "Diamond", "Emerald"]),
            ("SSS 1", "SENIOR", 4, ["Gold", "Diamond", "Science Emerald", "Science Diamond", "Commercial Gold", "Arts Platinum"]),
            ("SSS 2", "SENIOR", 5, ["Gold", "Diamond", "Science Emerald", "Science Diamond", "Commercial Gold", "Arts Platinum"]),
            ("SSS 3", "SENIOR", 6, ["Gold", "Diamond", "Science Emerald", "Science Diamond", "Commercial Gold", "Arts Platinum"]),
        ]
        for lvl_name, sec, order, arms in levels_data:
            lvl, _ = ClassLevel.objects.update_or_create(
                name=lvl_name,
                defaults={"section": sec, "order": order}
            )
            for arm_name in arms:
                fm_ident = form_master_assignments.get((lvl_name, arm_name))
                fm_user = staff_map.get(fm_ident) if fm_ident else None
                ClassArm.objects.update_or_create(
                    class_level=lvl,
                    name=arm_name,
                    defaults={
                        "full_name": f"{lvl_name} {arm_name}",
                        "form_master": fm_user,
                    }
                )

        # 9. Core Subjects
        subjects = [
            ("Mathematics", "MTH", "CORE", "ALL", "CORE"),
            ("English Language", "ENG", "CORE", "ALL", "CORE"),
            ("Civic Education", "CIV", "CORE", "ALL", "CORE"),
            ("Physics", "PHY", "SCIENCE", "SENIOR", "CORE"),
            ("Chemistry", "CHE", "SCIENCE", "SENIOR", "CORE"),
            ("Biology", "BIO", "SCIENCE", "SENIOR", "CORE"),
            ("Economics", "ECO", "COMMERCIAL", "SENIOR", "GENERAL_ELECTIVE"),
            ("Data Processing", "DP", "CORE", "SENIOR", "TRADE"),
            ("Geography", "GEO", "ARTS", "SENIOR", "GENERAL_ELECTIVE"),
            ("Agricultural Science", "AGR", "SCIENCE", "ALL", "GENERAL_ELECTIVE"),
            ("Basic Science", "BSC", "CORE", "JUNIOR", "CORE"),
            ("Basic Technology", "BTECH", "CORE", "JUNIOR", "CORE"),
        ]
        for name, code, cat, app, grp in subjects:
            Subject.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "category": cat,
                    "applicable_to": app,
                    "group": grp,
                    "is_compulsory_junior": app == "JUNIOR",
                    "is_compulsory_senior_science": code in ("MTH", "ENG", "CIV", "PHY", "CHE", "BIO"),
                }
            )

        # 10. Seed Full 60 Student Body (JSS 1 through SSS 3)
        from apps.students.models import Student
        from django.conf import settings
        import re
        import json
        from pathlib import Path
        from unittest.mock import patch

        dataset_path = Path(settings.BASE_DIR).parent / "src" / "data" / "mockDataset100.ts"
        if dataset_path.exists():
            with open(dataset_path, "r", encoding="utf-8") as f:
                ts_content = f.read()
            match = re.search(r"export const FULL_STUDENTS.*?=\s*(\[.*?\]);", ts_content, re.DOTALL)
            if match:
                js_arr = match.group(1)
                cleaned = re.sub(r",\s*([\]}])", r"\1", js_arr)
                student_list = json.loads(cleaned)
                all_subjs = list(Subject.objects.all())
                
                with patch("django.core.mail.send_mail", return_value=1):
                    for s_data in student_list:
                        adm = s_data.get("admissionNumber")
                        if not adm:
                            continue
                        arm_full_name = s_data.get("currentClassArmName", "")
                        arm = ClassArm.objects.filter(full_name__iexact=arm_full_name).first()
                        if not arm:
                            arm = ClassArm.objects.first()

                        house = s_data.get("house", "Emerald")
                        if house not in ["Emerald", "Sapphire", "Ruby", "Diamond"]:
                            house = "Emerald"

                        st, _ = Student.objects.update_or_create(
                            admission_number=adm,
                            defaults={
                                "first_name": s_data.get("firstName", ""),
                                "last_name": s_data.get("lastName", ""),
                                "middle_name": s_data.get("middleName", ""),
                                "gender": s_data.get("gender", "MALE"),
                                "date_of_birth": s_data.get("dateOfBirth", "2012-01-01"),
                                "state_of_origin": s_data.get("stateOfOrigin", "Lagos"),
                                "lga": s_data.get("lga", "Ikeja"),
                                "house": house,
                                "blood_group": s_data.get("bloodGroup", "O+"),
                                "genotype": s_data.get("genotype", "AA"),
                                "parent_name": s_data.get("parentName", ""),
                                "parent_phone": s_data.get("parentPhone", ""),
                                "parent_email": s_data.get("parentEmail", ""),
                                "current_class_arm": arm,
                                "is_boarder": s_data.get("isBoarder", True),
                                "status": "ACTIVE",
                            }
                        )
                        st.registered_subjects.set(all_subjs[:8])

        self.stdout.write(self.style.SUCCESS(f"All essential accounts, classes, arms & 60 students successfully seeded! Total students in DB: {Student.objects.count()}"))


