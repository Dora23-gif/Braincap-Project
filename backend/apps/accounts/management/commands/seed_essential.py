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

        # 2. Principal
        p_user, _ = CustomUser.objects.update_or_create(
            identifier="STF/2026/002",
            defaults={
                "username": "stf_2026_002",
                "email": "principal@everest.com",
                "first_name": "Cordelia",
                "last_name": "Okeke",
                "roles": ["PRINCIPAL"],
                "active_role": "PRINCIPAL",
                "is_staff": True,
                "is_superuser": False,
            }
        )
        p_user.set_password("Password123!")
        p_user.save()

        # 3. Exam Officer
        e_user, _ = CustomUser.objects.update_or_create(
            identifier="STF/2026/003",
            defaults={
                "username": "stf_2026_003",
                "email": "exam@everest.com",
                "first_name": "Samuel",
                "last_name": "Adeyemi",
                "roles": ["EXAM_OFFICER"],
                "active_role": "EXAM_OFFICER",
                "is_staff": True,
                "is_superuser": False,
            }
        )
        e_user.set_password("Password123!")
        e_user.save()

        # 4. Vice Principals
        vp_acad, _ = CustomUser.objects.update_or_create(
            identifier="STF/2026/004",
            defaults={
                "username": "stf_2026_004",
                "email": "vp.academics@everest.com",
                "first_name": "Babatunde",
                "last_name": "Fashola",
                "roles": ["VICE_PRINCIPAL_ACADEMICS"],
                "active_role": "VICE_PRINCIPAL_ACADEMICS",
                "is_staff": True,
            }
        )
        vp_acad.set_password("Password123!")
        vp_acad.save()

        vp_admin, _ = CustomUser.objects.update_or_create(
            identifier="STF/2026/005",
            defaults={
                "username": "stf_2026_005",
                "email": "vp.admin@everest.com",
                "first_name": "Ayodele",
                "last_name": "Ogunlesi",
                "roles": ["VICE_PRINCIPAL_ADMIN"],
                "active_role": "VICE_PRINCIPAL_ADMIN",
                "is_staff": True,
            }
        )
        vp_admin.set_password("Password123!")
        vp_admin.save()

        # 5. Teachers
        teachers = [
            ("Michael", "Okafor", "michael.okafor@everest.com", "STF/2026/006"),
            ("Chioma", "Eze", "chioma.eze@everest.com", "STF/2026/007"),
            ("Ibrahim", "Danjuma", "ibrahim.danjuma@everest.com", "STF/2026/008"),
            ("Ngozi", "Amaechi", "ngozi.amaechi@everest.com", "STF/2026/009"),
            ("Folashade", "Adeleke", "folashade.adeleke@everest.com", "STF/2026/010"),
        ]
        for fn, ln, em, ident in teachers:
            t, _ = CustomUser.objects.update_or_create(
                identifier=ident,
                defaults={
                    "username": ident.replace("/", "_").lower(),
                    "email": em,
                    "first_name": fn,
                    "last_name": ln,
                    "roles": ["TEACHER", "SUBJECT_TEACHER"],
                    "active_role": "SUBJECT_TEACHER",
                }
            )
            t.set_password("Password123!")
            t.save()

        # 6. Parent
        parent, _ = CustomUser.objects.update_or_create(
            identifier="PRT/2026/001",
            defaults={
                "username": "prt_2026_001",
                "email": "parent@everest.com",
                "first_name": "Adeola",
                "last_name": "Balogun",
                "roles": ["PARENT"],
                "active_role": "PARENT",
            }
        )
        parent.set_password("Password123!")
        parent.save()

        # 7. Session & Terms
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

        # 8. Class Levels & Arms
        from apps.academics.models import ClassLevel, ClassArm
        
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
                ClassArm.objects.update_or_create(
                    class_level=lvl,
                    name=arm_name,
                    defaults={"full_name": f"{lvl_name} {arm_name}"}
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


