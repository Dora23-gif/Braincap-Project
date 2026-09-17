from django.contrib import admin
from .models import DisciplinaryIncident, CampusExeat


@admin.register(DisciplinaryIncident)
class DisciplinaryIncidentAdmin(admin.ModelAdmin):
    list_display = [
        "student",
        "incident_type",
        "severity",
        "date",
        "action_taken",
        "demerit_points",
        "status",
        "recorded_by",
    ]
    list_filter = ["incident_type", "severity", "status", "action_taken", "date"]
    search_fields = [
        "student__first_name",
        "student__last_name",
        "student__admission_number",
        "description",
        "resolution_notes",
    ]
    raw_id_fields = ["student", "recorded_by"]


@admin.register(CampusExeat)
class CampusExeatAdmin(admin.ModelAdmin):
    list_display = [
        "student",
        "exeat_type",
        "departure_date",
        "expected_return_date",
        "actual_return_date",
        "status",
        "destination",
        "authorized_guardian",
    ]
    list_filter = ["exeat_type", "status", "departure_date"]
    search_fields = [
        "student__first_name",
        "student__last_name",
        "student__admission_number",
        "destination",
        "authorized_guardian",
        "reason",
    ]
    raw_id_fields = ["student", "approved_by"]
