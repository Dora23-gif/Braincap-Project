from django.db import models
from rest_framework import serializers
from apps.academics.models import ClassArm, Subject
from apps.academics.serializers import SubjectSerializer
from apps.accounts.models import CustomUser
from .models import Student, DroppedSubjectRecord, DailyAttendance, AffectivePsychomotor


# ---------------------------------------------------------------------------
# Dropped Subject
# ---------------------------------------------------------------------------
class DroppedSubjectRecordSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_code = serializers.CharField(source="subject.code", read_only=True)

    class Meta:
        model = DroppedSubjectRecord
        fields = [
            "id", "student", "subject", "subject_name", "subject_code",
            "level", "reason", "dropped_at", "academic_session",
        ]
        read_only_fields = ["id", "dropped_at"]


# ---------------------------------------------------------------------------
# Affective & Psychomotor
# ---------------------------------------------------------------------------
class AffectivePsychomotorSerializer(serializers.ModelSerializer):
    class Meta:
        model = AffectivePsychomotor
        fields = [
            "id", "student", "term",
            # Affective
            "punctuality", "neatness", "politeness",
            "attentiveness", "honesty", "relationship_with_peers",
            # Psychomotor
            "handwriting", "sports_and_games", "craftsmanship", "musical_artistic_skill",
            # Remarks
            "form_master_remark", "principal_remark",
            # Attendance
            "days_present", "days_absent", "total_school_days",
        ]
        read_only_fields = ["id"]


# ---------------------------------------------------------------------------
# Daily Attendance
# ---------------------------------------------------------------------------
class DailyAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    admission_number = serializers.CharField(source="student.admission_number", read_only=True)
    class_arm_name = serializers.CharField(source="class_arm.full_name", read_only=True)

    class Meta:
        model = DailyAttendance
        fields = [
            "id", "student", "student_name", "admission_number",
            "class_arm", "class_arm_name", "date", "status",
        ]
        read_only_fields = ["id"]

    def get_student_name(self, obj):
        return obj.student.full_name


class BulkAttendanceItemSerializer(serializers.Serializer):
    """Used by the bulk attendance endpoint (POST /attendance/bulk/)."""
    student    = serializers.CharField()
    class_arm  = serializers.CharField(required=False, allow_blank=True)
    date       = serializers.DateField()
    status     = serializers.ChoiceField(choices=DailyAttendance.STATUS_CHOICES)


class BulkAttendanceSerializer(serializers.Serializer):
    records = BulkAttendanceItemSerializer(many=True)


# ---------------------------------------------------------------------------
# Student — list vs detail
# ---------------------------------------------------------------------------
class StudentListSerializer(serializers.ModelSerializer):
    """Enriched serializer for directory / table views with complete student profile."""
    full_name = serializers.ReadOnlyField()
    current_class_arm_name = serializers.CharField(source="current_class_arm.full_name", read_only=True)
    passport_photo_url = serializers.ReadOnlyField()
    registered_subject_ids = serializers.PrimaryKeyRelatedField(
        source="registered_subjects",
        many=True,
        read_only=True,
    )
    registered_subject_codes = serializers.SlugRelatedField(
        source="registered_subjects",
        slug_field="code",
        many=True,
        read_only=True,
    )

    parent_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Student
        fields = [
            "id", "admission_number",
            "first_name", "last_name", "middle_name", "full_name",
            "gender", "date_of_birth", "state_of_origin", "lga", "address",
            "house", "blood_group", "genotype", "status", "is_boarder",
            "current_class_arm", "current_class_arm_name",
            "passport_photo_url",
            "parent", "parent_id",
            "parent_name", "parent_phone", "parent_email",
            "registered_subject_ids",
            "registered_subject_codes",
        ]


class ParentFlexibleRelatedField(serializers.PrimaryKeyRelatedField):
    """
    Accepts:
    1. Integer PK (e.g. 76)
    2. Numeric string (e.g. "76" or "1")
    3. Mock ID string (e.g. "prt-001" or "prt-15")
    4. Email string (e.g. "parent@everest.com")
    """
    def to_internal_value(self, data):
        if not data:
            return None
        if isinstance(data, CustomUser):
            return data

        # 1. If integer PK directly exists in DB
        if isinstance(data, int):
            user = CustomUser.objects.filter(pk=data).first()
            if user:
                return user
            # Check parent_prt_XXX mapping (e.g. 1 -> parent_prt_001)
            user = (
                CustomUser.objects.filter(username=f"parent_prt_{data:03d}").first()
                or CustomUser.objects.filter(username=f"parent_prt_{data}").first()
            )
            if user:
                return user
            return None

        str_val = str(data).strip()
        if str_val.isdigit():
            num = int(str_val)
            user = CustomUser.objects.filter(pk=num).first()
            if user:
                return user
            user = (
                CustomUser.objects.filter(username=f"parent_prt_{num:03d}").first()
                or CustomUser.objects.filter(username=f"parent_prt_{num}").first()
            )
            if user:
                return user
            return None

        if str_val.startswith("prt-") or str_val.startswith("prt_"):
            clean_tag = str_val.replace("-", "_").lower()
            user = (
                CustomUser.objects.filter(username=f"parent_{clean_tag}").first()
                or CustomUser.objects.filter(username__icontains=clean_tag).first()
                or CustomUser.objects.filter(identifier=str_val).first()
            )
            if user:
                return user
            suffix = str_val.replace("prt-", "").replace("prt_", "")
            if suffix.isdigit():
                num = int(suffix)
                user = (
                    CustomUser.objects.filter(username=f"parent_prt_{num:03d}").first()
                    or CustomUser.objects.filter(pk=num).first()
                )
                if user:
                    return user

        user = (
            CustomUser.objects.filter(email__iexact=str_val).first()
            or CustomUser.objects.filter(identifier__iexact=str_val).first()
            or CustomUser.objects.filter(username__iexact=str_val).first()
        )
        if user:
            return user
        return None


class ClassArmFlexibleRelatedField(serializers.PrimaryKeyRelatedField):
    """
    Accepts:
    1. Integer PK (e.g. 37)
    2. Numeric string (e.g. "37")
    3. Full arm name (e.g. "JSS 1 Gold", "SSS 2 Diamond")
    4. Mock ID slug (e.g. "arm-jss1-gold", "arm-sss2-gold")
    5. Fallback to first ClassArm
    """
    def to_internal_value(self, data):
        if not data:
            raise serializers.ValidationError("Class arm is required.")
        if isinstance(data, ClassArm):
            return data
        if isinstance(data, int):
            arm = ClassArm.objects.filter(pk=data).first()
            if arm:
                return arm
            raise serializers.ValidationError(f"Class arm ID {data} does not exist.")

        str_val = str(data).strip()
        if str_val.isdigit():
            arm = ClassArm.objects.filter(pk=int(str_val)).first()
            if arm:
                return arm
            raise serializers.ValidationError(f"Class arm ID {str_val} does not exist.")

        # 1. Exact full_name or name match
        arm = (
            ClassArm.objects.filter(full_name__iexact=str_val).first()
            or ClassArm.objects.filter(name__iexact=str_val).first()
        )
        if arm:
            return arm

        # 2. Slug or combined code matching (e.g. arm-sss3-arts-platinum or sss3gold)
        clean = str_val.lower().replace("arm-", "").replace("-", "").replace(" ", "")
        for ca in ClassArm.objects.select_related("class_level").all():
            lvl_code = ca.class_level.name.lower().replace(" ", "")
            arm_code = ca.name.lower().replace(" ", "")
            combined = f"{lvl_code}{arm_code}"
            if combined == clean or clean in combined or (lvl_code in clean and arm_code in clean):
                return ca

        # 3. Partial contains match
        arm = (
            ClassArm.objects.filter(full_name__icontains=str_val.replace("arm-", "").replace("-", " ")).first()
            or ClassArm.objects.filter(name__icontains=str_val.replace("arm-", "").replace("-", " ")).first()
        )
        if arm:
            return arm

        raise serializers.ValidationError(f"Class arm '{data}' could not be resolved to any existing class arm in the database.")


class StudentDetailSerializer(serializers.ModelSerializer):
    """Full serializer for profile / admissions wizard / report card views."""
    full_name = serializers.ReadOnlyField()
    admission_number = serializers.CharField(
        required=False,
        allow_blank=True,
        validators=[],
    )
    parent = ParentFlexibleRelatedField(queryset=CustomUser.objects.all(), required=False, allow_null=True)
    parent_id = serializers.IntegerField(read_only=True)
    parent_name = serializers.CharField(required=False, allow_blank=True, default="")
    parent_phone = serializers.CharField(required=False, allow_blank=True, default="")
    parent_email = serializers.CharField(required=False, allow_blank=True, default="")
    current_class_arm = ClassArmFlexibleRelatedField(queryset=ClassArm.objects.all(), required=False)
    current_class_arm_name = serializers.CharField(source="current_class_arm.full_name", read_only=True)
    passport_photo_url = serializers.ReadOnlyField()
    gender = serializers.CharField(required=False, default="MALE")
    date_of_birth = serializers.DateField(required=False, default="2012-01-01")
    house = serializers.CharField(required=False, default="Emerald")
    blood_group = serializers.CharField(required=False, default="O+")
    genotype = serializers.CharField(required=False, default="AA")
    state_of_origin = serializers.CharField(required=False, default="Lagos")
    lga = serializers.CharField(required=False, default="Ikeja")
    registered_subjects = SubjectSerializer(many=True, read_only=True)
    registered_subject_ids = serializers.PrimaryKeyRelatedField(
        source="registered_subjects",
        many=True,
        read_only=True,
    )
    registered_subject_codes = serializers.SlugRelatedField(
        source="registered_subjects",
        slug_field="code",
        many=True,
        read_only=True,
    )
    dropped_subjects = DroppedSubjectRecordSerializer(many=True, read_only=True)

    class Meta:
        model = Student
        fields = [
            "id", "admission_number",
            "first_name", "last_name", "middle_name", "full_name",
            "gender", "date_of_birth",
            "state_of_origin", "lga", "address",
            "passport_photo", "passport_photo_url",
            "house", "blood_group", "genotype",
            "parent", "parent_id", "parent_name", "parent_phone", "parent_email",
            "current_class_arm", "current_class_arm_name",
            "is_boarder", "status",
            "registered_subjects", "registered_subject_ids",
            "registered_subject_codes",
            "dropped_subjects",
        ]
        read_only_fields = ["id", "full_name", "passport_photo_url"]

    def _resolve_parent_relationship(self, validated_data):
        import re
        parent = validated_data.get("parent")
        parent_email = (validated_data.get("parent_email") or "").strip().lower()

        if parent:
            validated_data["parent_name"] = parent.get_full_name() or parent.username
            if parent.phone_number and not validated_data.get("parent_phone"):
                validated_data["parent_phone"] = parent.phone_number
            if parent.email and not validated_data.get("parent_email"):
                validated_data["parent_email"] = parent.email
        elif parent_email:
            existing = CustomUser.objects.filter(email__iexact=parent_email).first()
            if existing:
                validated_data["parent"] = existing
                validated_data["parent_name"] = existing.get_full_name() or existing.username
                if existing.phone_number and not validated_data.get("parent_phone"):
                    validated_data["parent_phone"] = existing.phone_number
            else:
                raw_name = (validated_data.get("parent_name") or "Parent / Guardian").strip()
                name_parts = raw_name.split()
                first_name = name_parts[0] if name_parts else "Parent"
                last_name = name_parts[-1] if len(name_parts) > 1 else ""
                count = CustomUser.objects.filter(roles__icontains="PARENT").count() + 1
                base_user = re.sub(r"[^a-zA-Z0-9_]", "_", parent_email.split("@")[0])
                username = f"parent_{base_user}_{count}"
                while CustomUser.objects.filter(username=username).exists():
                    count += 1
                    username = f"parent_{base_user}_{count}"

                new_parent = CustomUser.objects.create(
                    username=username,
                    email=parent_email,
                    identifier=parent_email,
                    first_name=first_name,
                    last_name=last_name,
                    phone_number=validated_data.get("parent_phone", ""),
                    address=validated_data.get("address", ""),
                    roles=["PARENT"],
                    active_role="PARENT",
                    default_pin="Password123!",
                )
                new_parent.set_password("Password123!")
                new_parent.save()
                validated_data["parent"] = new_parent

    def create(self, validated_data):
        adm_no = validated_data.get("admission_number")
        if not adm_no or Student.objects.filter(admission_number=adm_no).exists():
            import datetime, re
            year = datetime.datetime.now().year
            highest_serial = 0
            for s in Student.objects.all():
                m = re.search(r"EIS/\d{4}/0*(\d+)", s.admission_number)
                if m:
                    val = int(m.group(1))
                    if val > highest_serial:
                        highest_serial = val
            if highest_serial == 0:
                highest_serial = Student.objects.count()
            next_num = highest_serial + 1
            adm_no = f"EIS/{year}/{next_num:04d}"
            while Student.objects.filter(admission_number=adm_no).exists():
                next_num += 1
                adm_no = f"EIS/{year}/{next_num:04d}"
            validated_data["admission_number"] = adm_no

        if "current_class_arm" not in validated_data or not validated_data["current_class_arm"]:
            validated_data["current_class_arm"] = ClassArm.objects.first()

        self._resolve_parent_relationship(validated_data)

        student = super().create(validated_data)

        # Auto-register standard subjects for class level
        if not student.registered_subjects.exists():
            arm = student.current_class_arm
            if arm and arm.class_level:
                section = arm.class_level.section
                if section == "JUNIOR":
                    default_subs = Subject.objects.filter(
                        models.Q(applicable_to__in=["ALL", "JUNIOR"]) | models.Q(is_compulsory_junior=True)
                    )
                else:
                    default_subs = Subject.objects.filter(
                        models.Q(applicable_to__in=["ALL", "SENIOR"]) | models.Q(is_compulsory_senior_science=True)
                    )
                student.registered_subjects.set(default_subs)

        return student

    def update(self, instance, validated_data):
        self._resolve_parent_relationship(validated_data)
        return super().update(instance, validated_data)

