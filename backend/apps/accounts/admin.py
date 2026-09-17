from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "get_full_name", "active_role", "is_active")
    list_filter = ("active_role", "is_active", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name", "identifier")
    ordering = ("username",)

    fieldsets = UserAdmin.fieldsets + (
        ("School Portal", {
            "fields": ("identifier", "roles", "active_role", "phone_number", "address", "avatar"),
        }),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ("School Portal", {
            "fields": ("identifier", "roles", "active_role", "phone_number", "address"),
        }),
    )
