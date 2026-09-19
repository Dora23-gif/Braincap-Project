from django.db import models
from rest_framework import serializers
from .models import CustomUser


class CustomUserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    assigned_roles = serializers.ListField(source="roles", required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    avatar_url = serializers.SerializerMethodField()
    wards = serializers.SerializerMethodField()
    allocated_subjects = serializers.SerializerMethodField()
    allocatedSubjects = serializers.SerializerMethodField()
    assigned_subject_ids = serializers.SerializerMethodField()
    assignedSubjectIds = serializers.SerializerMethodField()
    assigned_class_arms = serializers.SerializerMethodField()
    assignedClassArms = serializers.SerializerMethodField()
    form_master_class_arm = serializers.SerializerMethodField()
    form_master_class_arm_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id", "username", "email", "first_name", "last_name", "name", "full_name",
            "identifier", "roles", "assigned_roles", "active_role",
            "phone_number", "address", "avatar", "avatar_url", "is_active", "password", "default_pin",
            "wards", "allocated_subjects", "allocatedSubjects",
            "assigned_subject_ids", "assignedSubjectIds",
            "assigned_class_arms", "assignedClassArms",
            "form_master_class_arm", "form_master_class_arm_name",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "username": {"required": False, "allow_blank": True},
            "identifier": {"required": False, "allow_blank": True},
            "email": {"required": False, "allow_blank": True},
            "default_pin": {"required": False, "allow_blank": True},
        }

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_avatar_url(self, obj):
        if obj.avatar:
            return obj.avatar.url
        return None

    def get_wards(self, obj):
        try:
            from apps.students.models import Student
            q = models.Q(parent=obj)
            if obj.email and obj.email.strip():
                q |= models.Q(parent_email__iexact=obj.email.strip())
            wards = Student.objects.filter(q).select_related("current_class_arm").distinct()
            return [
                {
                    "id": str(w.id),
                    "admissionNumber": w.admission_number,
                    "admission_number": w.admission_number,
                    "name": w.full_name,
                    "classArm": w.current_class_arm.full_name if w.current_class_arm else "",
                    "class_arm": w.current_class_arm.full_name if w.current_class_arm else "",
                }
                for w in wards
            ]
        except Exception:
            if hasattr(obj, "wards"):
                return [
                    {
                        "id": str(w.id),
                        "admissionNumber": w.admission_number,
                        "admission_number": w.admission_number,
                        "name": w.full_name,
                        "classArm": w.current_class_arm.full_name if w.current_class_arm else "",
                        "class_arm": w.current_class_arm.full_name if w.current_class_arm else "",
                    }
                    for w in obj.wards.all()
                ]
            return []

    def _get_allocations_list(self, obj):
        try:
            allocs = obj.teaching_allocations.select_related("class_arm", "subject").all()
            res = []
            for a in allocs:
                name_clean = a.class_arm.full_name.lower().replace(" ", "-")
                arm_slug = f"arm-{name_clean}"
                subj_slug = f"subj-{a.subject.code.lower()}"
                res.append({
                    "id": a.id,
                    "classArmId": arm_slug,
                    "class_arm_id": a.class_arm_id,
                    "class_arm": a.class_arm_id,
                    "class_arm_name": a.class_arm.full_name,
                    "classArmName": a.class_arm.full_name,
                    "subjectId": subj_slug,
                    "subject_id": a.subject_id,
                    "subject": a.subject_id,
                    "subject_code": a.subject.code,
                    "subject_name": a.subject.name,
                    "subjectName": a.subject.name,
                })
            return res
        except Exception:
            return []

    def get_allocated_subjects(self, obj):
        return self._get_allocations_list(obj)

    def get_allocatedSubjects(self, obj):
        return self._get_allocations_list(obj)

    def get_assigned_subject_ids(self, obj):
        allocs = self._get_allocations_list(obj)
        return list({a["subjectId"] for a in allocs})

    def get_assignedSubjectIds(self, obj):
        return self.get_assigned_subject_ids(obj)

    def get_assigned_class_arms(self, obj):
        allocs = self._get_allocations_list(obj)
        return list({a["classArmId"] for a in allocs})

    def get_assignedClassArms(self, obj):
        return self.get_assigned_class_arms(obj)

    def get_form_master_class_arm(self, obj):
        try:
            arm = obj.homeroom_arms.first()
            if arm:
                name_clean = arm.full_name.lower().replace(" ", "-")
                return f"arm-{name_clean}"
        except Exception:
            pass
        return None

    def get_form_master_class_arm_name(self, obj):
        try:
            arm = obj.homeroom_arms.first()
            if arm:
                return arm.full_name
        except Exception:
            pass
        return None

    def _sync_allocations(self, instance, raw_allocs):
        if not raw_allocs or not isinstance(raw_allocs, list):
            return
        from apps.academics.models import ClassArm, Subject, TeacherAllocation, AcademicTerm
        active_term = AcademicTerm.objects.filter(is_active=True).first()
        retained_ids = set()

        for item in raw_allocs:
            if not isinstance(item, dict):
                continue

            # 1. Resolve ClassArm
            arm = None
            arm_ref = item.get("class_arm") or item.get("classArmId") or item.get("class_arm_id")
            if arm_ref is not None:
                if isinstance(arm_ref, int) or (isinstance(arm_ref, str) and str(arm_ref).isdigit()):
                    arm = ClassArm.objects.filter(pk=int(arm_ref)).first()
                if not arm and isinstance(arm_ref, str):
                    arm_name = item.get("classArmName") or item.get("class_arm_name")
                    if arm_name:
                        arm = ClassArm.objects.filter(full_name__iexact=arm_name.strip()).first()
                    if not arm:
                        clean_ref = arm_ref.lower().replace("arm-", "").replace("-", " ")
                        for a in ClassArm.objects.all():
                            normalized_db = a.full_name.lower().replace(" ", "")
                            normalized_ref = clean_ref.replace(" ", "")
                            if normalized_db == normalized_ref or normalized_ref in normalized_db or normalized_db in normalized_ref:
                                arm = a
                                break
            if not arm and item.get("classArmName"):
                arm = ClassArm.objects.filter(full_name__iexact=item["classArmName"].strip()).first()

            # 2. Resolve Subject
            subject = None
            sub_ref = item.get("subject") or item.get("subjectId") or item.get("subject_id") or item.get("subject_code")
            if sub_ref is not None:
                if isinstance(sub_ref, int) or (isinstance(sub_ref, str) and str(sub_ref).isdigit()):
                    subject = Subject.objects.filter(pk=int(sub_ref)).first()
                if not subject and isinstance(sub_ref, str):
                    clean_code = sub_ref.lower().replace("subj-", "").strip().upper()
                    subject = Subject.objects.filter(code__iexact=clean_code).first()
                    if not subject:
                        subject = Subject.objects.filter(name__iexact=clean_code).first()
            if not subject and item.get("subjectName"):
                subject = Subject.objects.filter(name__iexact=item["subjectName"].strip()).first() or Subject.objects.filter(code__iexact=item["subjectName"].strip()).first()

            if arm and subject:
                alloc, _ = TeacherAllocation.objects.update_or_create(
                    class_arm=arm,
                    subject=subject,
                    term=active_term,
                    defaults={"teacher": instance}
                )
                retained_ids.add(alloc.id)

        # In update mode, prune allocations belonging to this teacher not in the retained list
        if getattr(self, '_is_update', False):
            TeacherAllocation.objects.filter(teacher=instance).exclude(id__in=retained_ids).delete()

    def _sync_form_master(self, instance):
        form_master_arm = (
            self.initial_data.get("form_master_class_arm") or
            self.initial_data.get("formMasterClassArmId") or
            self.initial_data.get("form_master_arm")
        )
        if form_master_arm is not None:
            from apps.academics.models import ClassArm
            ClassArm.objects.filter(form_master=instance).update(form_master=None)
            if form_master_arm and ("FORM_MASTER" in (instance.roles or []) or instance.active_role == "FORM_MASTER"):
                arm = None
                if isinstance(form_master_arm, int) or (isinstance(form_master_arm, str) and str(form_master_arm).isdigit()):
                    arm = ClassArm.objects.filter(pk=int(form_master_arm)).first()
                elif isinstance(form_master_arm, str):
                    clean_ref = form_master_arm.lower().replace("arm-", "").replace("-", " ")
                    for a in ClassArm.objects.all():
                        if a.full_name.lower().replace(" ", "") == clean_ref.replace(" ", ""):
                            arm = a
                            break
                if arm:
                    arm.form_master = instance
                    arm.save(update_fields=["form_master"])

    def create(self, validated_data):
        password = validated_data.pop("password", None) or validated_data.get("default_pin") or "Password123!"
        validated_data["default_pin"] = password
        
        # Identifier fallback
        identifier = validated_data.get("identifier")
        if not identifier or CustomUser.objects.filter(identifier=identifier).exists():
            count = CustomUser.objects.count() + 1
            identifier = f"STF/2026/{count:03d}"
            while CustomUser.objects.filter(identifier=identifier).exists():
                count += 1
                identifier = f"STF/2026/{count:03d}"
            validated_data["identifier"] = identifier

        # Username fallback
        username = validated_data.get("username")
        if not username or CustomUser.objects.filter(username=username).exists():
            base_uname = (identifier or "user").replace("/", "_").replace(" ", "_").lower()
            username = base_uname
            counter = 1
            while CustomUser.objects.filter(username=username).exists():
                username = f"{base_uname}_{counter}"
                counter += 1
            validated_data["username"] = username

        # Roles / active_role alignment
        roles = validated_data.get("roles") or []
        active_role = validated_data.get("active_role") or "SUBJECT_TEACHER"
        if not roles and active_role:
            roles = [active_role]
        elif roles and not active_role:
            active_role = roles[0]
        validated_data["roles"] = roles
        validated_data["active_role"] = active_role

        user = CustomUser(**validated_data)
        user.set_password(password)
        if active_role in ("SUPER_ADMIN", "PRINCIPAL"):
            user.is_staff = True
        if active_role == "SUPER_ADMIN":
            user.is_superuser = True
        user.save()

        # Synchronize allocated subjects and form master on creation
        raw_allocs = self.initial_data.get("allocated_subjects") or self.initial_data.get("allocatedSubjects")
        if raw_allocs:
            self._sync_allocations(user, raw_allocs)

        self._sync_form_master(user)

        return user

    def update(self, instance, validated_data):
        self._is_update = True
        password = validated_data.pop("password", None)
        default_pin = validated_data.get("default_pin")
        if password:
            instance.set_password(password)
            instance.default_pin = password
            validated_data["default_pin"] = password
        elif default_pin:
            instance.set_password(default_pin)
            instance.default_pin = default_pin

        roles = validated_data.get("roles")
        active_role = validated_data.get("active_role")
        if roles and not active_role:
            validated_data["active_role"] = roles[0]
        elif active_role and not roles:
            validated_data["roles"] = [active_role]
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Synchronize allocated_subjects with TeacherAllocation records if provided
        raw_allocs = self.initial_data.get("allocated_subjects") or self.initial_data.get("allocatedSubjects")
        if raw_allocs is not None:
            self._sync_allocations(instance, raw_allocs)

        self._sync_form_master(instance)

        return instance


class UserSessionSerializer(serializers.ModelSerializer):
    """
    Serializes a user session in both camelCase and snake_case
    to match the frontend UserSession interface perfectly.
    """
    id = serializers.CharField(source="pk")
    name = serializers.SerializerMethodField()
    assignedRoles = serializers.ListField(source="roles", read_only=True)
    activeRole = serializers.CharField(source="active_role", read_only=True)
    staffId = serializers.SerializerMethodField()
    avatarUrl = serializers.SerializerMethodField()
    defaultPin = serializers.CharField(source="default_pin", read_only=True)
    wards = serializers.SerializerMethodField()
    allocatedSubjects = serializers.SerializerMethodField()
    allocated_subjects = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id", "identifier", "username", "name", "email",
            "assignedRoles", "activeRole", "roles", "active_role",
            "staffId", "avatarUrl", "defaultPin", "default_pin", "wards",
            "allocatedSubjects", "allocated_subjects",
        ]

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_staffId(self, obj):
        if any(r in obj.roles for r in ["SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER", "SUBJECT_TEACHER", "FORM_MASTER", "EXAM_OFFICER"]):
            return obj.identifier
        return None

    def get_avatarUrl(self, obj):
        if obj.avatar:
            return obj.avatar.url
        return None

    def get_allocatedSubjects(self, obj):
        try:
            allocs = obj.teaching_allocations.select_related("class_arm", "subject").all()
            res = []
            for a in allocs:
                name_clean = a.class_arm.full_name.lower().replace(" ", "-")
                arm_slug = f"arm-{name_clean}"
                subj_slug = f"subj-{a.subject.code.lower()}"
                res.append({
                    "id": str(a.id),
                    "classArmId": arm_slug,
                    "class_arm_id": a.class_arm_id,
                    "classArmName": a.class_arm.full_name,
                    "class_arm_name": a.class_arm.full_name,
                    "subjectId": subj_slug,
                    "subject_id": a.subject_id,
                    "subjectName": a.subject.name,
                    "subject_name": a.subject.name,
                    "subject_code": a.subject.code,
                })
            return res
        except Exception:
            return []

    def get_allocated_subjects(self, obj):
        return self.get_allocatedSubjects(obj)

    def get_wards(self, obj):
        """If user is a parent, return basic info for all their enrolled children."""
        if "PARENT" in obj.roles and hasattr(obj, "wards"):
            return [
                {
                    "id": w.id,
                    "admissionNumber": w.admission_number,
                    "admission_number": w.admission_number,
                    "name": w.full_name,
                    "classArm": w.current_class_arm.full_name if w.current_class_arm else "",
                    "class_arm": w.current_class_arm.full_name if w.current_class_arm else "",
                }
                for w in obj.wards.all()
            ]
        return []


class SetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    password = serializers.CharField(required=True, min_length=8, write_only=True)

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
