from rest_framework import serializers
from .models import WeeklyTimetablePeriod, ExamTimetableEntry


class WeeklyTimetablePeriodSerializer(serializers.ModelSerializer):
    class_arm_name = serializers.CharField(source="class_arm.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyTimetablePeriod
        fields = [
            "id",
            "class_arm",
            "class_arm_name",
            "day",
            "period_number",
            "time_range",
            "subject",
            "subject_name",
            "subject_code",
            "teacher",
            "teacher_name",
            "room_or_lab",
            "is_break",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_teacher_name(self, obj):
        if obj.teacher:
            name = obj.teacher.get_full_name()
            return name if name else obj.teacher.username
        return ""

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Frontend TimetablePeriod mappings
        ret["periodNumber"] = instance.period_number
        ret["timeRange"] = instance.time_range
        ret["subjectName"] = ret["subject_name"]
        ret["subjectCode"] = ret["subject_code"]
        ret["teacherName"] = ret["teacher_name"]
        ret["roomOrLab"] = instance.room_or_lab
        ret["isBreak"] = instance.is_break
        ret["classArmId"] = str(instance.class_arm_id)
        ret["classArmName"] = ret["class_arm_name"]
        return ret


class ExamTimetableEntrySerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    chief_invigilator_name = serializers.SerializerMethodField()

    class Meta:
        model = ExamTimetableEntry
        fields = [
            "id",
            "exam_date",
            "time_slot",
            "session_type",
            "subject",
            "subject_name",
            "subject_code",
            "applicable_classes",
            "exam_hall",
            "chief_invigilator",
            "chief_invigilator_name",
            "special_instructions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_chief_invigilator_name(self, obj):
        if obj.chief_invigilator:
            name = obj.chief_invigilator.get_full_name()
            return name if name else obj.chief_invigilator.username
        return ""

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Frontend ExamTimetableEntry mappings
        ret["examDate"] = str(instance.exam_date)
        ret["timeSlot"] = instance.time_slot
        ret["sessionType"] = instance.session_type
        ret["subjectName"] = ret["subject_name"]
        ret["subjectCode"] = ret["subject_code"]
        ret["applicableClasses"] = instance.applicable_classes
        ret["examHall"] = instance.exam_hall
        ret["examHallName"] = instance.exam_hall
        ret["chiefInvigilatorStaffId"] = str(instance.chief_invigilator_id) if instance.chief_invigilator_id else ""
        ret["chiefInvigilatorName"] = ret["chief_invigilator_name"]
        ret["specialInstructions"] = instance.special_instructions
        return ret
