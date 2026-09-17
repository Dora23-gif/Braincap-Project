from django.db import models
from django.conf import settings


class WeeklyTimetablePeriod(models.Model):
    DAY_CHOICES = [
        ("Monday", "Monday"),
        ("Tuesday", "Tuesday"),
        ("Wednesday", "Wednesday"),
        ("Thursday", "Thursday"),
        ("Friday", "Friday"),
    ]

    class_arm = models.ForeignKey(
        "academics.ClassArm",
        on_delete=models.CASCADE,
        related_name="timetable_periods",
    )
    day = models.CharField(max_length=16, choices=DAY_CHOICES)
    period_number = models.PositiveSmallIntegerField()
    time_range = models.CharField(max_length=32)  # e.g. "08:15 - 09:00"
    subject = models.ForeignKey(
        "academics.Subject",
        on_delete=models.CASCADE,
        related_name="timetable_periods",
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="taught_periods",
    )
    room_or_lab = models.CharField(max_length=64, default="Senior Wing")
    is_break = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["class_arm", "day", "period_number"]
        unique_together = [("class_arm", "day", "period_number")]
        verbose_name = "Weekly Timetable Period"
        verbose_name_plural = "Weekly Timetable Periods"

    def __str__(self):
        return f"{self.class_arm.name} - {self.day} P{self.period_number}: {self.subject.name} ({self.time_range})"


class ExamTimetableEntry(models.Model):
    SESSION_TYPE_CHOICES = [
        ("MORNING", "Morning"),
        ("AFTERNOON", "Afternoon"),
    ]

    exam_date = models.DateField()
    time_slot = models.CharField(max_length=64)  # e.g. "09:00 - 11:30 (Morning Session)"
    session_type = models.CharField(max_length=16, choices=SESSION_TYPE_CHOICES, default="MORNING")
    subject = models.ForeignKey(
        "academics.Subject",
        on_delete=models.CASCADE,
        related_name="exam_timetable_entries",
    )
    applicable_classes = models.JSONField(default=list)  # e.g. ["SSS 1", "SSS 2"]
    exam_hall = models.CharField(max_length=100)
    chief_invigilator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chief_invigilated_exams",
    )
    special_instructions = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["exam_date", "session_type", "time_slot"]
        verbose_name = "Exam Timetable Entry"
        verbose_name_plural = "Exam Timetable Entries"

    def __str__(self):
        return f"{self.exam_date} - {self.subject.name} ({self.time_slot})"
