from django.contrib import admin
from .models import PortalMessage, ParentInquiry


@admin.register(PortalMessage)
class PortalMessageAdmin(admin.ModelAdmin):
    list_display = ["subject", "sender", "recipient_user", "recipient_role", "priority", "is_read", "created_at"]
    list_filter = ["priority", "is_read", "recipient_role", "created_at"]
    search_fields = ["subject", "content", "thread_id"]
    raw_id_fields = ["sender", "recipient_user"]


@admin.register(ParentInquiry)
class ParentInquiryAdmin(admin.ModelAdmin):
    list_display = ["subject", "student", "parent", "recipient_staff", "status", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["subject", "message", "staff_reply"]
    raw_id_fields = ["student", "parent", "recipient_staff"]
