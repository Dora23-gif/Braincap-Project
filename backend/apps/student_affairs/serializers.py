from rest_framework import serializers
from .models import DisciplinaryIncident, CampusExeat


class DisciplinaryIncidentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    admission_number = serializers.CharField(source="student.admission_number", read_only=True)
    class_arm_id = serializers.IntegerField(source="student.current_class_arm_id", read_only=True)
    class_arm_name = serializers.SerializerMethodField()
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DisciplinaryIncident
        fields = [
            "id",
            "student",
            "student_name",
            "admission_number",
            "class_arm_id",
            "class_arm_name",
            "incident_type",
            "severity",
            "date",
            "description",
            "action_taken",
            "demerit_points",
            "recorded_by",
            "recorded_by_name",
            "status",
            "resolution_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_class_arm_name(self, obj):
        if obj.student and obj.student.current_class_arm:
            return obj.student.current_class_arm.name
        return ""

    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            name = obj.recorded_by.get_full_name()
            return name if name else obj.recorded_by.username
        return ""

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Add camelCase properties matching frontend types
        ret["studentId"] = str(instance.student_id)
        ret["studentName"] = ret["student_name"]
        ret["admissionNumber"] = ret["admission_number"]
        ret["classArmId"] = str(ret["class_arm_id"]) if ret["class_arm_id"] else ""
        ret["classArmName"] = ret["class_arm_name"]
        ret["incidentType"] = instance.incident_type
        ret["severity"] = instance.severity
        ret["date"] = str(instance.date)
        ret["description"] = instance.description
        ret["actionTaken"] = instance.action_taken
        ret["demeritPoints"] = instance.demerit_points
        ret["recordedBy"] = ret["recorded_by_name"]
        ret["status"] = instance.status
        ret["resolutionNotes"] = instance.resolution_notes
        return ret


class CampusExeatSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    admission_number = serializers.CharField(source="student.admission_number", read_only=True)
    class_arm_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CampusExeat
        fields = [
            "id",
            "student",
            "student_name",
            "admission_number",
            "class_arm_name",
            "exeat_type",
            "departure_date",
            "expected_return_date",
            "actual_return_date",
            "reason",
            "destination",
            "authorized_guardian",
            "guardian_phone",
            "status",
            "approved_by",
            "approved_by_name",
            "issued_at",
            "updated_at",
        ]
        read_only_fields = ["id", "issued_at", "updated_at"]

    def get_class_arm_name(self, obj):
        if obj.student and obj.student.current_class_arm:
            return obj.student.current_class_arm.name
        return ""

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            name = obj.approved_by.get_full_name()
            return name if name else obj.approved_by.username
        return ""

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Add camelCase properties matching frontend types
        ret["studentId"] = str(instance.student_id)
        ret["studentName"] = ret["student_name"]
        ret["admissionNumber"] = ret["admission_number"]
        ret["classArmName"] = ret["class_arm_name"]
        ret["exeatType"] = instance.exeat_type
        ret["departureDate"] = instance.departure_date.isoformat() if instance.departure_date else ""
        ret["expectedReturnDate"] = instance.expected_return_date.isoformat() if instance.expected_return_date else ""
        ret["actualReturnDate"] = instance.actual_return_date.isoformat() if instance.actual_return_date else None
        ret["reason"] = instance.reason
        ret["destination"] = instance.destination
        ret["authorizedGuardian"] = instance.authorized_guardian
        ret["guardianPhone"] = instance.guardian_phone
        ret["status"] = instance.status
        ret["approvedBy"] = ret["approved_by_name"]
        ret["issuedAt"] = instance.issued_at.isoformat() if instance.issued_at else ""
        return ret
