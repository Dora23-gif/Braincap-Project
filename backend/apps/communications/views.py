from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import PortalMessage, ParentInquiry
from .serializers import PortalMessageSerializer, ParentInquirySerializer


class PortalMessageViewSet(viewsets.ModelViewSet):
    queryset = PortalMessage.objects.select_related("sender", "recipient_user").all()
    serializer_class = PortalMessageSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["thread_id", "sender", "recipient_user", "recipient_role", "priority", "is_read"]
    search_fields = ["subject", "content"]
    ordering_fields = ["created_at", "priority"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return PortalMessage.objects.none()

        active_role = getattr(user, "active_role", "")
        if user.is_superuser or user.is_staff or active_role in ["SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL_ADMIN", "VICE_PRINCIPAL"]:
            return self.queryset

        user_roles = getattr(user, "roles", [])
        query = Q(sender=user) | Q(recipient_user=user) | Q(recipient_role="ALL")
        if active_role:
            query |= Q(recipient_role=active_role)
            if active_role in ["TEACHER", "SUBJECT_TEACHER"]:
                query |= Q(recipient_role="TEACHER") | Q(recipient_role="SUBJECT_TEACHER")
            if active_role in ["EXAM_OFFICER", "EXAMINATION_OFFICER"]:
                query |= Q(recipient_role="EXAM_OFFICER") | Q(recipient_role="EXAMINATION_OFFICER")
        for r in user_roles:
            query |= Q(recipient_role=r)

        return self.queryset.filter(query).distinct()

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        message = self.get_object()
        message.is_read = True
        message.read_at = timezone.now()
        message.save()
        return Response(self.get_serializer(message).data)

    @action(detail=False, methods=["get"], url_path="inbox")
    def inbox(self, request):
        user = request.user
        user_roles = getattr(user, "roles", [])
        active_role = getattr(user, "active_role", "")

        query = Q(recipient_user=user) | Q(recipient_role="ALL")
        if active_role:
            query |= Q(recipient_role=active_role)
        for r in user_roles:
            query |= Q(recipient_role=r)

        messages = self.queryset.filter(query).distinct()
        page = self.paginate_queryset(messages)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(self.get_serializer(messages, many=True).data)


class ParentInquiryViewSet(viewsets.ModelViewSet):
    queryset = ParentInquiry.objects.select_related("student", "parent", "recipient_staff").all()
    serializer_class = ParentInquirySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["student", "parent", "recipient_staff", "status"]
    search_fields = ["subject", "message", "staff_reply", "student__first_name", "student__last_name"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user and user.is_authenticated:
            if getattr(user, "active_role", "") == "PARENT" and not (user.is_staff or user.is_superuser):
                return qs.filter(parent=user)
        return qs
    ordering_fields = ["created_at", "status"]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        serializer.save(parent=self.request.user)

    @action(detail=True, methods=["post"], url_path="reply")
    def reply(self, request, pk=None):
        inquiry = self.get_object()
        reply_text = request.data.get("staff_reply") or request.data.get("staffReply") or request.data.get("reply") or ""
        inquiry.staff_reply = reply_text
        inquiry.status = "RESOLVED"
        inquiry.replied_at = timezone.now()
        inquiry.save()
        return Response(self.get_serializer(inquiry).data)
