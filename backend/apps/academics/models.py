from django.db import models
from django.conf import settings


class AcademicSession(models.Model):
    """Represents a full academic year, e.g. 2025/2026."""

    name = models.CharField(max_length=32)  # e.g. "2025/2026"
    is_current = models.BooleanField(default=False)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-name"]
        verbose_name = "Academic Session"
        verbose_name_plural = "Academic Sessions"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Ensure only one session is marked current at a time.
        if self.is_current:
            AcademicSession.objects.filter(is_current=True).exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)


class AcademicTerm(models.Model):
    """One of three terms within an AcademicSession."""

    TERM_CHOICES = [
        ("1st Term", "1st Term"),
        ("2nd Term", "2nd Term"),
        ("3rd Term", "3rd Term"),
    ]

    session = models.ForeignKey(
        AcademicSession,
        on_delete=models.CASCADE,
        related_name="terms",
    )
    name = models.CharField(max_length=16, choices=TERM_CHOICES)
    resumption_date = models.DateField()
    closing_date = models.DateField()
    next_term_resumption_date = models.DateField()
    is_active = models.BooleanField(default=False)
    is_results_published = models.BooleanField(default=False)
    is_results_approved_by_principal = models.BooleanField(default=False)
    principal_approved_at = models.DateTimeField(null=True, blank=True)
    principal_approved_by = models.CharField(max_length=128, blank=True)

    class Meta:
        ordering = ["session", "name"]
        unique_together = ("session", "name")
        verbose_name = "Academic Term"
        verbose_name_plural = "Academic Terms"

    def __str__(self):
        return f"{self.name} - {self.session.name}"

    def save(self, *args, **kwargs):
        # Ensure only one term per session is active at a time.
        if self.is_active:
            AcademicTerm.objects.filter(
                session=self.session, is_active=True
            ).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class ClassLevel(models.Model):
    """A year group such as JSS 1, JSS 2 ... SSS 3."""

    SECTION_CHOICES = [
        ("JUNIOR", "Junior Secondary"),
        ("SENIOR", "Senior Secondary"),
    ]

    name = models.CharField(max_length=32)   # e.g. "JSS 1", "SSS 2"
    section = models.CharField(max_length=10, choices=SECTION_CHOICES)
    order = models.PositiveSmallIntegerField(default=1)  # 1-6 for sorting

    class Meta:
        ordering = ["order"]
        verbose_name = "Class Level"
        verbose_name_plural = "Class Levels"

    def __str__(self):
        return self.name


class ClassArm(models.Model):
    """A specific stream within a class level, e.g. SSS 2 Gold."""

    class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.CASCADE,
        related_name="arms",
    )
    name = models.CharField(max_length=32)       # e.g. "Gold", "Diamond"
    full_name = models.CharField(max_length=64)  # e.g. "SSS 2 Gold"
    form_master = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="homeroom_arms",
        limit_choices_to={"active_role": "FORM_MASTER"},
    )

    class Meta:
        ordering = ["class_level__order", "name"]
        unique_together = ("class_level", "name")
        verbose_name = "Class Arm"
        verbose_name_plural = "Class Arms"

    def __str__(self):
        return self.full_name


class Subject(models.Model):
    """An academic subject taught in the school (WAEC/NERDC aligned)."""

    CATEGORY_CHOICES = [
        ("CORE", "Core"),
        ("SCIENCE", "Science"),
        ("ARTS", "Arts"),
        ("COMMERCIAL", "Commercial"),
        ("GENERAL", "General"),
    ]
    APPLICABLE_CHOICES = [
        ("ALL", "All"),
        ("JUNIOR", "Junior Secondary Only"),
        ("SENIOR", "Senior Secondary Only"),
    ]
    GROUP_CHOICES = [
        ("CORE", "Core Compulsory"),
        ("LANGUAGE", "Language"),
        ("TRADE", "Trade / Vocational"),
        ("GENERAL_ELECTIVE", "General Elective"),
    ]

    name = models.CharField(max_length=100)        # e.g. "Physics"
    code = models.CharField(max_length=16, unique=True)  # e.g. "PHY"
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
    applicable_to = models.CharField(max_length=16, choices=APPLICABLE_CHOICES, default="ALL")
    group = models.CharField(max_length=32, choices=GROUP_CHOICES)
    is_compulsory_junior = models.BooleanField(default=False)
    is_compulsory_senior_science = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]
        verbose_name = "Subject"
        verbose_name_plural = "Subjects"

    def __str__(self):
        return f"{self.name} ({self.code})"


class TeacherAllocation(models.Model):
    """Assigns a teacher to teach a specific subject in a specific class arm."""

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="teaching_allocations",
        limit_choices_to={"active_role": "SUBJECT_TEACHER"},
    )
    class_arm = models.ForeignKey(
        ClassArm,
        on_delete=models.CASCADE,
        related_name="teacher_allocations",
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="teacher_allocations",
    )
    term = models.ForeignKey(
        AcademicTerm,
        on_delete=models.CASCADE,
        related_name="teacher_allocations",
        null=True,
        blank=True,
        help_text="Leave blank to apply to all terms in the session.",
    )

    class Meta:
        unique_together = ("class_arm", "subject", "term")
        verbose_name = "Teacher Allocation"
        verbose_name_plural = "Teacher Allocations"

    def __str__(self):
        teacher_name = self.teacher.get_full_name() or self.teacher.username
        return f"{teacher_name} - {self.subject.name} ({self.class_arm.full_name})"
