from django.db import models
from django.conf import settings


class SchoolSettings(models.Model):
    principal_name = models.CharField(max_length=100, default="Dr. Michael Adebayo")
    principal_title = models.CharField(max_length=100, default="Principal & Head of School")
    principal_signature = models.ImageField(upload_to="settings/signatures/", null=True, blank=True)
    watermark_seal = models.ImageField(upload_to="settings/seals/", null=True, blank=True)
    show_watermark_in_print = models.BooleanField(default=True)
    show_watermark_in_preview = models.BooleanField(default=True)
    auto_sign_report_cards = models.BooleanField(default=True)
    school_motto = models.CharField(max_length=255, default="Excellence • Character • Leadership")
    school_address = models.TextField(default="Kilometer 14, Lekki-Epe Expressway, Lagos, Nigeria")
    school_phone = models.CharField(max_length=32, default="+234 802 345 6789")
    school_email = models.EmailField(default="admissions@everest.edu.ng")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "School Settings"
        verbose_name_plural = "School Settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # Prevent deletion of singleton

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"Everest School Settings (Principal: {self.principal_name})"


class AuditLogEntry(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    user_role = models.CharField(max_length=32)
    action = models.CharField(max_length=64)
    target_entity = models.CharField(max_length=100)
    details = models.TextField()
    diff = models.JSONField(null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Audit Log Entry"
        verbose_name_plural = "Audit Log Entries"

    def __str__(self):
        user_display = self.user.username if self.user else "System"
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {user_display} ({self.user_role}) - {self.action} on {self.target_entity}"
