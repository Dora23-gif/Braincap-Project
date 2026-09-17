from rest_framework import serializers
from .models import SchoolSettings, AuditLogEntry


class SchoolSettingsSerializer(serializers.ModelSerializer):
    principal_signature_url = serializers.SerializerMethodField()
    watermark_seal_url = serializers.SerializerMethodField()

    class Meta:
        model = SchoolSettings
        fields = [
            "principal_name",
            "principal_title",
            "principal_signature",
            "principal_signature_url",
            "watermark_seal",
            "watermark_seal_url",
            "show_watermark_in_print",
            "show_watermark_in_preview",
            "auto_sign_report_cards",
            "school_motto",
            "school_address",
            "school_phone",
            "school_email",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def get_principal_signature_url(self, obj):
        if obj.principal_signature:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.principal_signature.url)
            return obj.principal_signature.url
        return ""

    def get_watermark_seal_url(self, obj):
        if obj.watermark_seal:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.watermark_seal.url)
            return obj.watermark_seal.url
        return ""

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Frontend SchoolSettings mappings
        ret["principalName"] = instance.principal_name
        ret["principalTitle"] = instance.principal_title
        ret["principalSignatureUrl"] = ret["principal_signature_url"]
        ret["watermarkSealUrl"] = ret["watermark_seal_url"]
        ret["showWatermarkInPrint"] = instance.show_watermark_in_print
        ret["showWatermarkInPreview"] = instance.show_watermark_in_preview
        ret["autoSignReportCards"] = instance.auto_sign_report_cards
        ret["schoolMotto"] = instance.school_motto
        ret["schoolAddress"] = instance.school_address
        ret["schoolPhone"] = instance.school_phone
        ret["schoolEmail"] = instance.school_email
        return ret


class AuditLogEntrySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_identifier = serializers.SerializerMethodField()

    class Meta:
        model = AuditLogEntry
        fields = [
            "id",
            "user",
            "user_name",
            "user_identifier",
            "user_role",
            "action",
            "target_entity",
            "details",
            "diff",
            "metadata",
            "timestamp",
        ]
        read_only_fields = ["id", "timestamp"]

    def get_user_name(self, obj):
        if obj.user:
            name = obj.user.get_full_name()
            return name if name else obj.user.username
        return "System"

    def get_user_identifier(self, obj):
        if obj.user:
            return getattr(obj.user, "identifier", "") or obj.user.username
        return "SYS-001"

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Frontend AuditLogEntry mappings
        ret["userId"] = str(instance.user_id) if instance.user_id else ""
        ret["userIdentifier"] = ret["user_identifier"]
        ret["userName"] = ret["user_name"]
        ret["userRole"] = instance.user_role
        ret["action"] = instance.action
        ret["targetEntity"] = instance.target_entity
        ret["details"] = instance.details
        ret["diff"] = instance.diff or []
        ret["metadata"] = instance.metadata or {}
        ret["timestamp"] = instance.timestamp.isoformat() if instance.timestamp else ""
        return ret
