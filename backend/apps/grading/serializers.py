from rest_framework import serializers
from .models import SubjectScore, SubjectMarksheetSubmission, BroadsheetSeal


# ---------------------------------------------------------------------------
# SubjectScore
# ---------------------------------------------------------------------------
class SubjectScoreSerializer(serializers.ModelSerializer):
    student_name      = serializers.SerializerMethodField()
    admission_number  = serializers.CharField(source="student.admission_number", read_only=True)
    subject_name      = serializers.CharField(source="subject.name", read_only=True)
    subject_code      = serializers.CharField(source="subject.code", read_only=True)
    class_arm_name    = serializers.CharField(source="class_arm.full_name", read_only=True)
    overridden_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SubjectScore
        fields = [
            "id",
            "student", "student_name", "admission_number",
            "class_arm", "class_arm_name",
            "subject", "subject_name", "subject_code",
            "term",
            # CA
            "ca1", "ca2", "assignment", "project",
            # Exam
            "exam",
            # Auto-computed (read-only from DB)
            "total", "grade", "remark",
            # Remarks
            "teacher_remark",
            # Governance
            "is_locked", "is_overridden",
            "override_reason", "override_ticket_id",
            "overridden_by", "overridden_by_name",
            "overridden_at", "updated_at",
            "previous_score",
        ]
        read_only_fields = [
            "id", "total", "grade", "remark",
            "updated_at",
        ]

    def get_student_name(self, obj):
        return obj.student.full_name

    def get_overridden_by_name(self, obj):
        if obj.overridden_by:
            return obj.overridden_by.get_full_name() or obj.overridden_by.username
        return None


class BulkScoreItemSerializer(serializers.Serializer):
    student    = serializers.CharField()
    subject    = serializers.CharField()
    class_arm  = serializers.CharField(required=False, allow_blank=True)
    term       = serializers.CharField(required=False, default="2")
    ca1        = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, default=0)
    ca2        = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, default=0)
    assignment = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, default=0)
    project    = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, default=0)
    exam       = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, default=0)
    teacher_remark = serializers.CharField(required=False, allow_blank=True, default="")


class BulkScoreSerializer(serializers.Serializer):
    records = BulkScoreItemSerializer(many=True)


class ScoreOverrideSerializer(serializers.Serializer):
    ca1              = serializers.DecimalField(max_digits=4, decimal_places=1, required=False)
    ca2              = serializers.DecimalField(max_digits=4, decimal_places=1, required=False)
    assignment       = serializers.DecimalField(max_digits=4, decimal_places=1, required=False)
    project          = serializers.DecimalField(max_digits=4, decimal_places=1, required=False)
    exam             = serializers.DecimalField(max_digits=4, decimal_places=1, required=False)
    override_reason    = serializers.CharField()
    override_ticket_id = serializers.CharField(required=False, allow_blank=True)


# ---------------------------------------------------------------------------
# SubjectMarksheetSubmission
# ---------------------------------------------------------------------------
class SubjectMarksheetSubmissionSerializer(serializers.ModelSerializer):
    teacher_name   = serializers.SerializerMethodField()
    class_arm_name = serializers.CharField(source="class_arm.full_name", read_only=True)
    subject_name   = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = SubjectMarksheetSubmission
        fields = [
            "id",
            "class_arm", "class_arm_name",
            "subject", "subject_name",
            "term", "teacher", "teacher_name",
            "status", "submitted_at",
            "graded_students_count", "total_students_count",
            "class_average", "submission_comments",
        ]
        read_only_fields = ["id", "submitted_at"]

    def get_teacher_name(self, obj):
        if obj.teacher:
            return obj.teacher.get_full_name() or obj.teacher.username
        return None


# ---------------------------------------------------------------------------
# BroadsheetSeal
# ---------------------------------------------------------------------------
class BroadsheetSealSerializer(serializers.ModelSerializer):
    class_arm_name = serializers.CharField(source="class_arm.full_name", read_only=True)
    sealed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = BroadsheetSeal
        fields = [
            "id",
            "class_arm", "class_arm_name",
            "term", "is_sealed",
            "sealed_at", "sealed_by", "sealed_by_name",
            "submission_notes", "missing_marks_count",
        ]
        read_only_fields = ["id", "sealed_at"]

    def get_sealed_by_name(self, obj):
        if obj.sealed_by:
            return obj.sealed_by.get_full_name() or obj.sealed_by.username
        return None


# ---------------------------------------------------------------------------
# Terminal Dossier (PrintableReportCard aggregate)
# ---------------------------------------------------------------------------
class TerminalDossierRequestSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    term_id    = serializers.IntegerField()