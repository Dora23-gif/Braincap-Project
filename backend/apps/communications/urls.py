from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PortalMessageViewSet, ParentInquiryViewSet

app_name = "communications"

router = DefaultRouter()
router.register(r"messages", PortalMessageViewSet, basename="message")
router.register(r"inquiries", ParentInquiryViewSet, basename="inquiry")

urlpatterns = [
    path("", include(router.urls)),
]
