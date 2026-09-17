# pyright: reportMissingImports=false, reportAttributeAccessIssue=false
# type: ignore

from django.db import models, transaction
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from apps.academics.models import ClassArm, Subject
from .models import Student, DroppedSubjectRecord, DailyAttendance, AffectivePsychomotor
from apps.accounts.services import generate_parent_invitation, get_or_create_parent_user
from apps.accounts.permissions import user_has_any_role, ParentAccessOnly
from .serializers import (
    StudentListSerializer, StudentDetailSerializer,
    DroppedSubjectRecordSerializer,
    DailyAttendanceSerializer, BulkAttendanceSerializer,
    AffectivePsychomotorSerializer,
)


# ---------------------------------------------------------------------------
# Student ViewSet
# ---------------------------------------------------------------------------
class StudentViewSet(viewsets.ModelViewSet):
    """
    CRUD for student records.
    Supports the Student Directory (list) and Admissions Wizard (create/update).
    """
    queryset = Student.objects.select_related(
        "current_class_arm__class_level", "parent",
    ).prefetch_related("registered_subjects", "dropped_subjects__subject").all()

    permission_classes = [permissions.IsAuthenticated, ParentAccessOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        "status", "gender", "house", "is_boarder",
        "current_class_arm__class_level",
        "current_class_arm__class_level__section",
        "registered_subjects__code",
    ]
    search_fields = [
        "admission_number", "first_name", "last_name", "middle_name",
        "parent_name", "parent_phone",
    ]
    ordering_fields = ["last_name", "first_name", "admission_number", "date_of_birth"]
    ordering = ["current_class_arm", "last_name", "first_name"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        # Parents only see their own wards in directory
        if user_has_any_role(user, ["PARENT"]) and not (user.is_staff or user.is_superuser):
            ward_ids = set(user.wards.values_list("id", flat=True))
            parent_filter = models.Q(parent=user) | models.Q(id__in=ward_ids)
            if user.email:
                parent_filter |= models.Q(parent_email__iexact=user.email.strip())
            return qs.filter(parent_filter)

        # Flexible class arm filtering (supports PK, slug, or name)
        arm_param = self.request.query_params.get("class_arm") or self.request.query_params.get("current_class_arm")
        if arm_param:
            arm_str = str(arm_param).strip()
            if arm_str.isdigit():
                qs = qs.filter(current_class_arm_id=int(arm_str))
            elif arm_str.startswith("arm-"):
                clean = arm_str.replace("arm-", "").lower()
                matched_ca = None
                for ca in ClassArm.objects.select_related("class_level").all():
                    lvl_c = ca.class_level.name.lower().replace(" ", "")
                    arm_c = ca.name.lower()
                    if f"{lvl_c}-{arm_c}" == clean or f"{lvl_c}{arm_c}" == clean or (lvl_c in clean and arm_c in clean):
                        matched_ca = ca
                        break
                if matched_ca:
                    qs = qs.filter(current_class_arm=matched_ca)
            else:
                qs = qs.filter(models.Q(current_class_arm__full_name__iexact=arm_str) | models.Q(current_class_arm__name__iexact=arm_str))

        # Flexible subject filtering (supports PK, slug, or code)
        subj_param = self.request.query_params.get("subject") or self.request.query_params.get("registered_subjects")
        if subj_param:
            subj_str = str(subj_param).strip()
            if subj_str.isdigit():
                qs = qs.filter(registered_subjects__id=int(subj_str))
            else:
                clean_code = subj_str.upper().replace("SUBJ-", "")
                qs = qs.filter(registered_subjects__code__iexact=clean_code)

        return qs.distinct()

    def get_serializer_class(self):
        if self.action == "list":
            return StudentListSerializer
        return StudentDetailSerializer

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        val = str(self.kwargs.get(lookup_url_kwarg, "")).strip()

        # 1. Direct integer PK
        if val.isdigit():
            obj = queryset.filter(pk=int(val)).first()
            if obj:
                self.check_object_permissions(self.request, obj)
                return obj

        # 2. Admission number match (e.g. EIS/2026/0009 or EIS-2026-0009)
        obj = queryset.filter(
            models.Q(admission_number__iexact=val)
            | models.Q(admission_number__iexact=val.replace("-", "/"))
        ).first()
        if obj:
            self.check_object_permissions(self.request, obj)
            return obj

        # 3. Canonical ID format std-XXX or std_XXX
        if val.startswith("std-") or val.startswith("std_"):
            clean_num = val.replace("std-", "").replace("std_", "").lstrip("0")
            if clean_num.isdigit():
                num = int(clean_num)
                matched = (
                    queryset.filter(admission_number__iendswith=f"/{num:04d}").first()
                    or queryset.filter(admission_number__iendswith=f"/{num:03d}").first()
                    or queryset.filter(admission_number__iendswith=f"/{num:02d}").first()
                    or queryset.filter(admission_number__iendswith=f"/{num}").first()
                    or queryset.filter(pk=num).first()
                )
                if matched:
                    self.check_object_permissions(self.request, matched)
                    return matched

        return super().get_object()

    def retrieve(self, request, *args, **kwargs):
        user = request.user
        if user_has_any_role(user, ["PARENT"]) and not (user.is_staff or user.is_superuser):
            ward_ids = set(user.wards.values_list("id", flat=True))
            pk = kwargs.get("pk")
            if pk is not None and str(pk).isdigit():
                pk = int(pk)
            if pk not in ward_ids and not Student.objects.filter(pk=pk, parent=user).exists():
                return Response(
                    {"detail": "You do not have permission to view this student profile."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        user = request.user
        is_admin = (
            user.is_superuser
            or user.is_staff
            or user_has_any_role(
                user,
                [
                    "SUPER_ADMIN",
                    "PRINCIPAL",
                    "VICE_PRINCIPAL",
                    "VICE_PRINCIPAL_ADMIN",
                    "VICE_PRINCIPAL_ACADEMICS",
                    "ADMISSIONS_OFFICER",
                ],
            )
        )
        if not is_admin:
            return Response(
                {"detail": "Only Administrative Staff and Admissions Officers can register students."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()

        # Connect or create parent user if parent_email is present
        parent_email = request.data.get("parent_email", "")
        if parent_email and isinstance(parent_email, str) and parent_email.strip() and not student.parent:
            parent_name = str(request.data.get("parent_name", "")).strip()
            parent_phone = str(request.data.get("parent_phone", "")).strip()
            parent_user = get_or_create_parent_user(parent_email.strip(), parent_name, parent_phone)
            if parent_user:
                student.parent = parent_user
                student.save(update_fields=["parent"])

        headers = self.get_success_headers(serializer.data)
        return Response(StudentDetailSerializer(student).data, status=status.HTTP_201_CREATED, headers=headers)

    # ---- Custom actions ---------------------------------------------------
    @action(detail=True, methods=["post"], url_path="drop-subject")
    def drop_subject(self, request, pk=None):
        """POST /students/{id}/drop-subject/ — record a dropped subject."""
        if not user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ADMIN",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_STUDENT_AFFAIRS",
                "ADMISSIONS_OFFICER",
                "FORM_MASTER",
                "EXAM_OFFICER",
            ],
        ):
            return Response(
                {"detail": "Permission denied to drop subjects."},
                status=status.HTTP_403_FORBIDDEN,
            )
        student = self.get_object()
        subj_raw = request.data.get("subject") or request.data.get("subject_id")
        subject = None
        if isinstance(subj_raw, int) or (isinstance(subj_raw, str) and str(subj_raw).isdigit()):
            subject = Subject.objects.filter(pk=int(subj_raw)).first()
        elif subj_raw:
            clean_code = str(subj_raw).strip().upper().replace("SUBJ-", "")
            subject = Subject.objects.filter(code__iexact=clean_code).first()

        if not subject:
            return Response(
                {"detail": f"Subject '{subj_raw}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        level = request.data.get("level") or ("SSS 3" if "SSS 3" in (student.current_class_arm.full_name or "") else "SSS 2")
        reason = request.data.get("reason", f"Subject dropped upon transition to {level}")

        from apps.academics.models import AcademicSession
        session_id = request.data.get("academic_session")
        session = None
        if session_id and str(session_id).isdigit():
            session = AcademicSession.objects.filter(pk=int(session_id)).first()
        if not session:
            session = AcademicSession.objects.filter(is_current=True).first() or AcademicSession.objects.first()

        dropped_rec, _ = DroppedSubjectRecord.objects.update_or_create(
            student=student,
            subject=subject,
            defaults={
                "level": level,
                "reason": reason,
                "academic_session": session,
            }
        )
        student.registered_subjects.remove(subject)
        serializer = DroppedSubjectRecordSerializer(dropped_rec)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="restore-subject")
    def restore_subject(self, request, pk=None):
        """POST /students/{id}/restore-subject/ — undo a dropped subject."""
        if not user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ADMIN",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_STUDENT_AFFAIRS",
                "ADMISSIONS_OFFICER",
                "FORM_MASTER",
                "EXAM_OFFICER",
            ],
        ):
            return Response(
                {"detail": "Permission denied to restore subjects."},
                status=status.HTTP_403_FORBIDDEN,
            )
        student = self.get_object()
        subj_raw = request.data.get("subject_id") or request.data.get("subject")
        subject = None
        if isinstance(subj_raw, int) or (isinstance(subj_raw, str) and str(subj_raw).isdigit()):
            subject = Subject.objects.filter(pk=int(subj_raw)).first()
        elif subj_raw:
            clean_code = str(subj_raw).strip().upper().replace("SUBJ-", "")
            subject = Subject.objects.filter(code__iexact=clean_code).first()

        if subject:
            DroppedSubjectRecord.objects.filter(student=student, subject=subject).delete()
            student.registered_subjects.add(subject)
        return Response({"detail": "Subject restored."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="set-subjects")
    def set_subjects(self, request, pk=None):
        """
        POST /students/{id}/set-subjects/
        Atomically replace a student's registered subjects.

        Body: { "subject_ids": [59, 60, 61, ...] }   (integer PKs)
          or: { "subject_codes": ["ENG", "MTH", ...] }  (string codes)
          or: both — subject_ids takes precedence.

        Returns the updated student detail.
        """
        if not user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ADMIN",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_STUDENT_AFFAIRS",
                "ADMISSIONS_OFFICER",
                "FORM_MASTER",
                "EXAM_OFFICER",
            ],
        ):
            return Response(
                {"detail": "Permission denied to update subject registrations."},
                status=status.HTTP_403_FORBIDDEN,
            )

        student = self.get_object()
        subject_ids = request.data.get("subject_ids", [])
        subject_codes = request.data.get("subject_codes", [])

        resolved_subjects = []

        if subject_ids:
            resolved_subjects = list(Subject.objects.filter(id__in=subject_ids))
        elif subject_codes:
            clean_codes = [str(c).strip().upper().replace("SUBJ-", "") for c in subject_codes]
            resolved_subjects = list(Subject.objects.filter(code__in=clean_codes))

        if not resolved_subjects and not subject_ids and not subject_codes:
            return Response(
                {"detail": "Provide subject_ids (list of PKs) or subject_codes (list of codes)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            student.registered_subjects.set(resolved_subjects)

        serializer = StudentDetailSerializer(student)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "put", "patch"], url_path="psychomotor")
    def psychomotor(self, request, pk=None):
        """GET/PUT /students/{id}/psychomotor/?term=<id> — affective & psychomotor record."""
        student = self.get_object()
        user = request.user

        if request.method == "GET":
            if user_has_any_role(user, ["PARENT"]) and not (user.is_staff or user.is_superuser):
                ward_ids = set(user.wards.values_list("id", flat=True))
                if student.id not in ward_ids and student.parent_id != user.id:
                    return Response(
                        {"detail": "You do not have permission to view this record."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
        else:
            if not user_has_any_role(
                user,
                [
                    "SUPER_ADMIN",
                    "PRINCIPAL",
                    "VICE_PRINCIPAL",
                    "VICE_PRINCIPAL_ACADEMICS",
                    "VICE_PRINCIPAL_ADMIN",
                    "FORM_MASTER",
                ],
            ):
                return Response(
                    {"detail": "Only Form Masters and Administrators can enter psychomotor evaluations."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        term_id = request.query_params.get("term") or request.data.get("term")
        if not term_id:
            return Response({"detail": "term param required."}, status=status.HTTP_400_BAD_REQUEST)
        record, _ = AffectivePsychomotor.objects.get_or_create(
            student=student, term_id=term_id
        )
        if request.method == "GET":
            return Response(AffectivePsychomotorSerializer(record).data)
        serializer = AffectivePsychomotorSerializer(record, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="send-invite")
    def send_invite(self, request, pk=None):
        """
        POST /api/v1/students/{id}/send-invite/
        Triggered when SuperAdmin or Admissions Officer clicks 'Send Invite' in the UI.
        Dispatches the invitation link to the parent's email.
        """
        if not user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ADMIN",
                "VICE_PRINCIPAL_ACADEMICS",
                "ADMISSIONS_OFFICER",
            ],
        ):
            return Response(
                {"detail": "Permission denied. Only administrators can dispatch parent invitations."},
                status=status.HTTP_403_FORBIDDEN,
            )

        student = self.get_object()
        if not student.parent_email:
            return Response(
                {"detail": "This student does not have a parent email recorded."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parent_user = student.parent
        if not parent_user:
            parent_user = get_or_create_parent_user(
                email=student.parent_email,
                name=student.parent_name,
                phone=student.parent_phone,
                student=student,
            )
            student.parent = parent_user
            student.save(update_fields=["parent"])
        else:
            generate_parent_invitation(parent_user, student=student)

        return Response(
            {
                "detail": f"Invitation link successfully sent to {student.parent_email}.",
                "parent_email": student.parent_email,
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Daily Attendance ViewSet
# ---------------------------------------------------------------------------
class DailyAttendanceViewSet(viewsets.ModelViewSet):
    """
    Per-day attendance records. Powers the AttendanceRegisterView.
    """
    queryset = DailyAttendance.objects.select_related(
        "student", "class_arm",
    ).all()

    serializer_class = DailyAttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["student", "class_arm", "date", "status"]
    search_fields = ["student__admission_number", "student__last_name"]
    ordering = ["-date", "student__last_name"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user and user.is_authenticated:
            if user_has_any_role(user, ["PARENT"]) and not (user.is_staff or user.is_superuser):
                return qs.filter(student__in=user.wards.all())
        return qs

    @action(detail=False, methods=["post"], url_path="bulk")
    @transaction.atomic
    def bulk_create_or_update(self, request):
        """
        POST /attendance/bulk/
        Accepts an array of {student, class_arm, date, status} objects.
        Uses update_or_create so re-submitting is idempotent.
        Powers the daily register save button.
        """
        if not user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ADMIN",
                "VICE_PRINCIPAL_ACADEMICS",
                "FORM_MASTER",
            ],
        ):
            return Response(
                {"detail": "Only Form Masters and Administrators can record roll call attendance."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = BulkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = []
        from apps.academics.models import ClassArm
        for item in serializer.validated_data["records"]:
            raw_student = str(item["student"]).strip()
            student_obj = None
            if raw_student.isdigit():
                student_obj = Student.objects.filter(pk=int(raw_student)).first()
            if not student_obj:
                student_obj = Student.objects.filter(admission_number__iexact=raw_student).first()
            if not student_obj and raw_student.startswith("std-"):
                try:
                    num = int(raw_student.replace("std-", ""))
                    adm = f"EIS/2026/{num:04d}"
                    student_obj = Student.objects.filter(admission_number__iexact=adm).first()
                    if not student_obj:
                        adm_legacy = f"EIS/2026/{num + 100:04d}"
                        student_obj = Student.objects.filter(admission_number__iexact=adm_legacy).first()
                except Exception:
                    pass
            if not student_obj:
                continue

            raw_arm = str(item.get("class_arm", "")).strip()
            arm_obj = None
            if raw_arm.isdigit():
                arm_obj = ClassArm.objects.filter(pk=int(raw_arm)).first()
            if not arm_obj and raw_arm:
                clean_arm = raw_arm.lower().replace("arm-", "")
                for ca in ClassArm.objects.select_related("class_level").all():
                    lvl_c = ca.class_level.name.lower().replace(" ", "")
                    arm_c = ca.name.lower()
                    if f"{lvl_c}-{arm_c}" == clean_arm or f"{lvl_c}{arm_c}" == clean_arm:
                        arm_obj = ca
                        break
            if not arm_obj:
                arm_obj = student_obj.current_class_arm

            obj, created = DailyAttendance.objects.update_or_create(
                student=student_obj,
                date=item["date"],
                defaults={
                    "class_arm": arm_obj,
                    "status": item["status"],
                },
            )
            results.append(DailyAttendanceSerializer(obj).data)
        return Response(results, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Affective & Psychomotor ViewSet
# ---------------------------------------------------------------------------
class AffectivePsychomotorViewSet(viewsets.ModelViewSet):
    """Standalone CRUD for the Psychomotor Rating view."""
    queryset = AffectivePsychomotor.objects.select_related("student", "term").all()
    serializer_class = AffectivePsychomotorSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "term", "term__session"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user and user.is_authenticated:
            if user_has_any_role(user, ["PARENT"]) and not (user.is_staff or user.is_superuser):
                return qs.filter(student__in=user.wards.all())
        return qs

    def create(self, request, *args, **kwargs):
        if not user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_ADMIN",
                "FORM_MASTER",
            ],
        ):
            return Response(
                {"detail": "Only Form Masters and Administrators can enter psychomotor evaluations."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_ADMIN",
                "FORM_MASTER",
            ],
        ):
            return Response(
                {"detail": "Only Form Masters and Administrators can update psychomotor evaluations."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)


# ---------------------------------------------------------------------------
# Dropped Subject ViewSet
# ---------------------------------------------------------------------------
class DroppedSubjectViewSet(viewsets.ModelViewSet):
    """Standalone CRUD for dropped-subject records."""
    queryset = DroppedSubjectRecord.objects.select_related(
        "student", "subject", "academic_session",
    ).all()
    serializer_class = DroppedSubjectRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "subject", "level", "academic_session"]
