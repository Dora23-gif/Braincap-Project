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


from apps.accounts.models import CustomUser


class ClassLevelFlexibleRelatedField(serializers.PrimaryKeyRelatedField):
    """
    Accepts:
    1. Integer PK (e.g. 13)
    2. Numeric string (e.g. "13")
    3. Level name (e.g. "JSS 1", "SSS 2")
    4. Mock ID slug (e.g. "lvl-jss1", "lvl-sss2")
    5. Order number (1-6)
    """
    def to_internal_value(self, data):
        if not data:
            raise serializers.ValidationError("Class level is required.")
        if isinstance(data, ClassLevel):
            return data

        if isinstance(data, int):
            lvl = ClassLevel.objects.filter(pk=data).first()
            if lvl:
                return lvl

        str_val = str(data).strip()
        if str_val.isdigit():
            num = int(str_val)
            lvl = ClassLevel.objects.filter(pk=num).first() or ClassLevel.objects.filter(order=num).first()
            if lvl:
                return lvl

        if str_val.lower().startswith("lvl-") or str_val.lower().startswith("lvl_"):
            clean_str = str_val.replace("lvl-", "").replace("lvl_", "").strip()
            norm = clean_str.upper()
            if len(norm) >= 4 and (norm.startswith("JSS") or norm.startswith("SSS")):
                spaced = f"{norm[:3]} {norm[3:]}"
                lvl = ClassLevel.objects.filter(name__iexact=spaced).first()
                if lvl:
                    return lvl

        lvl = ClassLevel.objects.filter(name__iexact=str_val).first()
        if lvl:
            return lvl

        clean_name = str_val.replace(" ", "").upper()
        for cl in ClassLevel.objects.all():
            if cl.name.replace(" ", "").upper() == clean_name:
                return cl

        raise serializers.ValidationError(f"Class level '{data}' could not be resolved.")


class FormMasterFlexibleRelatedField(serializers.PrimaryKeyRelatedField):
    """
    Accepts:
    1. Integer PK (e.g. 56)
    2. Numeric string (e.g. "56")
    3. Username (e.g. "stf_2026_001")
    4. Identifier (e.g. "STF/2026/001")
    5. Mock ID slug (e.g. "stf-001")
    6. Full Name
    7. Null or blank
    """
    def to_internal_value(self, data):
        if not data:
            return None
        if isinstance(data, CustomUser):
            return data

        if isinstance(data, int):
            user = CustomUser.objects.filter(pk=data).first()
            if user:
                return user

        str_val = str(data).strip()
        if not str_val or str_val.lower() in ("null", "none", "undefined", ""):
            return None

        if str_val.isdigit():
            user = CustomUser.objects.filter(pk=int(str_val)).first()
            if user:
                return user

        if str_val.lower().startswith("stf-") or str_val.lower().startswith("stf_"):
            num_part = str_val[4:]
            if num_part.isdigit():
                formatted_num = f"{int(num_part):03d}"
                user = (
                    CustomUser.objects.filter(identifier__iexact=f"STF/2026/{formatted_num}").first()
                    or CustomUser.objects.filter(username__iexact=f"stf_2026_{formatted_num}").first()
                )
                if user:
                    return user

        user = (
            CustomUser.objects.filter(identifier__iexact=str_val).first()
            or CustomUser.objects.filter(username__iexact=str_val).first()
            or CustomUser.objects.filter(email__iexact=str_val).first()
        )
        if user:
            return user

        for u in CustomUser.objects.all():
            if u.get_full_name().lower() == str_val.lower():
                return u

        return None


class ClassArmSerializer(serializers.ModelSerializer):
    class_level = ClassLevelFlexibleRelatedField(queryset=ClassLevel.objects.all())
    class_level_name = serializers.CharField(source="class_level.name", read_only=True)
    form_master = FormMasterFlexibleRelatedField(
        queryset=CustomUser.objects.all(),
        required=False,
        allow_null=True
    )
    form_master_name = serializers.SerializerMethodField()
    full_name = serializers.CharField(required=False, allow_blank=True)

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

    def validate(self, attrs):
        if not attrs.get("full_name") and attrs.get("class_level") and attrs.get("name"):
            attrs["full_name"] = f"{attrs['class_level'].name} {attrs['name']}".strip()
        return attrs

    def create(self, validated_data):
        class_level = validated_data.get("class_level")
        name = validated_data.get("name")
        full_name = validated_data.get("full_name") or (f"{class_level.name} {name}".strip() if class_level and name else "")
        validated_data["full_name"] = full_name

        existing = ClassArm.objects.filter(class_level=class_level, name__iexact=name).first()
        if existing:
            for k, v in validated_data.items():
                setattr(existing, k, v)
            existing.save()
            return existing

        return super().create(validated_data)


class ClassLevelSerializer(serializers.ModelSerializer):
    arms = ClassArmSerializer(many=True, read_only=True)

    class Meta:
        model = ClassLevel
        fields = ["id", "name", "section", "order", "arms"]

    def create(self, validated_data):
        name = validated_data.get("name", "").strip()
        existing = ClassLevel.objects.filter(name__iexact=name).first()
        if existing:
            for k, v in validated_data.items():
                setattr(existing, k, v)
            existing.save()
            return existing
        return super().create(validated_data)


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

    def create(self, validated_data):
        class_arm = validated_data.get("class_arm")
        subject = validated_data.get("subject")
        term = validated_data.get("term")
        teacher = validated_data.get("teacher")
        if not term:
            from apps.academics.models import AcademicTerm
            term = AcademicTerm.objects.filter(is_active=True).first()
            validated_data["term"] = term
        alloc, _ = TeacherAllocation.objects.update_or_create(
            class_arm=class_arm,
            subject=subject,
            term=term,
            defaults={"teacher": teacher}
        )
        return alloc

