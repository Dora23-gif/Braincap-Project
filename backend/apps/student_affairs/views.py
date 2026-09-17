from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.accounts.permissions import user_has_any_role
from .models import DisciplinaryIncident, CampusExeat
from .serializers import DisciplinaryIncidentSerializer, CampusExeatSerializer


class DisciplinaryIncidentViewSet(viewsets.ModelViewSet):
    queryset = DisciplinaryIncident.objects.select_related("student", "student__current_class_arm", "recorded_by").all()
    serializer_class = DisciplinaryIncidentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["student", "incident_type", "severity", "status", "date"]
    search_fields = [
        "student__first_name",
        "student__last_name",
        "student__admission_number",
        "description",
        "resolution_notes",
    ]
    ordering_fields = ["date", "created_at", "demerit_points", "severity"]
    ordering = ["-date", "-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user and user.is_authenticated:
            if user_has_any_role(user, ["PARENT"]) and not (user.is_staff or user.is_superuser):
                return qs.filter(student__in=user.wards.all())
        return qs

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user if self.request.user.is_authenticated else None)

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        incident = self.get_object()
        notes = request.data.get("resolution_notes") or request.data.get("resolutionNotes") or ""
        incident.status = "RESOLVED"
        if notes:
            incident.resolution_notes = notes
        incident.save()
        return Response(self.get_serializer(incident).data)

    @action(detail=True, methods=["post"], url_path="escalate")
    def escalate(self, request, pk=None):
        incident = self.get_object()
        notes = request.data.get("resolution_notes") or request.data.get("resolutionNotes") or ""
        incident.status = "ESCALATED_TO_PRINCIPAL"
        if notes:
            incident.resolution_notes = notes
        incident.save()
        return Response(self.get_serializer(incident).data)


class CampusExeatViewSet(viewsets.ModelViewSet):
    queryset = CampusExeat.objects.select_related("student", "student__current_class_arm", "approved_by").all()
    serializer_class = CampusExeatSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["student", "exeat_type", "status"]
    search_fields = [
        "student__first_name",
        "student__last_name",
        "student__admission_number",
        "destination",
        "authorized_guardian",
        "guardian_phone",
        "reason",
    ]
    ordering_fields = ["departure_date", "expected_return_date", "issued_at"]
    ordering = ["-issued_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user and user.is_authenticated:
            if user_has_any_role(user, ["PARENT"]) and not (user.is_staff or user.is_superuser):
                return qs.filter(student__in=user.wards.all())
        return qs

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        exeat = self.get_object()
        exeat.status = "APPROVED"
        exeat.approved_by = request.user if request.user.is_authenticated else None
        exeat.save()
        return Response(self.get_serializer(exeat).data)

    @action(detail=True, methods=["post"], url_path="mark-returned")
    def mark_returned(self, request, pk=None):
        exeat = self.get_object()
        exeat.status = "RETURNED"
        exeat.actual_return_date = timezone.now()
        exeat.save()
        return Response(self.get_serializer(exeat).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        exeat = self.get_object()
        exeat.status = "REJECTED"
        exeat.save()
        return Response(self.get_serializer(exeat).data)
