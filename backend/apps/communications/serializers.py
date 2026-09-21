from rest_framework import serializers
from .models import PortalMessage, ParentInquiry


class PortalMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    sender_avatar_url = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()

    class Meta:
        model = PortalMessage
        fields = [
            "id",
            "thread_id",
            "sender",
            "sender_name",
            "sender_role",
            "sender_avatar_url",
            "recipient_user",
            "recipient_name",
            "recipient_role",
            "subject",
            "content",
            "is_read",
            "read_at",
            "priority",
            "related_entity",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "sender", "created_at", "updated_at"]

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if "threadId" in data and "thread_id" not in data:
            data["thread_id"] = data["threadId"]
        if "recipientRole" in data and "recipient_role" not in data:
            data["recipient_role"] = data["recipientRole"]
        if "recipientId" in data and "recipient_user" not in data:
            rec_id = data["recipientId"]
            if rec_id and rec_id != "ALL":
                from django.contrib.auth import get_user_model
                User = get_user_model()
                cleaned = str(rec_id).replace("usr-", "").replace("stf-", "").replace("prt-", "")
                if cleaned.isdigit():
                    data["recipient_user"] = int(cleaned)
                else:
                    u = User.objects.filter(username=rec_id).first() or User.objects.filter(identifier=rec_id).first()
                    if u:
                        data["recipient_user"] = u.pk
                    else:
                        data["recipient_user"] = None
            else:
                data["recipient_user"] = None
        if "isRead" in data and "is_read" not in data:
            data["is_read"] = data["isRead"]
        if "relatedEntity" in data and "related_entity" not in data:
            data["related_entity"] = data["relatedEntity"]
        return super().to_internal_value(data)

    def get_sender_name(self, obj):
        if obj.sender:
            name = obj.sender.get_full_name()
            return name if name else obj.sender.username
        return ""

    def get_sender_role(self, obj):
        if obj.sender:
            return getattr(obj.sender, "active_role", "")
        return ""

    def get_sender_avatar_url(self, obj):
        if obj.sender and hasattr(obj.sender, "avatar") and obj.sender.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.sender.avatar.url)
            return obj.sender.avatar.url
        return ""

    def get_recipient_name(self, obj):
        if obj.recipient_user:
            name = obj.recipient_user.get_full_name()
            return name if name else obj.recipient_user.username
        return obj.recipient_role

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Frontend PortalMessage mappings
        ret["threadId"] = instance.thread_id
        ret["senderId"] = str(instance.sender_id)
        ret["senderName"] = ret["sender_name"]
        ret["senderRole"] = ret["sender_role"]
        ret["senderAvatarUrl"] = ret["sender_avatar_url"]
        ret["recipientId"] = str(instance.recipient_user_id) if instance.recipient_user_id else instance.recipient_role
        ret["recipientName"] = ret["recipient_name"]
        ret["recipientRole"] = instance.recipient_role
        ret["subject"] = instance.subject
        ret["content"] = instance.content
        ret["createdAt"] = instance.created_at.isoformat() if instance.created_at else ""
        ret["readAt"] = instance.read_at.isoformat() if instance.read_at else None
        ret["isRead"] = instance.is_read
        ret["priority"] = instance.priority
        ret["relatedEntity"] = instance.related_entity
        return ret


class ParentInquirySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    class_arm_name = serializers.SerializerMethodField()
    parent_name = serializers.SerializerMethodField()
    recipient_staff_name = serializers.SerializerMethodField()
    recipient_role = serializers.SerializerMethodField()

    class Meta:
        model = ParentInquiry
        fields = [
            "id",
            "student",
            "student_name",
            "class_arm_name",
            "parent",
            "parent_name",
            "recipient_staff",
            "recipient_staff_name",
            "recipient_role",
            "subject",
            "message",
            "status",
            "staff_reply",
            "replied_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_class_arm_name(self, obj):
        if obj.student and obj.student.current_class_arm:
            return obj.student.current_class_arm.name
        return ""

    def get_parent_name(self, obj):
        if obj.parent:
            name = obj.parent.get_full_name()
            return name if name else obj.parent.username
        return ""

    def get_recipient_staff_name(self, obj):
        if obj.recipient_staff:
            name = obj.recipient_staff.get_full_name()
            return name if name else obj.recipient_staff.username
        return ""

    def get_recipient_role(self, obj):
        if obj.recipient_staff:
            return getattr(obj.recipient_staff, "active_role", "")
        return ""

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Frontend ParentInquiry mappings
        ret["studentId"] = str(instance.student_id)
        ret["studentName"] = ret["student_name"]
        ret["classArmName"] = ret["class_arm_name"]
        ret["parentId"] = str(instance.parent_id)
        ret["parentName"] = ret["parent_name"]
        ret["recipientStaffId"] = str(instance.recipient_staff_id)
        ret["recipientStaffName"] = ret["recipient_staff_name"]
        ret["recipientRole"] = ret["recipient_role"]
        ret["subject"] = instance.subject
        ret["message"] = instance.message
        ret["createdAt"] = instance.created_at.isoformat() if instance.created_at else ""
        ret["status"] = instance.status
        ret["staffReply"] = instance.staff_reply
        ret["repliedAt"] = instance.replied_at.isoformat() if instance.replied_at else None
        return ret
