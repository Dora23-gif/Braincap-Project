# pyright: reportMissingImports=false, reportAttributeAccessIssue=false
"""
Management command: test_api_endpoints
--------------------------------------
Performs an automated Role-Based Access Control (RBAC) security audit and smoke test
across all endpoints under /api/v1/.

Tests:
1. SuperAdmin: Every operational & academic endpoint returns HTTP 200 OK.
2. Parent:
   - CAN view their own ward's dossier and scores (HTTP 200 OK).
   - CANNOT view unrelated student profile (HTTP 403 Forbidden).
   - CANNOT edit scores (HTTP 403 Forbidden).
   - CANNOT access audit logs or master broadsheet (HTTP 403 Forbidden).
3. Teacher:
   - CAN view and enter marksheet scores via bulk-entry (HTTP 200 OK).
   - CANNOT modify institutional School Settings (HTTP 403 Forbidden).
   - CANNOT access Audit Logs (HTTP 403 Forbidden).

Prints a clean summary table of all tested endpoints, roles, and status codes.
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from rest_framework.test import APIClient
from apps.accounts.models import CustomUser
from apps.students.models import Student
from apps.academics.models import AcademicSession, AcademicTerm, ClassArm, Subject
from apps.grading.models import SubjectScore


class Command(BaseCommand):
    help = "Run automated RBAC and endpoint smoke tests across all DRF API endpoints."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Starting API & RBAC Endpoint Smoke Test...\n"))

        client = APIClient()

        # -------------------------------------------------------------------
        # 1. Resolve Seeded Personas
        # -------------------------------------------------------------------
        super_admin = CustomUser.objects.filter(is_superuser=True).first()
        if not super_admin:
            super_admin = CustomUser.objects.filter(active_role="SUPER_ADMIN").first()
        if not super_admin:
            super_admin = CustomUser.objects.create_superuser(
                username="test_superadmin",
                email="superadmin@everest.sch.ng",
                password="Password123!",
                identifier="STF/TEST/001",
                active_role="SUPER_ADMIN",
                roles=["SUPER_ADMIN"],
            )

        # Parent with at least one ward
        parent = CustomUser.objects.filter(active_role="PARENT", wards__isnull=False).first()
        if not parent:
            parent = CustomUser.objects.filter(active_role="PARENT").first()

        # Teacher
        teacher = CustomUser.objects.filter(
            active_role__in=["SUBJECT_TEACHER", "FORM_MASTER", "TEACHER"]
        ).first()

        own_ward = parent.wards.first() if parent else None
        unrelated_student = None
        if parent and own_ward:
            unrelated_student = Student.objects.exclude(id__in=parent.wards.values_list("id", flat=True)).first()

        active_term = AcademicTerm.objects.filter(is_active=True).first() or AcademicTerm.objects.first()
        class_arm = ClassArm.objects.first()
        subject = Subject.objects.first()

        if not (super_admin and parent and teacher and own_ward and unrelated_student and active_term and class_arm):
            self.stdout.write(
                self.style.ERROR("Required test data missing. Please run `python manage.py seed_school_data` first.")
            )
            return

        test_results = []

        def record(endpoint, role, method, expected_code, actual_code, note=""):
            passed = actual_code == expected_code
            status_str = "PASS" if passed else "FAIL"
            test_results.append({
                "endpoint": endpoint,
                "role": role,
                "method": method,
                "expected": expected_code,
                "actual": actual_code,
                "status": status_str,
                "note": note,
            })

        # ===================================================================
        # TEST SUITE 1: SuperAdmin (Full Administrative Access)
        # ===================================================================
        self.stdout.write(self.style.SUCCESS("[1/3] Testing SuperAdmin Full Operational Access..."))
        client.force_authenticate(user=super_admin)

        # Accounts
        res = client.get("/api/v1/accounts/me/")
        record("/api/v1/accounts/me/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.post("/api/v1/accounts/login/", {"identifier": super_admin.username, "password": "Password123!"})
        record("/api/v1/accounts/login/", "PUBLIC", "POST", 200, res.status_code, "Public auth handshake")

        # Academics
        res = client.get("/api/v1/academics/sessions/")
        record("/api/v1/academics/sessions/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.get("/api/v1/academics/terms/")
        record("/api/v1/academics/terms/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.get("/api/v1/academics/class-levels/")
        record("/api/v1/academics/class-levels/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.get("/api/v1/academics/class-arms/")
        record("/api/v1/academics/class-arms/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.get("/api/v1/academics/subjects/")
        record("/api/v1/academics/subjects/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.get("/api/v1/academics/allocations/")
        record("/api/v1/academics/allocations/", "SUPER_ADMIN", "GET", 200, res.status_code)

        # Students
        res = client.get("/api/v1/students/students/")
        record("/api/v1/students/students/", "SUPER_ADMIN", "GET", 200, res.status_code, "Full directory")

        res = client.get(f"/api/v1/students/students/{own_ward.id}/")
        record(f"/api/v1/students/students/{own_ward.id}/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.get(f"/api/v1/students/students/{own_ward.id}/psychomotor/?term={active_term.id}")
        record(f"/api/v1/students/students/id/psychomotor/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.post(
            "/api/v1/students/attendance/bulk/",
            {
                "records": [
                    {
                        "student": own_ward.id,
                        "class_arm": class_arm.id,
                        "date": "2026-03-24",
                        "status": "PRESENT",
                    }
                ]
            },
            format="json",
        )
        record("/api/v1/students/attendance/bulk/", "SUPER_ADMIN", "POST", 200, res.status_code)

        # Grading & Broadsheet
        res = client.get(f"/api/v1/grading/scores/?class_arm={class_arm.id}&term={active_term.id}")
        record("/api/v1/grading/scores/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.post(
            "/api/v1/grading/scores/bulk-entry/",
            {
                "records": [
                    {
                        "student": own_ward.id,
                        "subject": subject.id,
                        "class_arm": class_arm.id,
                        "term": active_term.id,
                        "ca1": 9.0,
                        "ca2": 8.5,
                        "assignment": 9.0,
                        "project": 9.0,
                        "exam": 54.0,
                    }
                ]
            },
            format="json",
        )
        record("/api/v1/grading/scores/bulk-entry/", "SUPER_ADMIN", "POST", 200, res.status_code)

        res = client.get(f"/api/v1/grading/dossier/?student={own_ward.id}&term={active_term.id}")
        record(f"/api/v1/grading/dossier/", "SUPER_ADMIN", "GET", 200, res.status_code, "Terminal report card")

        res = client.get(f"/api/v1/grading/broadsheet/?class_arm={class_arm.id}&term={active_term.id}")
        record("/api/v1/grading/broadsheet/", "SUPER_ADMIN", "GET", 200, res.status_code, "Matrix collation")

        res = client.post(
            "/api/v1/grading/broadsheet/seal/",
            {"class_arm": class_arm.id, "term": active_term.id, "notes": "Smoke test seal"},
            format="json",
        )
        record("/api/v1/grading/broadsheet/seal/", "SUPER_ADMIN", "POST", 200, res.status_code, "Seal collation")

        # Operational Apps
        res = client.get("/api/v1/student-affairs/incidents/")
        record("/api/v1/student-affairs/incidents/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.get("/api/v1/student-affairs/exeats/")
        record("/api/v1/student-affairs/exeats/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.get("/api/v1/timetables/periods/")
        record("/api/v1/timetables/periods/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.get("/api/v1/timetables/exams/")
        record("/api/v1/timetables/exams/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.get("/api/v1/communications/messages/")
        record("/api/v1/communications/messages/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.get("/api/v1/governance/settings/")
        record("/api/v1/governance/settings/", "SUPER_ADMIN", "GET", 200, res.status_code)

        res = client.get("/api/v1/governance/audit-logs/")
        record("/api/v1/governance/audit-logs/", "SUPER_ADMIN", "GET", 200, res.status_code)

        # ===================================================================
        # TEST SUITE 2: Parent Role Boundary & Security Checks
        # ===================================================================
        self.stdout.write(self.style.SUCCESS("\n[2/3] Testing Parent Role Boundary & Security Restrictions..."))
        client.force_authenticate(user=parent)

        # 1. Parent CAN view their own child's report card
        res = client.get(f"/api/v1/grading/dossier/?student={own_ward.id}&term={active_term.id}")
        record(
            f"/api/v1/grading/dossier/ [Own Ward {own_ward.id}]",
            "PARENT",
            "GET",
            200,
            res.status_code,
            "Parent views own child dossier",
        )

        # 2. Parent CANNOT view an unrelated student's report card
        res = client.get(f"/api/v1/grading/dossier/?student={unrelated_student.id}&term={active_term.id}")
        record(
            f"/api/v1/grading/dossier/ [Unrelated Ward {unrelated_student.id}]",
            "PARENT",
            "GET",
            403,
            res.status_code,
            "Blocked viewing unrelated report card",
        )

        # 3. Parent CANNOT view an unrelated student's full profile
        res = client.get(f"/api/v1/students/students/{unrelated_student.id}/")
        record(
            f"/api/v1/students/students/{unrelated_student.id}/ [Unrelated]",
            "PARENT",
            "GET",
            403,
            res.status_code,
            "Blocked viewing unrelated student profile",
        )

        # 4. Parent CANNOT enter/modify marksheet scores
        res = client.post(
            "/api/v1/grading/scores/bulk-entry/",
            {
                "records": [
                    {
                        "student": own_ward.id,
                        "subject": subject.id,
                        "class_arm": class_arm.id,
                        "term": active_term.id,
                        "exam": 100.0,
                    }
                ]
            },
            format="json",
        )
        record(
            "/api/v1/grading/scores/bulk-entry/",
            "PARENT",
            "POST",
            403,
            res.status_code,
            "Parent blocked from modifying scores",
        )

        # 5. Parent CANNOT view class broadsheet collation
        res = client.get(f"/api/v1/grading/broadsheet/?class_arm={class_arm.id}&term={active_term.id}")
        record(
            "/api/v1/grading/broadsheet/",
            "PARENT",
            "GET",
            403,
            res.status_code,
            "Parent blocked from class broadsheet",
        )

        # 6. Parent CANNOT access Audit Logs
        res = client.get("/api/v1/governance/audit-logs/")
        record(
            "/api/v1/governance/audit-logs/",
            "PARENT",
            "GET",
            403,
            res.status_code,
            "Parent blocked from audit logs",
        )

        # ===================================================================
        # TEST SUITE 3: Teacher Role Boundary & Permissions
        # ===================================================================
        self.stdout.write(self.style.SUCCESS("\n[3/3] Testing Teacher Role Permissions & Boundaries..."))
        client.force_authenticate(user=teacher)

        # 1. Teacher CAN view student directory and academic structure
        res = client.get("/api/v1/students/students/")
        record("/api/v1/students/students/", "TEACHER", "GET", 200, res.status_code, "Teacher views student list")

        # 2. Teacher CAN submit continuous assessment & exam scores
        res = client.post(
            "/api/v1/grading/scores/bulk-entry/",
            {
                "records": [
                    {
                        "student": own_ward.id,
                        "subject": subject.id,
                        "class_arm": class_arm.id,
                        "term": active_term.id,
                        "ca1": 8.0,
                        "ca2": 9.0,
                        "assignment": 8.5,
                        "project": 9.0,
                        "exam": 50.0,
                    }
                ]
            },
            format="json",
        )
        record(
            "/api/v1/grading/scores/bulk-entry/",
            "TEACHER",
            "POST",
            200,
            res.status_code,
            "Teacher enters CA & Exam scores",
        )

        # 3. Teacher CANNOT edit institutional School Settings
        res = client.put(
            "/api/v1/governance/settings/current/",
            {"school_motto": "Hacked Motto"},
            format="json",
        )
        record(
            "/api/v1/governance/settings/current/",
            "TEACHER",
            "PUT",
            403,
            res.status_code,
            "Teacher blocked from changing settings",
        )

        # 4. Teacher CANNOT access Audit Logs
        res = client.get("/api/v1/governance/audit-logs/")
        record(
            "/api/v1/governance/audit-logs/",
            "TEACHER",
            "GET",
            403,
            res.status_code,
            "Teacher blocked from system audit logs",
        )

        # 5. Teacher CANNOT seal broadsheets (Exam Officer / Principal only)
        res = client.post(
            "/api/v1/grading/broadsheet/seal/",
            {"class_arm": class_arm.id, "term": active_term.id},
            format="json",
        )
        record(
            "/api/v1/grading/broadsheet/seal/",
            "TEACHER",
            "POST",
            403,
            res.status_code,
            "Teacher blocked from sealing broadsheet",
        )

        # ===================================================================
        # PRINT SUMMARY TABLE
        # ===================================================================
        self.stdout.write("\n" + "=" * 105)
        self.stdout.write(
            f"{'ENDPOINT':<45} {'ROLE':<13} {'METHOD':<7} {'EXP':<5} {'ACT':<5} {'STATUS':<6} {'NOTES'}"
        )
        self.stdout.write("=" * 105)

        passed_count = 0
        failed_count = 0
        for item in test_results:
            is_pass = item["status"] == "PASS"
            if is_pass:
                passed_count += 1
                status_colored = self.style.SUCCESS(f"{item['status']:<6}")
            else:
                failed_count += 1
                status_colored = self.style.ERROR(f"{item['status']:<6}")

            line = (
                f"{item['endpoint']:<45} "
                f"{item['role']:<13} "
                f"{item['method']:<7} "
                f"{item['expected']:<5} "
                f"{item['actual']:<5} "
                f"{status_colored} "
                f"{item['note']}"
            )
            self.stdout.write(line)

        self.stdout.write("=" * 105)
        summary_msg = f"API Smoke Test Complete: {passed_count} PASSED, {failed_count} FAILED out of {len(test_results)} checks."
        if failed_count == 0:
            self.stdout.write(self.style.SUCCESS(f"\nALL CHECKS PASSED! {summary_msg}\n"))
        else:
            self.stdout.write(self.style.ERROR(f"\nSOME CHECKS FAILED: {summary_msg}\n"))
