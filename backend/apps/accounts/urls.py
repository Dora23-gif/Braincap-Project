from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CurrentUserView, LoginView, LogoutView, SetPasswordView, ChangePasswordView, UserViewSet

app_name = "accounts"

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"", UserViewSet, basename="account")

urlpatterns = [
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("set-password/", SetPasswordView.as_view(), name="set-password"),
    path("", include(router.urls)),
]

