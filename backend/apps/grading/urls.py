from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubjectScoreViewSet,
    TerminalDossierView,
    SubjectMarksheetSubmissionViewSet,
    BroadsheetSealViewSet,
    BroadsheetViewSet,
)

app_name = "grading"

router = DefaultRouter()
router.register("scores",             SubjectScoreViewSet,               basename="score")
router.register("marksheets",         SubjectMarksheetSubmissionViewSet, basename="marksheet")
router.register("broadsheet-seals",   BroadsheetSealViewSet,             basename="broadsheetseal")
router.register("broadsheet",         BroadsheetViewSet,                 basename="broadsheet")
router.register("dossier",            TerminalDossierView,               basename="dossier")

urlpatterns = [
    path("", include(router.urls)),
]