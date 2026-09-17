from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


# ---------------------------------------------------------------------------
# WAEC Grade Calculation Engine
# ---------------------------------------------------------------------------
def evaluate_waec_grade(total_score):
    score = float(total_score)
    if score >= 70:
        return "A", "Excellent"
    elif score >= 60:
        return "B", "Very Good"
    elif score >= 50:
        return "C", "Credit"
    elif score >= 45:
        return "D", "Pass"
    else:
        return "F", "Fail"


# ---------------------------------------------------------------------------
# SubjectScore
# ---------------------------------------------------------------------------
class SubjectScore(models.Model):
    student = models.ForeignKey(
        "students.Student",
        on_delete=models.CASCADE,
        related_name="scores",
    )
    class_arm = models.ForeignKey(
        "academics.ClassArm",
        on_delete=models.CASCADE,
        related_name="scores",
    )
    subject = models.ForeignKey(
        "academics.Subject",
        on_delete=models.CASCADE,
        related_name="scores",
    )
    term = models.ForeignKey(
        "academics.AcademicTerm",
        on_delete=models.CASCADE,
        related_name="scores",
    )

    # Continuous Assessment (each max 10, total CA max 40)
    ca1        = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal("0.0"),
                     validators=[MinValueValidator(0), MaxValueValidator(10)])
    ca2        = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal("0.0"),
                     validators=[MinValueValidator(0), MaxValueValidator(10)])
    assignment = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal("0.0"),
                     validators=[MinValueValidator(0), MaxValueValidator(10)])
    project    = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal("0.0"),
                     validators=[MinValueValidator(0), MaxValueValidator(10)])

    # Terminal Examination (max 60)
    exam = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal("0.0"),
               validators=[MinValueValidator(0), MaxValueValidator(60)])

    # Auto-computed fields (populated in save())
    total  = models.DecimalField(max_digits=5, decimal_places=1, default=Decimal("0.0"))
    grade  = models.CharField(max_length=2,  blank=True)
    remark = models.CharField(max_length=32, blank=True)

    # Teacher pedagogical comment
    teacher_remark = models.CharField(max_length=255, blank=True)

    # Governance and locks
    is_locked        = models.BooleanField(default=False)
    is_overridden    = models.BooleanField(default=False)
    override_reason    = models.TextField(blank=True)
    override_ticket_id = models.CharField(max_length=64, blank=True)
    overridden_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="score_overrides",
    )
    overridden_at = models.DateTimeField(null=True, blank=True)
    updated_at    = models.DateTimeField(auto_now=True)

    # Snapshot of pre-override scores stored as JSON
    previous_score = models.JSONField(null=True, blank=True)

    class Meta:
        unique_together = ("student", "subject", "term")
        ordering = ["student", "subject"]
        verbose_name = "Subject Score"
        verbose_name_plural = "Subject Scores"

    def save(self, *args, **kwargs):
        self.total = (
            (self.ca1        or Decimal("0")) +
            (self.ca2        or Decimal("0")) +
            (self.assignment or Decimal("0")) +
            (self.project    or Decimal("0")) +
            (self.exam       or Decimal("0"))
        )
        self.grade, self.remark = evaluate_waec_grade(self.total)
        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            kwargs["update_fields"] = set(update_fields) | {"total", "grade", "remark"}
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student.admission_number} - {self.subject.code}: {self.total} ({self.grade})"


# ---------------------------------------------------------------------------
# SubjectMarksheetSubmission
# ---------------------------------------------------------------------------
class SubjectMarksheetSubmission(models.Model):
    STATUS_CHOICES = [
        ("IN_PROGRESS", "In Progress"),
        ("SUBMITTED",   "Submitted"),
        ("MODERATED",   "Moderated"),
    ]

    class_arm = models.ForeignKey(
        "academics.ClassArm",
        on_delete=models.CASCADE,
        related_name="marksheet_submissions",
    )
    subject = models.ForeignKey(
        "academics.Subject",
        on_delete=models.CASCADE,
        related_name="marksheet_submissions",
    )
    term = models.ForeignKey(
        "academics.AcademicTerm",
        on_delete=models.CASCADE,
        related_name="marksheet_submissions",
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="marksheet_submissions",
    )
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="IN_PROGRESS")
    submitted_at          = models.DateTimeField(null=True, blank=True)
    graded_students_count = models.PositiveIntegerField(default=0)
    total_students_count  = models.PositiveIntegerField(default=0)
    class_average         = models.DecimalField(max_digits=5, decimal_places=1, default=Decimal("0.0"))
    submission_comments   = models.TextField(blank=True)

    class Meta:
        unique_together = ("class_arm", "subject", "term")
        ordering = ["-term__session__name", "class_arm", "subject"]
        verbose_name = "Subject Marksheet Submission"
        verbose_name_plural = "Subject Marksheet Submissions"

    def __str__(self):
        return f"{self.subject.code} | {self.class_arm.full_name} | {self.term.name} - {self.status}"


# ---------------------------------------------------------------------------
# BroadsheetSeal
# ---------------------------------------------------------------------------
class BroadsheetSeal(models.Model):
    class_arm = models.ForeignKey(
        "academics.ClassArm",
        on_delete=models.CASCADE,
        related_name="broadsheet_seals",
    )
    term = models.ForeignKey(
        "academics.AcademicTerm",
        on_delete=models.CASCADE,
        related_name="broadsheet_seals",
    )
    is_sealed   = models.BooleanField(default=False)
    sealed_at   = models.DateTimeField(null=True, blank=True)
    sealed_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="broadsheet_seals",
    )
    submission_notes    = models.TextField(blank=True)
    missing_marks_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("class_arm", "term")
        ordering = ["-term__session__name", "class_arm"]
        verbose_name = "Broadsheet Seal"
        verbose_name_plural = "Broadsheet Seals"

    def __str__(self):
        state = "SEALED" if self.is_sealed else "OPEN"
        return f"Broadsheet: {self.class_arm.full_name} ({self.term.name}) - {state}"