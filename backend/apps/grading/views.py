# pyright: reportMissingImports=false, reportAttributeAccessIssue=false
# type: ignore

from decimal import Decimal
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from apps.students.models import Student, AffectivePsychomotor
from apps.academics.models import AcademicTerm, AcademicSession, ClassArm, Subject
from apps.accounts.permissions import user_has_any_role, IsTeacherOrAdmin, IsPrincipalOrAdmin, IsExamOfficerOrPrincipal
from .models import SubjectScore, SubjectMarksheetSubmission, BroadsheetSeal
from .serializers import (
    SubjectScoreSerializer,
    BulkScoreSerializer,
    ScoreOverrideSerializer,
    SubjectMarksheetSubmissionSerializer,
    BroadsheetSealSerializer,
)


# ---------------------------------------------------------------------------
# SubjectScore ViewSet
# ---------------------------------------------------------------------------
class SubjectScoreViewSet(viewsets.ModelViewSet):
    queryset = SubjectScore.objects.select_related(
        "student", "class_arm", "subject", "term", "overridden_by"
    ).all()
    serializer_class  = SubjectScoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends   = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields  = ["student", "class_arm", "subject", "term", "is_locked", "grade"]
    search_fields     = [
        "student__admission_number",
        "student__last_name",
        "subject__name",
        "subject__code",
    ]
    ordering_fields = ["total", "grade", "updated_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user and user.is_authenticated:
            # Parents only see scores for their own registered wards
            if user_has_any_role(user, ["PARENT"]) and not (user.is_staff or user.is_superuser):
                return qs.filter(student__in=user.wards.all())
        return qs

    # ---- Bulk score upsert (Score Entry Grid) ----------------------------
    @action(detail=False, methods=["post"], url_path="bulk")
    @transaction.atomic
    def bulk_upsert(self, request):
        """
        POST /scores/bulk/ or /scores/bulk-entry/
        Accepts a list of score objects. Uses update_or_create so re-saving
        the score grid is idempotent. Auto-calculation runs inside save().
        """
        if not user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_ADMIN",
                "EXAM_OFFICER",
                "FORM_MASTER",
                "SUBJECT_TEACHER",
                "TEACHER",
            ],
        ):
            return Response(
                {"detail": "Only Teachers and Administrators can enter or modify scores."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = BulkScoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = []
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

            raw_subject = str(item["subject"]).strip()
            subject_obj = None
            if raw_subject.isdigit():
                subject_obj = Subject.objects.filter(pk=int(raw_subject)).first()
            if not subject_obj:
                clean_code = raw_subject.upper().replace("SUBJ-", "")
                subject_obj = Subject.objects.filter(code__iexact=clean_code).first()
            if not subject_obj:
                subject_obj = Subject.objects.first()

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

            raw_term = str(item.get("term", "2")).strip()
            term_obj = None
            if raw_term.isdigit():
                term_obj = AcademicTerm.objects.filter(pk=int(raw_term)).first()
            if not term_obj:
                clean_term = raw_term.lower()
                if "1" in clean_term:
                    term_obj = AcademicTerm.objects.filter(name__icontains="1").first()
                elif "3" in clean_term:
                    term_obj = AcademicTerm.objects.filter(name__icontains="3").first()
                else:
                    term_obj = AcademicTerm.objects.filter(name__icontains="2").first()
            if not term_obj:
                term_obj = AcademicTerm.objects.filter(is_active=True).first() or AcademicTerm.objects.first()

            obj, _ = SubjectScore.objects.update_or_create(
                student     = student_obj,
                subject     = subject_obj,
                term        = term_obj,
                defaults={
                    "class_arm":     arm_obj,
                    "ca1":           item.get("ca1", Decimal("0")),
                    "ca2":           item.get("ca2", Decimal("0")),
                    "assignment":    item.get("assignment", Decimal("0")),
                    "project":       item.get("project", Decimal("0")),
                    "exam":          item.get("exam", Decimal("0")),
                    "teacher_remark": item.get("teacher_remark", ""),
                },
            )
            results.append(SubjectScoreSerializer(obj).data)
        return Response(results, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="bulk-entry")
    def bulk_entry(self, request):
        """POST /api/v1/grading/scores/bulk-entry/ — Alias for bulk_upsert."""
        return self.bulk_upsert(request)

    # ---- Admin score override (ScoreOverrideModal) -----------------------
    @action(detail=True, methods=["post"], url_path="override")
    def override_score(self, request, pk=None):
        """
        POST /scores/{id}/override/
        Snapshots the previous values, then applies the overridden scores.
        Re-triggers save() so grade/total auto-recalculate.
        """
        if not user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_ADMIN",
                "EXAM_OFFICER",
            ],
        ):
            return Response(
                {"detail": "Administrative privileges required to override scores."},
                status=status.HTTP_403_FORBIDDEN,
            )

        score = self.get_object()
        if score.is_locked:
            return Response(
                {"detail": "Score is locked. Unlock before overriding."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = ScoreOverrideSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Snapshot current values before overriding
        score.previous_score = {
            "ca1": str(score.ca1), "ca2": str(score.ca2),
            "assignment": str(score.assignment), "project": str(score.project),
            "exam": str(score.exam), "total": str(score.total),
            "grade": score.grade,
        }
        # Apply overrides for any supplied fields
        for field in ("ca1", "ca2", "assignment", "project", "exam"):
            if field in data:
                setattr(score, field, data[field])

        score.is_overridden      = True
        score.override_reason    = data["override_reason"]
        score.override_ticket_id = data.get("override_ticket_id", "")
        score.overridden_by      = request.user
        score.overridden_at      = timezone.now()
        score.save()   # triggers auto-calculation
        return Response(SubjectScoreSerializer(score).data)

    # ---- Lock / Unlock toggle -------------------------------------------
    @action(detail=True, methods=["post"], url_path="toggle-lock")
    def toggle_lock(self, request, pk=None):
        """POST /scores/{id}/toggle-lock/ — flip the is_locked flag."""
        if not user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_ADMIN",
                "EXAM_OFFICER",
            ],
        ):
            return Response(
                {"detail": "Administrative privileges required to toggle score lock."},
                status=status.HTTP_403_FORBIDDEN,
            )
        score = self.get_object()
        score.is_locked = not score.is_locked
        score.save(update_fields=["is_locked", "updated_at"])
        return Response({"is_locked": score.is_locked})

    # ---- Bulk lock by class arm + term ----------------------------------
    @action(detail=False, methods=["post"], url_path="bulk-lock")
    def bulk_lock(self, request):
        """
        POST /scores/bulk-lock/
        Body: {class_arm: id, term: id, lock: true|false}
        Locks or unlocks all scores for a class arm in a term.
        """
        if not user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_ADMIN",
                "EXAM_OFFICER",
            ],
        ):
            return Response(
                {"detail": "Administrative privileges required to lock scores in bulk."},
                status=status.HTTP_403_FORBIDDEN,
            )
        raw_arm = str(request.data.get("class_arm", "")).strip()
        raw_term = str(request.data.get("term", "")).strip()
        raw_subject = str(request.data.get("subject", "")).strip()
        lock = request.data.get("lock", True)
        if isinstance(lock, str):
            lock = lock.lower() in ("true", "1", "yes")

        filter_kwargs = {}

        # Resolve ClassArm
        if raw_arm.isdigit():
            filter_kwargs["class_arm_id"] = int(raw_arm)
        elif raw_arm:
            clean_arm = raw_arm.lower().replace("arm-", "")
            for ca in ClassArm.objects.select_related("class_level").all():
                lvl_c = ca.class_level.name.lower().replace(" ", "")
                arm_c = ca.name.lower()
                if f"{lvl_c}-{arm_c}" == clean_arm or f"{lvl_c}{arm_c}" == clean_arm or ca.name.lower() == clean_arm:
                    filter_kwargs["class_arm_id"] = ca.id
                    break

        # Resolve Term
        if raw_term.isdigit():
            filter_kwargs["term_id"] = int(raw_term)
        elif raw_term:
            clean_term = raw_term.lower()
            if "1" in clean_term:
                t = AcademicTerm.objects.filter(name__icontains="1").first()
            elif "3" in clean_term:
                t = AcademicTerm.objects.filter(name__icontains="3").first()
            else:
                t = AcademicTerm.objects.filter(name__icontains="2").first()
            if t:
                filter_kwargs["term_id"] = t.id
        if "term_id" not in filter_kwargs:
            active_t = AcademicTerm.objects.filter(is_active=True).first()
            if active_t:
                filter_kwargs["term_id"] = active_t.id

        # Optional Subject
        if raw_subject:
            if raw_subject.isdigit():
                filter_kwargs["subject_id"] = int(raw_subject)
            else:
                clean_subj = raw_subject.upper().replace("SUBJ-", "")
                s_obj = Subject.objects.filter(code__iexact=clean_subj).first()
                if s_obj:
                    filter_kwargs["subject_id"] = s_obj.id

        if not filter_kwargs.get("class_arm_id") or not filter_kwargs.get("term_id"):
            return Response(
                {"detail": "class_arm and term are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        count = SubjectScore.objects.filter(**filter_kwargs).update(is_locked=lock)
        return Response({"updated": count, "is_locked": lock})


# ---------------------------------------------------------------------------
# Terminal Dossier Engine (PrintableReportCard)
# ---------------------------------------------------------------------------
class TerminalDossierView(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        return self.dossier(request)

    @action(detail=False, methods=["get"], url_path="dossier")
    def dossier(self, request):
        """
        GET /grading/dossier/?student=<id>&term=<id>

        Returns the full terminal dossier for a student:
        - All subject scores with grade and remark
        - Aggregate total, percentage average
        - Arm position and total in arm
        - Affective & psychomotor record
        - AcademicTerm + AcademicSession metadata
        """
        student_id = request.query_params.get("student")
        term_id    = request.query_params.get("term")
        if not student_id or not term_id:
            return Response(
                {"detail": "student and term query params are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parent permission boundary check: Parents cannot view other students' report cards
        if user_has_any_role(request.user, ["PARENT"]) and not (request.user.is_staff or request.user.is_superuser):
            ward_ids = set(request.user.wards.values_list("id", flat=True))
            std_pk = int(student_id) if str(student_id).isdigit() else student_id
            if std_pk not in ward_ids and not Student.objects.filter(pk=std_pk, parent=request.user).exists():
                return Response(
                    {"detail": "You do not have permission to view this student's report card."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        student = get_object_or_404(Student.objects.select_related("current_class_arm__class_level"), pk=student_id)
        term    = get_object_or_404(AcademicTerm.objects.select_related("session"), pk=term_id)

        # Scores for this student in this term
        scores = SubjectScore.objects.filter(
            student_id=student_id, term_id=term_id
        ).select_related("subject")

        # Aggregate stats
        total_aggregate = sum(s.total for s in scores)
        max_possible    = len(scores) * 100
        pct_average     = round(float(total_aggregate) / max(len(scores), 1), 1)

        # Arm position — rank student by total aggregate within same class arm + term
        arm_scores = (
            SubjectScore.objects
            .filter(class_arm=student.current_class_arm, term_id=term_id)
            .values("student_id")
        )
        from django.db.models import Sum
        arm_aggregates = (
            SubjectScore.objects
            .filter(class_arm=student.current_class_arm, term_id=term_id)
            .values("student_id")
            .annotate(agg=Sum("total"))
            .order_by("-agg")
        )
        student_ids_ranked = [row["student_id"] for row in arm_aggregates]
        arm_position  = student_ids_ranked.index(int(student_id)) + 1 if int(student_id) in student_ids_ranked else 0
        total_in_arm  = len(student_ids_ranked)

        # Psychomotor record (may not exist yet)
        try:
            psych = AffectivePsychomotor.objects.get(student_id=student_id, term_id=term_id)
            psych_data = {
                "punctuality":           psych.punctuality,
                "neatness":              psych.neatness,
                "politeness":            psych.politeness,
                "attentiveness":         psych.attentiveness,
                "honesty":               psych.honesty,
                "relationship_with_peers": psych.relationship_with_peers,
                "handwriting":           psych.handwriting,
                "sports_and_games":      psych.sports_and_games,
                "craftsmanship":         psych.craftsmanship,
                "musical_artistic_skill": psych.musical_artistic_skill,
                "form_master_remark":    psych.form_master_remark,
                "principal_remark":      psych.principal_remark,
                "days_present":          psych.days_present,
                "days_absent":           psych.days_absent,
                "total_school_days":     psych.total_school_days,
            }
        except AffectivePsychomotor.DoesNotExist:
            psych_data = {}

        scores_data = SubjectScoreSerializer(scores, many=True).data

        return Response({
            "student": {
                "id":                  student.id,
                "admission_number":    student.admission_number,
                "full_name":           student.full_name,
                "current_class_arm_id": student.current_class_arm_id,
                "current_class_arm_name": student.current_class_arm.full_name,
            },
            "term": {
                "id":   term.id,
                "name": term.name,
                "session": {
                    "id":   term.session.id,
                    "name": term.session.name,
                },
            },
            "scores":                scores_data,
            "total_aggregate_score": float(total_aggregate),
            "max_possible_aggregate": max_possible,
            "percentage_average":    pct_average,
            "arm_position":          arm_position,
            "total_in_arm":          total_in_arm,
            "affective_and_psychomotor": psych_data,
        })


# ---------------------------------------------------------------------------
# SubjectMarksheetSubmission ViewSet
# ---------------------------------------------------------------------------
class SubjectMarksheetSubmissionViewSet(viewsets.ModelViewSet):
    queryset = SubjectMarksheetSubmission.objects.select_related(
        "class_arm", "subject", "term", "teacher"
    ).all()
    serializer_class   = SubjectMarksheetSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["class_arm", "subject", "term", "teacher", "status"]
    search_fields      = ["class_arm__full_name", "subject__name", "teacher__last_name"]

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        """POST /marksheets/{id}/submit/ — teacher submits for moderation."""
        ms = self.get_object()
        if ms.status != "IN_PROGRESS":
            return Response(
                {"detail": "Marksheet is already submitted or moderated."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Recalculate class average from live scores
        scores = SubjectScore.objects.filter(
            class_arm=ms.class_arm, subject=ms.subject, term=ms.term
        )
        count = scores.count()
        if count:
            from django.db.models import Avg
            avg = scores.aggregate(avg=Avg("total"))["avg"] or Decimal("0")
            ms.class_average = round(avg, 1)
            ms.graded_students_count = scores.exclude(total=0).count()
            ms.total_students_count  = count
        ms.status       = "SUBMITTED"
        ms.submitted_at = timezone.now()
        ms.submission_comments = request.data.get("submission_comments", ms.submission_comments)
        ms.save()
        return Response(SubjectMarksheetSubmissionSerializer(ms).data)

    @action(detail=True, methods=["post"], url_path="moderate")
    def moderate(self, request, pk=None):
        """POST /marksheets/{id}/moderate/ — Exam Officer marks as moderated."""
        ms = self.get_object()
        ms.status = "MODERATED"
        ms.save(update_fields=["status"])
        return Response(SubjectMarksheetSubmissionSerializer(ms).data)


# ---------------------------------------------------------------------------
# BroadsheetSeal ViewSet
# ---------------------------------------------------------------------------
class BroadsheetSealViewSet(viewsets.ModelViewSet):
    queryset = BroadsheetSeal.objects.select_related(
        "class_arm", "term", "sealed_by"
    ).all()
    serializer_class   = BroadsheetSealSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ["class_arm", "term", "is_sealed"]

    @action(detail=True, methods=["post"], url_path="seal")
    def seal(self, request, pk=None):
        """POST /broadsheet-seals/{id}/seal/ — Exam Officer seals the broadsheet."""
        seal = self.get_object()
        if seal.is_sealed:
            return Response(
                {"detail": "Broadsheet is already sealed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Count missing marks (scores still at 0 total)
        missing = SubjectScore.objects.filter(
            class_arm=seal.class_arm, term=seal.term, total=Decimal("0")
        ).count()
        seal.missing_marks_count = missing
        seal.is_sealed       = True
        seal.sealed_at       = timezone.now()
        seal.sealed_by       = request.user
        seal.submission_notes = request.data.get("submission_notes", "")
        seal.save()
        return Response(BroadsheetSealSerializer(seal).data)

    @action(detail=True, methods=["post"], url_path="unseal")
    def unseal(self, request, pk=None):
        """POST /broadsheet-seals/{id}/unseal/ — Super admin breaks a seal."""
        seal = self.get_object()
        seal.is_sealed = False
        seal.sealed_at = None
        seal.sealed_by = None
        seal.save()
        return Response(BroadsheetSealSerializer(seal).data)


# ---------------------------------------------------------------------------
# Broadsheet ViewSet (Matrix Collation & Sealing)
# ---------------------------------------------------------------------------
class BroadsheetViewSet(viewsets.ViewSet):
    """
    Master Broadsheet matrix collation and sealing.
    - GET  /api/v1/grading/broadsheet/?class_arm={id}&term={id}
    - POST /api/v1/grading/broadsheet/seal/
    """
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """GET /api/v1/grading/broadsheet/?class_arm={id}&term={id}"""
        if user_has_any_role(request.user, ["PARENT"]) and not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"detail": "Parents do not have permission to view class broadsheets."},
                status=status.HTTP_403_FORBIDDEN,
            )

        class_arm_id = request.query_params.get("class_arm")
        term_id = request.query_params.get("term")

        # If parameters not provided, return available arms and active term for discovery
        if not class_arm_id or not term_id:
            active_term = AcademicTerm.objects.filter(is_active=True).first() or AcademicTerm.objects.first()
            first_arm = ClassArm.objects.first()
            if not class_arm_id and first_arm:
                class_arm_id = first_arm.id
            if not term_id and active_term:
                term_id = active_term.id

        class_arm = get_object_or_404(ClassArm.objects.select_related("class_level"), pk=class_arm_id)
        term = get_object_or_404(AcademicTerm.objects.select_related("session"), pk=term_id)

        # Get all students in this arm
        students = Student.objects.filter(current_class_arm=class_arm).order_by("last_name", "first_name")

        # Get all scores for this arm and term
        scores = SubjectScore.objects.filter(
            class_arm=class_arm, term=term
        ).select_related("student", "subject")

        # Check seal status
        seal = BroadsheetSeal.objects.filter(class_arm=class_arm, term=term).first()

        # Build subject map
        subject_ids = set(scores.values_list("subject_id", flat=True))
        subjects = list(Subject.objects.filter(id__in=subject_ids).values("id", "name", "code", "category"))

        # Score map: student_id -> { subject_code -> score_dict }
        score_map = {}
        for sc in scores:
            if sc.student_id not in score_map:
                score_map[sc.student_id] = {}
            score_map[sc.student_id][sc.subject.code] = {
                "ca": float(sc.ca1 + sc.ca2 + sc.assignment + sc.project),
                "exam": float(sc.exam),
                "total": float(sc.total),
                "grade": sc.grade,
                "remark": sc.remark,
            }

        student_rows = []
        for s in students:
            s_scores = score_map.get(s.id, {})
            tot = sum(item["total"] for item in s_scores.values())
            cnt = len(s_scores)
            avg = round(tot / cnt, 1) if cnt else 0.0
            student_rows.append({
                "student_id": s.id,
                "admission_number": s.admission_number,
                "student_name": s.full_name,
                "scores": s_scores,
                "total_score": tot,
                "average": avg,
            })

        # Rank students by total_score descending
        student_rows.sort(key=lambda x: x["total_score"], reverse=True)
        for idx, row in enumerate(student_rows):
            row["position"] = idx + 1

        return Response({
            "class_arm": {
                "id": class_arm.id,
                "name": class_arm.full_name,
                "class_level": class_arm.class_level.name,
            },
            "term": {
                "id": term.id,
                "name": term.name,
                "session": term.session.name,
            },
            "is_sealed": seal.is_sealed if seal else False,
            "sealed_at": seal.sealed_at if seal else None,
            "sealed_by": seal.sealed_by.get_full_name() if seal and seal.sealed_by else None,
            "subjects": subjects,
            "students": student_rows,
            "total_students": len(student_rows),
        })

    @action(detail=False, methods=["post"], url_path="seal")
    def seal(self, request):
        """
        POST /api/v1/grading/broadsheet/seal/
        Locks & seals broadsheet for given class_arm & term.
        Restricted to Exam Officer and Principals.
        """
        if not user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_ADMIN",
                "EXAM_OFFICER",
            ],
        ):
            return Response(
                {"detail": "Only the Exam Officer or Principal can seal terminal broadsheets."},
                status=status.HTTP_403_FORBIDDEN,
            )

        class_arm_id = request.data.get("class_arm")
        term_id = request.data.get("term")
        notes = request.data.get("notes", request.data.get("submission_notes", ""))

        if not class_arm_id or not term_id:
            return Response(
                {"detail": "class_arm and term are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        class_arm = get_object_or_404(ClassArm, pk=class_arm_id)
        term = get_object_or_404(AcademicTerm, pk=term_id)

        # Count missing marks
        missing_count = SubjectScore.objects.filter(
            class_arm=class_arm, term=term, total=Decimal("0")
        ).count()

        # Update or create seal
        seal, _ = BroadsheetSeal.objects.update_or_create(
            class_arm=class_arm,
            term=term,
            defaults={
                "is_sealed": True,
                "sealed_at": timezone.now(),
                "sealed_by": request.user,
                "submission_notes": notes,
                "missing_marks_count": missing_count,
            },
        )

        # Lock all scores for this class arm & term
        SubjectScore.objects.filter(class_arm=class_arm, term=term).update(is_locked=True)

        return Response(
            {
                "detail": f"Broadsheet for {class_arm.full_name} ({term.name}) successfully sealed and locked.",
                "seal": BroadsheetSealSerializer(seal).data,
            },
            status=status.HTTP_200_OK,
        )