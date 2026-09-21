# pyright: reportMissingImports=false, reportAttributeAccessIssue=false
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import generics, permissions, status, viewsets, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from .models import CustomUser
from .serializers import (
    CustomUserSerializer,
    UserSessionSerializer,
    SetPasswordSerializer,
    LoginSerializer,
)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """Returns the currently authenticated user's session profile."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return UserSessionSerializer

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = dict(serializer.data)
        if hasattr(request, "session") and getattr(request.session, "session_key", None):
            data["token"] = request.session.session_key
        return Response(data)



class ChangePasswordView(APIView):
    """
    POST /api/v1/accounts/change-password/
    Allows an authenticated user to change their own password.
    Accepts { old_password, new_password }.
    Validates old_password, updates to new_password, updates default_pin, and preserves session.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old_password = request.data.get("old_password", "").strip()
        new_password = request.data.get("new_password", "").strip()

        if not new_password or len(new_password) < 6:
            return Response(
                {"detail": "New password must be at least 6 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        if not user.check_password(old_password):
            return Response(
                {"detail": "Current password does not match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.default_pin = ""
        user.save(update_fields=["password", "default_pin"])

        if hasattr(request, "session") and request.session is not None:
            try:
                from django.contrib.auth import update_session_auth_hash
                update_session_auth_hash(request, user)
            except Exception:
                pass

        return Response(
            {
                "detail": "Password changed successfully.",
                "user": UserSessionSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class SetPasswordView(APIView):
    """
    POST /api/v1/accounts/set-password/
    Used by parents clicking their invitation link:
    Accepts { uid, token, password }.
    Validates token, sets secure password, and logs them in immediately.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid_b64 = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["password"]

        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = CustomUser.objects.filter(pk=uid).first()
        except (ValueError, TypeError, OverflowError):
            user = None

        if not user:
            return Response(
                {"detail": "Invalid or expired user identification."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "This activation link is invalid or has expired. Please request a new invitation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Set new password and activate
        user.set_password(new_password)
        user.is_active = True
        user.save()

        # Log user into session automatically
        if hasattr(request, "session") and request.session is not None:
            login(request, user)
            if not request.session.session_key:
                request.session.save()
            token = request.session.session_key
        else:
            from importlib import import_module
            from django.conf import settings
            engine = import_module(settings.SESSION_ENGINE)
            session = engine.SessionStore()
            session["_auth_user_id"] = str(user.pk)
            session["_auth_user_backend"] = "django.contrib.auth.backends.ModelBackend"
            session["_auth_user_hash"] = user.get_session_auth_hash()
            session.save()
            token = session.session_key

        return Response(
            {
                "detail": "Password successfully created. Your account is active!",
                "token": token,
                "user": UserSessionSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class LoginView(APIView):
    """
    POST /api/v1/accounts/login/
    Accepts { identifier, password } where identifier can be:
    - Email (e.g. parent@gmail.com)
    - Username (e.g. admin or parent_prt_002)
    - Staff/Student ID (e.g. EIS/2026/001)
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]


    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data["identifier"].strip()
        password = serializer.validated_data["password"]

        # 1. Lookup user by email, username, or identifier
        user = CustomUser.objects.filter(
            username__iexact=identifier
        ).first() or CustomUser.objects.filter(
            email__iexact=identifier
        ).first() or CustomUser.objects.filter(
            identifier__iexact=identifier
        ).first()

        # 2. Verify existence
        if not user:
            return Response(
                {"detail": "Invalid credentials. Please verify your identifier and password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # 3. Verify password against the actual database
        if not user.check_password(password) and not user.check_password(password.strip()):
            return Response(
                {"detail": "Incorrect password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "This account is inactive or pending activation."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 3. Log user into session
        if hasattr(request, "session") and request.session is not None:
            login(request, user)
            if not request.session.session_key:
                request.session.save()
            token = request.session.session_key
        else:
            from importlib import import_module
            from django.conf import settings
            engine = import_module(settings.SESSION_ENGINE)
            session = engine.SessionStore()
            session["_auth_user_id"] = str(user.pk)
            session["_auth_user_backend"] = "django.contrib.auth.backends.ModelBackend"
            session["_auth_user_hash"] = user.get_session_auth_hash()
            session.save()
            token = session.session_key

        return Response(
            {
                "detail": "Login successful.",
                "token": token,
                "user": UserSessionSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """POST /api/v1/accounts/logout/ — End current session."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        logout(request)
        return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)



class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD for User / Staff accounts.
    Allows listing staff members, registering new staff profiles,
    and updating status (ACTIVE/SUSPENDED) or roles.
    """
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["active_role", "is_active"]
    search_fields = ["username", "first_name", "last_name", "email", "identifier"]
    ordering_fields = ["date_joined", "last_name", "first_name", "username"]
    ordering = ["last_name", "first_name"]

    def get_queryset(self):
        qs = CustomUser.objects.all()
        params = getattr(self.request, "query_params", getattr(self.request, "GET", {}))
        user_type = str(params.get("user_type", "")).strip().lower()
        if user_type == "staff":
            qs = qs.exclude(active_role="PARENT").exclude(username="admin")
        elif user_type == "parent":
            qs = qs.filter(active_role="PARENT")
        return qs

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        val = str(self.kwargs.get(lookup_url_kwarg, "")).strip()

        if val.isdigit():
            obj = queryset.filter(pk=int(val)).first()
            if obj:
                self.check_object_permissions(self.request, obj)
                return obj

        obj = queryset.filter(
            models.Q(username__iexact=val) |
            models.Q(identifier__iexact=val) |
            models.Q(identifier__iexact=val.replace("-", "/")) |
            models.Q(email__iexact=val)
        ).first()

        if obj:
            self.check_object_permissions(self.request, obj)
            return obj

        return super().get_object()


