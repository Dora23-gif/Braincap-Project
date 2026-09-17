from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SchoolSettingsViewSet, AuditLogEntryViewSet

app_name = "governance"

router = DefaultRouter()
router.register(r"settings", SchoolSettingsViewSet, basename="settings")
router.register(r"audit-logs", AuditLogEntryViewSet, basename="audit-log")

urlpatterns = [
    path("", include(router.urls)),
]
