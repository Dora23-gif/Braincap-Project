# pyright: reportMissingImports=false, reportAttributeAccessIssue=false
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.students.models import Student
from apps.accounts.services import get_or_create_parent_user

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Student)
def auto_link_and_invite_parent(sender, instance: Student, created: bool, **kwargs):
    """
    Whenever a student is registered or updated with a parent_email:
    1. Look up or create the parent CustomUser account.
    2. Link student.parent to that user.
    3. Send the parent an invitation link if it is a new account.
    """
    if not instance.parent_email or not instance.parent_email.strip():
        return

    clean_email = instance.parent_email.strip()

    # Check if parent is already linked with the same email
    if instance.parent and instance.parent.email and instance.parent.email.lower() == clean_email.lower():
        return

    try:
        parent_user = get_or_create_parent_user(
            email=clean_email,
            name=instance.parent_name,
            phone=instance.parent_phone,
            student=instance,
        )
        # Update student record without re-triggering post_save loop
        Student.objects.filter(pk=instance.pk).update(parent=parent_user)
        logger.info(f"Linked student {instance.admission_number} to parent {parent_user.email}")
    except Exception as e:
        logger.error(f"Error linking parent for student {instance.admission_number}: {e}")
