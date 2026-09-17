# pyright: reportMissingImports=false, reportAttributeAccessIssue=false
import logging
import re
import uuid
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from apps.accounts.models import CustomUser

logger = logging.getLogger(__name__)


def generate_parent_invitation(user: CustomUser, student=None) -> str:
    """
    Generates a secure, time-limited token and sends an activation email
    to the parent's Gmail/email address with a link to set their password.
    Returns the generated activation URL.
    """
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    activation_url = f"{settings.FRONTEND_URL}/set-password?uid={uid}&token={token}"

    parent_name = user.get_full_name() or "Parent / Guardian"
    ward_text = (
        f" for your ward, {student.full_name} (Admission No: {student.admission_number})"
        if student
        else ""
    )

    subject = "Activate Your Parent Portal Account - Everest International Schools"

    plain_message = f"""Dear {parent_name},

Welcome to Everest International Schools!

An official Parent Portal account has been created for you{ward_text}.

Through the Parent Portal, you can:
* View your child's terminal report cards and grades
* Monitor daily roll call attendance
* Request and track campus exeats
* Receive official circulars and communicate with teachers

To activate your account and create your secure password, please click the link below:
{activation_url}

Note: This activation link is secure, unique to your account, and will expire in 48 hours.

If you did not authorize this account registration or have questions, please contact the school administration immediately.

Warm regards,
Admissions and Academic Registry
Everest International Schools
"""

    html_message = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }}
    .header {{ background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); color: #ffffff; padding: 32px 24px; text-align: center; }}
    .header h1 {{ margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }}
    .header p {{ margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }}
    .content {{ padding: 32px 28px; }}
    .button {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 600; font-size: 15px; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 24px 0; text-align: center; }}
    .features {{ background: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin: 20px 0; font-size: 14px; color: #334155; }}
    .features ul {{ margin: 8px 0 0 0; padding-left: 20px; }}
    .footer {{ padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Everest International Schools</h1>
      <p>Official Parent Portal Access</p>
    </div>
    <div class="content">
      <p>Dear <strong>{parent_name}</strong>,</p>
      <p>An official Parent Portal account has been created for you{ward_text}.</p>
      
      <div class="features">
        <strong>With the Parent Portal, you can:</strong>
        <ul>
          <li>View real-time terminal report cards and WAEC performance</li>
          <li>Monitor daily roll-call attendance records</li>
          <li>Track campus exeats and disciplinary updates</li>
          <li>Receive school circulars and message teachers directly</li>
        </ul>
      </div>

      <p style="text-align: center;">
        <a href="{activation_url}" class="button">Activate Parent Portal Account</a>
      </p>

      <p style="font-size: 13px; color: #64748b;">
        Or copy and paste this link in your browser:<br>
        <span style="color: #2563eb; word-break: break-all;">{activation_url}</span>
      </p>

      <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">
        <em>Note: This secure link is unique to your email and expires in 48 hours.</em>
      </p>
    </div>
    <div class="footer">
      Everest International Schools | Victoria Island, Lagos, Nigeria<br>
      Admissions and Academic Registry Office
    </div>
  </div>
</body>
</html>
"""

    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )

    logger.info(f"Dispatched parent activation invitation to {user.email}")
    return activation_url


def get_or_create_parent_user(email: str, name: str = "", phone: str = "", student=None) -> CustomUser:
    """
    Finds an existing CustomUser by email or automatically registers
    a new parent user and sends the activation link.
    """
    clean_email = email.strip()
    if not clean_email:
        raise ValueError("Parent email is required to create a parent user.")

    user = CustomUser.objects.filter(email__iexact=clean_email).first()

    if user:
        # User already exists; ensure PARENT role is assigned
        roles = user.roles if isinstance(user.roles, list) else []
        if "PARENT" not in roles:
            roles.append("PARENT")
            user.roles = roles
            if not user.active_role:
                user.active_role = "PARENT"
            user.save(update_fields=["roles", "active_role"])
        return user

    # Create new parent user
    clean_prefix = re.sub(r"[^a-zA-Z0-9]", "", clean_email.split("@")[0])[:12] or "parent"
    suffix = uuid.uuid4().hex[:6]
    username = f"parent_{clean_prefix}_{suffix}".lower()
    identifier = f"PRT_{suffix.upper()}"

    name_parts = name.strip().split()
    first_name = name_parts[0] if name_parts else "Parent"
    last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

    user = CustomUser.objects.create(
        username=username,
        identifier=identifier,
        email=clean_email,
        first_name=first_name,
        last_name=last_name,
        phone_number=phone.strip(),
        roles=["PARENT"],
        active_role="PARENT",
        is_active=True,
    )
    user.set_unusable_password()
    user.save()

    # Automatically dispatch the invitation email!
    try:
        generate_parent_invitation(user, student=student)
    except Exception as e:
        logger.error(f"Failed to send parent invite to {clean_email}: {e}")

    return user
