from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WeeklyTimetablePeriodViewSet, ExamTimetableEntryViewSet

app_name = "timetables"

router = DefaultRouter()
router.register(r"periods", WeeklyTimetablePeriodViewSet, basename="period")
router.register(r"exams", ExamTimetableEntryViewSet, basename="exam")

urlpatterns = [
    path("", include(router.urls)),
]
