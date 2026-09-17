# pyright: reportMissingImports=false, reportAttributeAccessIssue=false
# type: ignore

from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from apps.accounts.permissions import IsPrincipalOrAdmin
from .models import (
    AcademicSession, AcademicTerm, ClassLevel,
    ClassArm, Subject, TeacherAllocation,
)
from .serializers import (
    AcademicSessionSerializer, AcademicTermSerializer,
    ClassLevelSerializer, ClassArmSerializer,
    SubjectSerializer, TeacherAllocationSerializer,
)


class AcademicSessionViewSet(viewsets.ModelViewSet):
    queryset = AcademicSession.objects.prefetch_related("terms").all()
    serializer_class = AcademicSessionSerializer
    permission_classes = [permissions.IsAuthenticated]


class AcademicTermViewSet(viewsets.ModelViewSet):
    queryset = AcademicTerm.objects.select_related("session").all()
    serializer_class = AcademicTermSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["session", "is_active", "is_results_published"]


class ClassLevelViewSet(viewsets.ModelViewSet):
    queryset = ClassLevel.objects.prefetch_related("arms").all()
    serializer_class = ClassLevelSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["section"]


class ClassArmViewSet(viewsets.ModelViewSet):
    queryset = ClassArm.objects.select_related("class_level", "form_master").all()
    serializer_class = ClassArmSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["class_level", "class_level__section"]
    search_fields = ["full_name", "name"]


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    filterset_fields = ["category", "applicable_to", "group"]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "code", "category", "applicable_to", "id"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsPrincipalOrAdmin()]
        return [permissions.IsAuthenticated()]


class TeacherAllocationViewSet(viewsets.ModelViewSet):
    queryset = TeacherAllocation.objects.select_related(
        "teacher", "class_arm", "subject", "term"
    ).all().order_by("id")
    serializer_class = TeacherAllocationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["teacher", "class_arm", "subject", "term"]
    search_fields = [
        "teacher__first_name", "teacher__last_name",
        "subject__name", "class_arm__full_name",
    ]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ["id", "teacher__first_name", "teacher__last_name", "subject__name", "class_arm__full_name"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        # Elevate access for administrators, principals, vice principals, and exam officers
        elevated_roles = {
            "SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL",
            "VICE_PRINCIPAL_ACADEMICS", "VICE_PRINCIPAL_ADMIN", "EXAM_OFFICER"
        }
        user_roles = set(user.roles or [])
        if user.active_role:
            user_roles.add(user.active_role)
        if not (user.is_staff or user.is_superuser or user_roles.intersection(elevated_roles)):
            qs = qs.filter(teacher=user)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        teacher = serializer.validated_data["teacher"]
        class_arm = serializer.validated_data["class_arm"]
        subject = serializer.validated_data["subject"]
        term = serializer.validated_data.get("term")
        if not term:
            term = AcademicTerm.objects.filter(is_active=True).first()

        instance, created = TeacherAllocation.objects.update_or_create(
            class_arm=class_arm,
            subject=subject,
            term=term,
            defaults={"teacher": teacher}
        )
        out_serializer = self.get_serializer(instance)
        return Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

