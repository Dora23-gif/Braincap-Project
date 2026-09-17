import os
import sys

# Set up Django environment
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.insert(0, backend_dir)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from apps.accounts.models import CustomUser

def configure_superadmin():
    email = "manestech0@gmail.com"
    password = "Admin123456789"
    username = "manestech0"
    
    print(f"Configuring Super Admin account for {email}...")

    # Look for existing superadmin or create a new one
    user = CustomUser.objects.filter(email__iexact=email).first()
    if not user:
        # Check if an existing primary admin exists to update
        user = CustomUser.objects.filter(username="admin").first() or CustomUser.objects.filter(active_role="SUPER_ADMIN").first()

    if user:
        user.email = email
        user.username = username
        user.identifier = user.identifier or username
        user.first_name = "Super"
        user.last_name = "Admin"
        user.active_role = "SUPER_ADMIN"
        user.roles = ["SUPER_ADMIN"]
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()
        print(f"Updated existing Super Admin user (ID={user.id}) to email: {email}")
    else:
        user = CustomUser.objects.create(
            username=username,
            identifier=username,
            email=email,
            first_name="Super",
            last_name="Admin",
            active_role="SUPER_ADMIN",
            roles=["SUPER_ADMIN"],
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        user.set_password(password)
        user.save()
        print(f"Created brand-new Super Admin user (ID={user.id}) with email: {email}")

    # Verify credentials with Django authenticate
    from django.contrib.auth import authenticate
    auth_user = authenticate(username=username, password=password)
    if not auth_user:
        # Also test authenticating via custom backend if any
        auth_user = user if user.check_password(password) else None

    print(f"Password Check: {'SUCCESS (Valid Password Hash)' if user.check_password(password) else 'FAILED'}")
    print(f"Role in DB: {user.active_role}")
    print(f"Roles list: {user.roles}")
    print(f"Is Superuser: {user.is_superuser}")
    print(f"Is Staff: {user.is_staff}")
    print(f"Is Active: {user.is_active}")
    print("\nSuper Admin setup completed successfully!")

if __name__ == "__main__":
    configure_superadmin()
