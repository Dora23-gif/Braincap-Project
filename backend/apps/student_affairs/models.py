from django.db import models
from django.conf import settings


class DisciplinaryIncident(models.Model):
    INCIDENT_TYPE_CHOICES = [
        ("UNIFORM_DRESS_CODE", "Uniform / Dress Code"),
        ("TARDINESS_TRUANCY", "Tardiness / Truancy"),
        ("BULLYING_HARASSMENT", "Bullying / Harassment"),
        ("DISRUPTIVE_BEHAVIOR", "Disruptive Behavior"),
        ("ACADEMIC_DISHONESTY", "Academic Dishonesty"),
        ("CONTRABAND_POSSESSION", "Contraband Possession"),
        ("VANDALISM", "Vandalism"),
    ]

    SEVERITY_CHOICES = [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
        ("CRITICAL", "Critical"),
    ]

    ACTION_TAKEN_CHOICES = [
        ("VERBAL_WARNING", "Verbal Warning"),
        ("WRITTEN_REPRIMAND", "Written Reprimand"),
        ("CAMPUS_DETENTION", "Campus Detention"),
        ("COMMUNITY_SERVICE", "Community Service"),
        ("INTERNAL_SUSPENSION", "Internal Suspension"),
        ("PARENTAL_SUMMONS", "Parental Summons"),
    ]

    STATUS_CHOICES = [
        ("OPEN", "Open"),
        ("RESOLVED", "Resolved"),
        ("ESCALATED_TO_PRINCIPAL", "Escalated to Principal"),
    ]

    student = models.ForeignKey(
        "students.Student",
        on_delete=models.CASCADE,
        related_name="disciplinary_incidents",
    )
    incident_type = models.CharField(max_length=32, choices=INCIDENT_TYPE_CHOICES)
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES, default="MEDIUM")
    date = models.DateField()
    description = models.TextField()
    action_taken = models.CharField(max_length=32, choices=ACTION_TAKEN_CHOICES)
    demerit_points = models.PositiveIntegerField(default=5)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_disciplinary_incidents",
    )
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="OPEN")
    resolution_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        verbose_name = "Disciplinary Incident"
        verbose_name_plural = "Disciplinary Incidents"

    def __str__(self):
        return f"{self.student.full_name} - {self.get_incident_type_display()} ({self.date})"


class CampusExeat(models.Model):
    EXEAT_TYPE_CHOICES = [
        ("MEDICAL", "Medical"),
        ("WEEKEND_HOME", "Weekend Home"),
        ("COMPASSIONATE", "Compassionate"),
        ("DAY_EARLY_DEPARTURE", "Day Early Departure"),
    ]

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("ACTIVE_OFF_CAMPUS", "Active Off Campus"),
        ("RETURNED", "Returned"),
        ("OVERDUE", "Overdue"),
        ("REJECTED", "Rejected"),
    ]

    student = models.ForeignKey(
        "students.Student",
        on_delete=models.CASCADE,
        related_name="campus_exeats",
    )
    exeat_type = models.CharField(max_length=32, choices=EXEAT_TYPE_CHOICES)
    departure_date = models.DateTimeField()
    expected_return_date = models.DateTimeField()
    actual_return_date = models.DateTimeField(null=True, blank=True)
    reason = models.TextField()
    destination = models.CharField(max_length=255)
    authorized_guardian = models.CharField(max_length=100)
    guardian_phone = models.CharField(max_length=20)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="PENDING")
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_exeats",
    )
    issued_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-departure_date", "-issued_at"]
        verbose_name = "Campus Exeat"
        verbose_name_plural = "Campus Exeats"

    def __str__(self):
        return f"{self.student.full_name} - {self.get_exeat_type_display()} ({self.status})"
