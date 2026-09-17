from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class Student(models.Model):
    """Core student record — mirrors the Student interface in src/types/index.ts."""

    GENDER_CHOICES = [("MALE", "Male"), ("FEMALE", "Female")]
    HOUSE_CHOICES = [
        ("Emerald",  "Emerald"),
        ("Sapphire", "Sapphire"),
        ("Ruby",     "Ruby"),
        ("Diamond",  "Diamond"),
    ]
    BLOOD_GROUP_CHOICES = [
        ("A+", "A+"), ("A-", "A-"),
        ("B+", "B+"), ("B-", "B-"),
        ("O+", "O+"), ("O-", "O-"),
        ("AB+", "AB+"), ("AB-", "AB-"),
    ]
    GENOTYPE_CHOICES = [("AA", "AA"), ("AS", "AS"), ("AC", "AC"), ("SS", "SS")]
    STATUS_CHOICES = [
        ("ACTIVE",      "Active"),
        ("GRADUATED",   "Graduated"),
        ("TRANSFERRED", "Transferred"),
    ]

    # ---- Identity -------------------------------------------------------
    admission_number = models.CharField(max_length=32, unique=True, db_index=True)
    first_name  = models.CharField(max_length=50)
    last_name   = models.CharField(max_length=50)
    middle_name = models.CharField(max_length=50, blank=True)
    gender      = models.CharField(max_length=10, choices=GENDER_CHOICES)
    date_of_birth   = models.DateField()
    state_of_origin = models.CharField(max_length=64)
    lga     = models.CharField(max_length=64)
    address = models.TextField(blank=True)
    passport_photo = models.ImageField(upload_to="students/passports/", null=True, blank=True)

    # ---- Health & House -------------------------------------------------
    house       = models.CharField(max_length=16, choices=HOUSE_CHOICES)
    blood_group = models.CharField(max_length=8,  choices=BLOOD_GROUP_CHOICES)
    genotype    = models.CharField(max_length=8,  choices=GENOTYPE_CHOICES)

    # ---- Guardian / Parent ----------------------------------------------
    # FK to CustomUser when a parent account exists in the system
    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wards",
        limit_choices_to={"active_role": "PARENT"},
    )
    # Denormalised guardian fields (Admissions Wizard — mirrors parentName/Phone/Email)
    parent_name  = models.CharField(max_length=120, blank=True)
    parent_phone = models.CharField(max_length=25,  blank=True)
    parent_email = models.EmailField(blank=True)

    # ---- Academic Placement ---------------------------------------------
    current_class_arm = models.ForeignKey(
        "academics.ClassArm",
        on_delete=models.PROTECT,
        related_name="students",
    )
    is_boarder = models.BooleanField(default=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="ACTIVE")

    # ---- Subjects -------------------------------------------------------
    # registeredSubjectIds in the frontend — subjects the student takes this term
    registered_subjects = models.ManyToManyField(
        "academics.Subject",
        blank=True,
        related_name="enrolled_students",
    )

    class Meta:
        ordering = ["current_class_arm", "last_name", "first_name"]
        verbose_name = "Student"
        verbose_name_plural = "Students"

    def __str__(self):
        return f"{self.last_name}, {self.first_name} ({self.admission_number})"

    @property
    def full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return " ".join(p for p in parts if p).strip()

    @property
    def passport_photo_url(self):
        if self.passport_photo:
            return self.passport_photo.url
        return None


class DroppedSubjectRecord(models.Model):
    """
    Records a subject that a student officially drops at SSS 2 or SSS 3.
    Mirrors DroppedSubjectRecord in src/types/index.ts.
    """

    LEVEL_CHOICES = [("SSS 2", "SSS 2"), ("SSS 3", "SSS 3")]

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="dropped_subjects",
    )
    subject = models.ForeignKey(
        "academics.Subject",
        on_delete=models.CASCADE,
        related_name="dropped_by_students",
    )
    level  = models.CharField(max_length=10, choices=LEVEL_CHOICES)
    reason = models.TextField(blank=True)
    dropped_at = models.DateField(auto_now_add=True)
    academic_session = models.ForeignKey(
        "academics.AcademicSession",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subject_drops",
    )

    class Meta:
        unique_together = ("student", "subject")
        ordering = ["-dropped_at"]
        verbose_name = "Dropped Subject Record"
        verbose_name_plural = "Dropped Subject Records"

    def __str__(self):
        return f"{self.student.admission_number} dropped {self.subject.code} at {self.level}"


class DailyAttendance(models.Model):
    """
    One attendance record per student per school day.
    Mirrors DailyAttendanceRecord in src/types/index.ts.
    """

    STATUS_CHOICES = [
        ("PRESENT", "Present"),
        ("ABSENT",  "Absent"),
        ("LATE",    "Late"),
        ("EXCUSED", "Excused"),
    ]

    student   = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    class_arm = models.ForeignKey(
        "academics.ClassArm",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    date   = models.DateField(db_index=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="PRESENT")

    class Meta:
        unique_together = ("student", "date")
        ordering = ["-date"]
        verbose_name = "Daily Attendance Record"
        verbose_name_plural = "Daily Attendance Records"

    def __str__(self):
        return f"{self.student.admission_number} - {self.date}: {self.status}"


class AffectivePsychomotor(models.Model):
    """
    Per-student, per-term affective traits and psychomotor skills plus
    terminal remarks and attendance roll-up.
    Mirrors AffectiveAndPsychomotor in src/types/index.ts.
    """

    _SCALE = [MinValueValidator(1), MaxValueValidator(5)]

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="psychomotor_records",
    )
    term = models.ForeignKey(
        "academics.AcademicTerm",
        on_delete=models.CASCADE,
        related_name="psychomotor_records",
    )

    # ---- Affective Traits (1-5) -----------------------------------------
    punctuality             = models.PositiveSmallIntegerField(default=4, validators=_SCALE)
    neatness                = models.PositiveSmallIntegerField(default=4, validators=_SCALE)
    politeness              = models.PositiveSmallIntegerField(default=5, validators=_SCALE)
    attentiveness           = models.PositiveSmallIntegerField(default=4, validators=_SCALE)
    honesty                 = models.PositiveSmallIntegerField(default=5, validators=_SCALE)
    relationship_with_peers = models.PositiveSmallIntegerField(default=4, validators=_SCALE)

    # ---- Psychomotor Skills (1-5) ----------------------------------------
    handwriting           = models.PositiveSmallIntegerField(default=4, validators=_SCALE)
    sports_and_games      = models.PositiveSmallIntegerField(default=4, validators=_SCALE)
    craftsmanship         = models.PositiveSmallIntegerField(default=3, validators=_SCALE)
    musical_artistic_skill = models.PositiveSmallIntegerField(default=4, validators=_SCALE)

    # ---- Terminal Remarks -----------------------------------------------
    form_master_remark = models.TextField(blank=True)
    principal_remark   = models.TextField(blank=True)

    # ---- Attendance Roll-up for Report Card -----------------------------
    days_present      = models.PositiveIntegerField(default=0)
    days_absent       = models.PositiveIntegerField(default=0)
    total_school_days = models.PositiveIntegerField(default=65)

    class Meta:
        unique_together = ("student", "term")
        verbose_name = "Affective & Psychomotor Record"
        verbose_name_plural = "Affective & Psychomotor Records"

    def __str__(self):
        return f"{self.student.admission_number} ({self.term.name})"
