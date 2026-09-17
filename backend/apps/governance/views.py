# pyright: reportMissingImports=false, reportAttributeAccessIssue=false
# type: ignore

from rest_framework import viewsets, mixins, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend

from apps.accounts.permissions import user_has_any_role, IsPrincipalOrAdmin, IsSuperAdmin
from .models import SchoolSettings, AuditLogEntry
from .serializers import SchoolSettingsSerializer, AuditLogEntrySerializer


class SchoolSettingsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def list(self, request):
        settings_obj = SchoolSettings.load()
        serializer = SchoolSettingsSerializer(settings_obj, context={"request": request})
        return Response(serializer.data)

    def create(self, request):
        # Allow POST to update/save settings
        return self.update(request)

    def update(self, request, pk=None):
        if not user_has_any_role(
            request.user,
            [
                "SUPER_ADMIN",
                "PRINCIPAL",
                "VICE_PRINCIPAL",
                "VICE_PRINCIPAL_ADMIN",
                "VICE_PRINCIPAL_ACADEMICS",
            ],
        ):
            return Response(
                {"detail": "Only Super Admin and Principal can modify institutional settings."},
                status=status.HTTP_403_FORBIDDEN,
            )
        settings_obj = SchoolSettings.load()
        serializer = SchoolSettingsSerializer(
            settings_obj,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=["get", "put", "patch"], url_path="current")
    def current(self, request):
        settings_obj = SchoolSettings.load()
        if request.method in ["PUT", "PATCH"]:
            if not user_has_any_role(
                request.user,
                [
                    "SUPER_ADMIN",
                    "PRINCIPAL",
                    "VICE_PRINCIPAL",
                    "VICE_PRINCIPAL_ADMIN",
                    "VICE_PRINCIPAL_ACADEMICS",
                ],
            ):
                return Response(
                    {"detail": "Only Super Admin and Principal can modify institutional settings."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            serializer = SchoolSettingsSerializer(
                settings_obj,
                data=request.data,
                partial=True,
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        serializer = SchoolSettingsSerializer(settings_obj, context={"request": request})
        return Response(serializer.data)


class AuditLogEntryViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = AuditLogEntry.objects.select_related("user").all()
    serializer_class = AuditLogEntrySerializer
    permission_classes = [IsAuthenticated, IsPrincipalOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["action", "user_role", "target_entity", "user"]
    search_fields = [
        "details", "target_entity", "action", "user_role",
        "user__first_name", "user__last_name", "user__identifier",
    ]
    ordering_fields = ["timestamp", "action"]
    ordering = ["-timestamp"]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        role = getattr(user, "active_role", "") if user else "SYSTEM"
        serializer.save(user=user, user_role=role or "SYSTEM")
