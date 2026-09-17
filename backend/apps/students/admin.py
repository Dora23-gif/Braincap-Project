from django.contrib import admin
from .models import Student, DroppedSubjectRecord, DailyAttendance, AffectivePsychomotor


class DroppedSubjectInline(admin.TabularInline):
    model = DroppedSubjectRecord
    extra = 0
    fields = ("subject", "level", "academic_session", "reason", "dropped_at")
    readonly_fields = ("dropped_at",)


class AffectivePsychomotorInline(admin.TabularInline):
    model = AffectivePsychomotor
    extra = 0
    fields = (
        "term",
        "punctuality", "neatness", "politeness", "attentiveness", "honesty", "relationship_with_peers",
        "handwriting", "sports_and_games", "craftsmanship", "musical_artistic_skill",
        "days_present", "days_absent", "total_school_days",
    )


from django.contrib import messages
from apps.accounts.services import generate_parent_invitation, get_or_create_parent_user


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = (
        "admission_number", "last_name", "first_name", "gender",
        "current_class_arm", "house", "parent_email", "parent", "status",
    )
    actions = ["resend_parent_invitations"]

    @admin.action(description="Send / Resend Parent Portal Invitation Link")
    def resend_parent_invitations(self, request, queryset):
        success_count = 0
        skipped_count = 0
        for student in queryset:
            if not student.parent_email:
                skipped_count += 1
                continue
            try:
                parent_user = student.parent
                if not parent_user:
                    parent_user = get_or_create_parent_user(
                        email=student.parent_email,
                        name=student.parent_name,
                        phone=student.parent_phone,
                        student=student,
                    )
                    student.parent = parent_user
                    student.save(update_fields=["parent"])
                else:
                    generate_parent_invitation(parent_user, student=student)
                success_count += 1
            except Exception as e:
                self.message_user(
                    request,
                    f"Error sending invite for {student.admission_number}: {e}",
                    level=messages.ERROR,
                )

        if success_count > 0:
            self.message_user(
                request,
                f"Successfully dispatched {success_count} parent invitation email(s).",
                level=messages.SUCCESS,
            )
        if skipped_count > 0:
            self.message_user(
                request,
                f"Skipped {skipped_count} student(s) with no parent email address.",
                level=messages.WARNING,
            )
    list_filter = (
        "status", "gender", "house", "is_boarder",
        "current_class_arm__class_level__section",
        "current_class_arm__class_level",
    )
    search_fields = (
        "admission_number", "first_name", "last_name", "middle_name",
        "parent_name", "parent_phone", "parent_email",
    )
    autocomplete_fields = ["current_class_arm", "parent"]
    filter_horizontal = ["registered_subjects"]
    ordering = ["current_class_arm", "last_name", "first_name"]
    inlines = [DroppedSubjectInline, AffectivePsychomotorInline]
    fieldsets = (
        ("Identity", {
            "fields": (
                "admission_number", "first_name", "middle_name", "last_name",
                "gender", "date_of_birth", "passport_photo",
            )
        }),
        ("Origin", {
            "fields": ("state_of_origin", "lga", "address"),
        }),
        ("Health & House", {
            "fields": ("blood_group", "genotype", "house"),
        }),
        ("Guardian", {
            "fields": ("parent", "parent_name", "parent_phone", "parent_email"),
        }),
        ("Placement", {
            "fields": ("current_class_arm", "is_boarder", "status", "registered_subjects"),
        }),
    )


@admin.register(DroppedSubjectRecord)
class DroppedSubjectAdmin(admin.ModelAdmin):
    list_display = ("student", "subject", "level", "dropped_at", "academic_session")
    list_filter = ("level", "subject__category", "academic_session")
    search_fields = ("student__admission_number", "student__last_name", "subject__name")
    ordering = ("-dropped_at",)


@admin.register(DailyAttendance)
class DailyAttendanceAdmin(admin.ModelAdmin):
    list_display = ("student", "class_arm", "date", "status")
    list_filter = ("status", "date", "class_arm__class_level")
    search_fields = ("student__admission_number", "student__last_name")
    date_hierarchy = "date"
    ordering = ("-date", "class_arm", "student__last_name")


@admin.register(AffectivePsychomotor)
class AffectivePsychomotorAdmin(admin.ModelAdmin):
    list_display = ("student", "term", "days_present", "days_absent", "total_school_days")
    list_filter = ("term__session", "term")
    search_fields = ("student__admission_number", "student__last_name")
    ordering = ("-term__session__name", "student__last_name")
