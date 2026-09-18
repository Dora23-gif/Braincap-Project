from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AcademicSessionViewSet, AcademicTermViewSet,
    ClassLevelViewSet, ClassArmViewSet,
    SubjectViewSet, TeacherAllocationViewSet,
)

app_name = "academics"

router = DefaultRouter()
router.register("sessions", AcademicSessionViewSet, basename="academicsession")
router.register("terms", AcademicTermViewSet, basename="academicterm")
router.register("class-levels", ClassLevelViewSet, basename="classlevel")
router.register("class-arms", ClassArmViewSet, basename="classarm")
router.register("subjects", SubjectViewSet, basename="subject")
router.register("allocations", TeacherAllocationViewSet, basename="allocation")
router.register("teacher-allocations", TeacherAllocationViewSet, basename="teacherallocation")

urlpatterns = [
    path("rollover/candidates/", AcademicSessionViewSet.as_view({"get": "rollover_candidates"}), name="rollover-candidates"),
    path("rollover/execute/", AcademicSessionViewSet.as_view({"post": "execute_rollover"}), name="rollover-execute"),
    path("", include(router.urls)),
]
