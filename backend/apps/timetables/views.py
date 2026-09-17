from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import WeeklyTimetablePeriod, ExamTimetableEntry
from .serializers import WeeklyTimetablePeriodSerializer, ExamTimetableEntrySerializer


class WeeklyTimetablePeriodViewSet(viewsets.ModelViewSet):
    queryset = WeeklyTimetablePeriod.objects.select_related("class_arm", "subject", "teacher").all()
    serializer_class = WeeklyTimetablePeriodSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["class_arm", "day", "subject", "teacher"]
    search_fields = ["subject__name", "subject__code", "room_or_lab", "class_arm__name"]
    ordering_fields = ["day", "period_number"]
    ordering = ["day", "period_number"]

    @action(detail=False, methods=["get"], url_path="class-schedule")
    def class_schedule(self, request):
        class_arm_id = request.query_params.get("class_arm") or request.query_params.get("classArmId")
        if not class_arm_id:
            return Response({"detail": "class_arm query parameter is required"}, status=400)

        periods = self.queryset.filter(class_arm_id=class_arm_id)
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        result = []
        for d in days:
            day_periods = periods.filter(day=d).order_by("period_number")
            result.append({
                "day": d,
                "periods": WeeklyTimetablePeriodSerializer(day_periods, many=True).data,
            })
        return Response(result)


class ExamTimetableEntryViewSet(viewsets.ModelViewSet):
    queryset = ExamTimetableEntry.objects.select_related("subject", "chief_invigilator").all()
    serializer_class = ExamTimetableEntrySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["exam_date", "session_type", "subject"]
    search_fields = ["subject__name", "subject__code", "exam_hall", "special_instructions"]
    ordering_fields = ["exam_date", "time_slot"]
    ordering = ["exam_date", "session_type", "time_slot"]
