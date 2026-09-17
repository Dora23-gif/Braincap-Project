from django.db import models
from django.conf import settings


class PortalMessage(models.Model):
    PRIORITY_CHOICES = [
        ("NORMAL", "Normal"),
        ("URGENT", "Urgent"),
        ("OFFICIAL_DIRECTIVE", "Official Directive"),
    ]

    thread_id = models.CharField(max_length=64, db_index=True)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    recipient_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="received_messages",
    )
    recipient_role = models.CharField(max_length=32, default="ALL")
    subject = models.CharField(max_length=255)
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=32, choices=PRIORITY_CHOICES, default="NORMAL")
    related_entity = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Portal Message"
        verbose_name_plural = "Portal Messages"

    def __str__(self):
        return f"[{self.priority}] {self.subject} ({self.sender} -> {self.recipient_user or self.recipient_role})"


class ParentInquiry(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("RESOLVED", "Resolved"),
    ]

    student = models.ForeignKey(
        "students.Student",
        on_delete=models.CASCADE,
        related_name="parent_inquiries",
    )
    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="inquiries",
    )
    recipient_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assigned_inquiries",
    )
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="PENDING")
    staff_reply = models.TextField(blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Parent Inquiry"
        verbose_name_plural = "Parent Inquiries"

    def __str__(self):
        return f"{self.subject} - {self.student.full_name} ({self.status})"
