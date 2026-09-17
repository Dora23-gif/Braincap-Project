from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.reverse import reverse


@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(request, format=None):
    """
    Everest International Schools — Central REST API Directory.
    Explore all 8 functional domains live in your browser.
    """
    return Response({
        "1_accounts": {
            "users": reverse("accounts:user-list", request=request, format=format),
            "current_user": reverse("accounts:current-user", request=request, format=format),
            "login": reverse("accounts:login", request=request, format=format),
            "set_password": reverse("accounts:set-password", request=request, format=format),
        },
        "2_academics": {
            "sessions": reverse("academics:academicsession-list", request=request, format=format),
            "terms": reverse("academics:academicterm-list", request=request, format=format),
            "class_levels": reverse("academics:classlevel-list", request=request, format=format),
            "class_arms": reverse("academics:classarm-list", request=request, format=format),
            "subjects": reverse("academics:subject-list", request=request, format=format),
            "teacher_allocations": reverse("academics:teacherallocation-list", request=request, format=format),
        },
        "3_students": {
            "students_directory": reverse("students:student-list", request=request, format=format),
            "daily_attendance": reverse("students:attendance-list", request=request, format=format),
            "psychomotor_ratings": reverse("students:psychomotor-list", request=request, format=format),
            "dropped_subjects": reverse("students:droppedsubject-list", request=request, format=format),
        },
        "4_grading": {
            "scores": reverse("grading:score-list", request=request, format=format),
            "marksheets": reverse("grading:marksheet-list", request=request, format=format),
            "broadsheet": reverse("grading:broadsheet-list", request=request, format=format),
            "dossier": reverse("grading:dossier-list", request=request, format=format),
        },
        "5_student_affairs": {
            "incidents": reverse("student_affairs:incident-list", request=request, format=format),
            "exeats": reverse("student_affairs:exeat-list", request=request, format=format),
        },
        "6_timetables": {
            "weekly_periods": reverse("timetables:period-list", request=request, format=format),
            "exam_timetable": reverse("timetables:exam-list", request=request, format=format),
        },
        "7_communications": {
            "portal_messages": reverse("communications:message-list", request=request, format=format),
            "parent_inquiries": reverse("communications:inquiry-list", request=request, format=format),
        },
        "8_governance": {
            "school_settings": reverse("governance:settings-list", request=request, format=format),
            "audit_logs": reverse("governance:audit-log-list", request=request, format=format),
        },
    })


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api-auth/", include("rest_framework.urls")),
    # Central API Root Index
    path("api/v1/", api_root, name="api-root"),
    # API v1 Domain Routes
    path("api/v1/accounts/",        include("apps.accounts.urls",        namespace="accounts")),
    path("api/v1/academics/",       include("apps.academics.urls",       namespace="academics")),
    path("api/v1/students/",        include("apps.students.urls",        namespace="students")),
    path("api/v1/grading/",         include("apps.grading.urls",         namespace="grading")),
    path("api/v1/student-affairs/", include("apps.student_affairs.urls", namespace="student_affairs")),
    path("api/v1/timetables/",      include("apps.timetables.urls",      namespace="timetables")),
    path("api/v1/communications/",  include("apps.communications.urls",  namespace="communications")),
    path("api/v1/governance/",      include("apps.governance.urls",      namespace="governance")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
