from django.contrib import admin
from .models import (
    AcademicSession, AcademicTerm, ClassLevel,
    ClassArm, Subject, TeacherAllocation,
)


class AcademicTermInline(admin.TabularInline):
    model = AcademicTerm
    extra = 3
    fields = (
        "name", "resumption_date", "closing_date",
        "next_term_resumption_date", "is_active",
        "is_results_published", "is_results_approved_by_principal",
    )


@admin.register(AcademicSession)
class AcademicSessionAdmin(admin.ModelAdmin):
    list_display = ("name", "is_current", "start_date", "end_date")
    list_filter = ("is_current",)
    search_fields = ("name",)
    inlines = [AcademicTermInline]


@admin.register(AcademicTerm)
class AcademicTermAdmin(admin.ModelAdmin):
    list_display = (
        "name", "session", "resumption_date", "closing_date",
        "is_active", "is_results_published", "is_results_approved_by_principal",
    )
    list_filter = ("session", "is_active", "is_results_published")
    search_fields = ("name", "session__name")
    ordering = ("-session__name", "name")


class ClassArmInline(admin.TabularInline):
    model = ClassArm
    extra = 1
    fields = ("name", "full_name", "form_master")


@admin.register(ClassLevel)
class ClassLevelAdmin(admin.ModelAdmin):
    list_display = ("name", "section", "order")
    list_filter = ("section",)
    ordering = ("order",)
    inlines = [ClassArmInline]


class TeacherAllocationInline(admin.TabularInline):
    model = TeacherAllocation
    extra = 1
    fields = ("teacher", "subject", "term")
    autocomplete_fields = ["teacher", "subject"]


@admin.register(ClassArm)
class ClassArmAdmin(admin.ModelAdmin):
    list_display = ("full_name", "class_level", "form_master")
    list_filter = ("class_level__section", "class_level")
    search_fields = ("full_name", "name")
    autocomplete_fields = ["form_master"]
    inlines = [TeacherAllocationInline]


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = (
        "name", "code", "category", "applicable_to", "group",
        "is_compulsory_junior", "is_compulsory_senior_science",
    )
    list_filter = ("category", "applicable_to", "group")
    search_fields = ("name", "code")
    ordering = ("name",)


@admin.register(TeacherAllocation)
class TeacherAllocationAdmin(admin.ModelAdmin):
    list_display = ("teacher", "subject", "class_arm", "term")
    list_filter = ("class_arm__class_level", "subject__category", "term__session")
    search_fields = (
        "teacher__username", "teacher__first_name", "teacher__last_name",
        "subject__name", "class_arm__full_name",
    )
    autocomplete_fields = ["teacher", "subject", "class_arm"]
