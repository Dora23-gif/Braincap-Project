from rest_framework import serializers
from .models import (
    AcademicSession, AcademicTerm, ClassLevel,
    ClassArm, Subject, TeacherAllocation,
)


class AcademicTermSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicTerm
        fields = [
            "id", "session", "name",
            "resumption_date", "closing_date", "next_term_resumption_date",
            "is_active", "is_results_published",
            "is_results_approved_by_principal", "principal_approved_at",
            "principal_approved_by",
        ]


class AcademicSessionSerializer(serializers.ModelSerializer):
    terms = AcademicTermSerializer(many=True, read_only=True)

    class Meta:
        model = AcademicSession
        fields = ["id", "name", "is_current", "start_date", "end_date", "terms"]


class ClassArmSerializer(serializers.ModelSerializer):
    class_level_name = serializers.CharField(source="class_level.name", read_only=True)
    form_master_name = serializers.SerializerMethodField()

    class Meta:
        model = ClassArm
        fields = [
            "id", "class_level", "class_level_name",
            "name", "full_name", "form_master", "form_master_name",
        ]

    def get_form_master_name(self, obj):
        if obj.form_master:
            return obj.form_master.get_full_name() or obj.form_master.username
        return None


class ClassLevelSerializer(serializers.ModelSerializer):
    arms = ClassArmSerializer(many=True, read_only=True)

    class Meta:
        model = ClassLevel
        fields = ["id", "name", "section", "order", "arms"]


class SubjectSerializer(serializers.ModelSerializer):
    category = serializers.ChoiceField(choices=Subject.CATEGORY_CHOICES, default="GENERAL")
    group = serializers.ChoiceField(choices=Subject.GROUP_CHOICES, default="GENERAL_ELECTIVE")
    applicable_to = serializers.ChoiceField(choices=Subject.APPLICABLE_CHOICES, default="ALL")

    class Meta:
        model = Subject
        fields = [
            "id", "name", "code", "category",
            "applicable_to", "group",
            "is_compulsory_junior", "is_compulsory_senior_science",
        ]

    def validate_code(self, value):
        norm = (value or "").strip().upper()
        if not norm:
            raise serializers.ValidationError("Subject code is required.")
        return norm


from apps.accounts.models import CustomUser


class TeacherAllocationSerializer(serializers.ModelSerializer):
    teacher = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all())
    teacher_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    class_arm_name = serializers.CharField(source="class_arm.full_name", read_only=True)

    class Meta:
        model = TeacherAllocation
        fields = [
            "id", "teacher", "teacher_name",
            "class_arm", "class_arm_name",
            "subject", "subject_name", "subject_code", "term",
        ]

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username

