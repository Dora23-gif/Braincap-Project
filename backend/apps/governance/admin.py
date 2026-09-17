from django.contrib import admin
from .models import SchoolSettings, AuditLogEntry


@admin.register(SchoolSettings)
class SchoolSettingsAdmin(admin.ModelAdmin):
    list_display = ["principal_name", "principal_title", "school_email", "school_phone", "updated_at"]

    def has_add_permission(self, request):
        # Disallow adding new instances if one already exists
        return not SchoolSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AuditLogEntry)
class AuditLogEntryAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "user", "user_role", "action", "target_entity", "details"]
    list_filter = ["action", "user_role", "timestamp"]
    search_fields = ["details", "target_entity", "action"]
    readonly_fields = ["timestamp", "user", "user_role", "action", "target_entity", "details", "diff", "metadata"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
