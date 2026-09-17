# pyright: reportMissingImports=false, reportAttributeAccessIssue=false
from rest_framework import permissions


def user_has_any_role(user, allowed_roles):
    """
    Check if user is authenticated and has any of the specified roles.
    Checks `user.is_superuser`, `user.active_role`, and `user.roles` list.
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True

    user_roles = set()
    if hasattr(user, "active_role") and user.active_role:
        user_roles.add(str(user.active_role).upper())
    if hasattr(user, "roles") and isinstance(user.roles, list):
        for r in user.roles:
            user_roles.add(str(r).upper())

    target_roles = {str(r).upper() for r in allowed_roles}
    return bool(user_roles & target_roles)


class IsSuperAdmin(permissions.BasePermission):
    """Allows access only to Super Admins."""

    def has_permission(self, request, view):
        return user_has_any_role(request.user, ["SUPER_ADMIN"])


class IsPrincipalOrAdmin(permissions.BasePermission):
    """
    Allows access to Super Admin, Principal, or Vice Principals.
    """

    def has_permission(self, request, view):
        return user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_ADMIN",
            ],
        )


class IsExamOfficerOrPrincipal(permissions.BasePermission):
    """
    Allows access to Super Admin, Principal, and Exam Officers.
    Specifically used for sealing/locking broadsheets and terminal collation sheets.
    """

    def has_permission(self, request, view):
        return user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_ADMIN",
                "EXAM_OFFICER",
            ],
        )


class IsTeacherOrAdmin(permissions.BasePermission):
    """
    Allows access to Teachers (Subject Teacher, Form Master), Exam Officers, and Admins.
    Permitted to view and enter/modify continuous assessment & exam scores.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        return user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_ADMIN",
                "EXAM_OFFICER",
                "FORM_MASTER",
                "SUBJECT_TEACHER",
                "TEACHER",
                "ADMISSIONS_OFFICER",
            ],
        )


class IsFormMaster(permissions.BasePermission):
    """
    Allows access to Form Masters and School Administrators.
    Permitted to manage roll call attendance & psychomotor ratings for their arm.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_ADMIN",
                "FORM_MASTER",
            ],
        ):
            return True
        # Also check if user is a designated form master on any ClassArm
        from apps.academics.models import ClassArm

        return ClassArm.objects.filter(form_master=request.user).exists()


class IsParentUser(permissions.BasePermission):
    """Allows access only to authenticated parent users."""

    def has_permission(self, request, view):
        return user_has_any_role(request.user, ["PARENT"])


class ParentAccessOnly(permissions.BasePermission):
    """
    Object-level permission:
    - If user is a Parent, they can ONLY view records associated with their registered wards.
    - Staff / Admin users are granted access.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True

        # If user is staff/teacher, allow
        if user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ACADEMICS",
                "VICE_PRINCIPAL_ADMIN",
                "EXAM_OFFICER",
                "FORM_MASTER",
                "SUBJECT_TEACHER",
                "TEACHER",
                "ADMISSIONS_OFFICER",
            ],
        ):
            return True

        # Check for Parent role
        if user_has_any_role(request.user, ["PARENT"]):
            ward_ids = set(request.user.wards.values_list("id", flat=True))

            # If obj is a Student
            if hasattr(obj, "parent_id") and obj.parent_id == request.user.id:
                return True
            if hasattr(obj, "parent_email") and request.user.email and obj.parent_email.strip().lower() == request.user.email.strip().lower():
                return True
            if hasattr(obj, "id") and obj.id in ward_ids:
                return True

            # If obj has a student relation (e.g. SubjectScore, DailyAttendance, AffectivePsychomotor)
            if hasattr(obj, "student_id") and obj.student_id in ward_ids:
                return True
            if hasattr(obj, "student") and getattr(obj.student, "id", None) in ward_ids:
                return True

            return False

        return False
