from django.contrib import admin
from .models import SubjectScore, SubjectMarksheetSubmission, BroadsheetSeal


@admin.register(SubjectScore)
class SubjectScoreAdmin(admin.ModelAdmin):
    list_display = (
        "student", "subject", "class_arm", "term",
        "ca1", "ca2", "assignment", "project", "exam",
        "total", "grade", "is_locked", "is_overridden",
    )
    list_filter = (
        "term__session", "term", "grade",
        "is_locked", "is_overridden",
        "class_arm__class_level__section",
        "class_arm__class_level",
        "subject__category",
    )
    search_fields = (
        "student__admission_number",
        "student__first_name",
        "student__last_name",
        "subject__name",
        "subject__code",
    )
    readonly_fields = (
        "total", "grade", "remark",
        "overridden_at", "updated_at",
    )
    fieldsets = (
        ("Identification", {
            "fields": ("student", "class_arm", "subject", "term"),
        }),
        ("Continuous Assessment (max 40)", {
            "fields": ("ca1", "ca2", "assignment", "project"),
        }),
        ("Terminal Exam (max 60)", {
            "fields": ("exam",),
        }),
        ("Auto-Computed", {
            "fields": ("total", "grade", "remark"),
            "classes": ("collapse",),
        }),
        ("Remarks", {
            "fields": ("teacher_remark",),
        }),
        ("Governance", {
            "fields": (
                "is_locked", "is_overridden",
                "override_reason", "override_ticket_id",
                "overridden_by", "overridden_at", "previous_score",
                "updated_at",
            ),
            "classes": ("collapse",),
        }),
    )


@admin.register(SubjectMarksheetSubmission)
class SubjectMarksheetSubmissionAdmin(admin.ModelAdmin):
    list_display = (
        "class_arm", "subject", "term", "teacher", "status",
        "graded_students_count", "total_students_count",
        "class_average", "submitted_at",
    )
    list_filter = ("status", "term__session", "term", "class_arm__class_level")
    search_fields = (
        "class_arm__full_name", "subject__name",
        "teacher__first_name", "teacher__last_name",
    )
    readonly_fields = ("submitted_at",)


@admin.register(BroadsheetSeal)
class BroadsheetSealAdmin(admin.ModelAdmin):
    list_display = (
        "class_arm", "term", "is_sealed",
        "sealed_at", "sealed_by", "missing_marks_count",
    )
    list_filter = ("is_sealed", "term__session", "term")
    search_fields = ("class_arm__full_name",)
    readonly_fields = ("sealed_at",)