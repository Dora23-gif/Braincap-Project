from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


class CustomUserManager(UserManager):
    def create_user(self, username, email=None, password=None, **extra_fields):
        if not extra_fields.get("identifier"):
            extra_fields["identifier"] = extra_fields.get("staff_id") or username
        if not extra_fields.get("roles"):
            role = extra_fields.get("active_role", "SUBJECT_TEACHER")
            extra_fields["roles"] = [role]
        return super().create_user(username, email=email, password=password, **extra_fields)

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("active_role", "SUPER_ADMIN")
        extra_fields.setdefault("roles", ["SUPER_ADMIN"])
        if not extra_fields.get("identifier"):
            extra_fields["identifier"] = extra_fields.get("staff_id") or username
        return super().create_superuser(username, email=email, password=password, **extra_fields)


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ("SUPER_ADMIN", "Super Admin"),
        ("PRINCIPAL", "Principal"),
        ("VICE_PRINCIPAL", "Vice Principal"),
        ("VICE_PRINCIPAL_ACADEMICS", "VP Academics"),
        ("VICE_PRINCIPAL_ADMIN", "VP Admin"),
        ("EXAM_OFFICER", "Exam Officer"),
        ("FORM_MASTER", "Form Master"),
        ("SUBJECT_TEACHER", "Subject Teacher"),
        ("ADMISSIONS_OFFICER", "Admissions Officer"),
        ("PARENT", "Parent"),
        ("STUDENT", "Student"),
    ]

    identifier = models.CharField(max_length=64, unique=True, db_index=True)
    roles = models.JSONField(default=list)
    active_role = models.CharField(
        max_length=32,
        choices=ROLE_CHOICES,
        default="SUBJECT_TEACHER",
    )
    phone_number = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    default_pin = models.CharField(max_length=128, blank=True, default="")

    objects = CustomUserManager()

    def save(self, *args, **kwargs):
        if not self.identifier:
            self.identifier = self.username
        if not self.roles:
            if self.is_superuser:
                self.roles = ["SUPER_ADMIN"]
                self.active_role = "SUPER_ADMIN"
            elif self.active_role:
                self.roles = [self.active_role]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.active_role})"
