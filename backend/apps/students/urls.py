from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StudentViewSet,
    DailyAttendanceViewSet,
    AffectivePsychomotorViewSet,
    DroppedSubjectViewSet,
)

app_name = "students"

router = DefaultRouter()
router.register("students",        StudentViewSet,             basename="student")
router.register("attendance",      DailyAttendanceViewSet,     basename="attendance")
router.register("psychomotor",     AffectivePsychomotorViewSet,basename="psychomotor")
router.register("dropped-subjects",DroppedSubjectViewSet,      basename="droppedsubject")

urlpatterns = [
    path("", include(router.urls)),
]
