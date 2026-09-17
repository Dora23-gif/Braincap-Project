from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DisciplinaryIncidentViewSet, CampusExeatViewSet

app_name = "student_affairs"

router = DefaultRouter()
router.register(r"incidents", DisciplinaryIncidentViewSet, basename="incident")
router.register(r"exeats", CampusExeatViewSet, basename="exeat")

urlpatterns = [
    path("", include(router.urls)),
]
