from django.contrib import admin
from .models import WeeklyTimetablePeriod, ExamTimetableEntry


@admin.register(WeeklyTimetablePeriod)
class WeeklyTimetablePeriodAdmin(admin.ModelAdmin):
    list_display = ["class_arm", "day", "period_number", "time_range", "subject", "teacher", "room_or_lab"]
    list_filter = ["class_arm", "day", "subject"]
    search_fields = ["class_arm__name", "subject__name", "room_or_lab"]
    raw_id_fields = ["class_arm", "subject", "teacher"]


@admin.register(ExamTimetableEntry)
class ExamTimetableEntryAdmin(admin.ModelAdmin):
    list_display = ["exam_date", "time_slot", "session_type", "subject", "exam_hall", "chief_invigilator"]
    list_filter = ["exam_date", "session_type", "subject"]
    search_fields = ["subject__name", "exam_hall", "special_instructions"]
    raw_id_fields = ["subject", "chief_invigilator"]
