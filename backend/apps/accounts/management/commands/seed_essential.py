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
            ("JSS 1", "JUNIOR", 1, ["Emerald", "Diamond", "Gold"]),
            ("JSS 2", "JUNIOR", 2, ["Emerald", "Diamond", "Gold"]),
            ("JSS 3", "JUNIOR", 3, ["Emerald", "Diamond", "Gold"]),
            ("SSS 1", "SENIOR", 4, ["Science Emerald", "Science Diamond", "Commercial Gold", "Arts Platinum"]),
            ("SSS 2", "SENIOR", 5, ["Science Emerald", "Science Diamond", "Commercial Gold", "Arts Platinum"]),
            ("SSS 3", "SENIOR", 6, ["Science Emerald", "Science Diamond", "Commercial Gold", "Arts Platinum"]),
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

        self.stdout.write(self.style.SUCCESS("All essential accounts, classes, arms & academic data successfully seeded!"))

