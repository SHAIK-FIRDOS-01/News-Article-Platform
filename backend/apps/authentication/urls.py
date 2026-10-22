"""
Authentication URL configuration.
"""

from django.urls import path
from .views import (
    RegisterView,
    VerifyCodeView,
    LoginView,
    RefreshTokenView,
    LogoutView,
    MeView,
)

app_name = "authentication"

urlpatterns = [
    # Register routes
    path("register/", RegisterView.as_view(), name="register"),
    path("register", RegisterView.as_view(), name="register-no-slash"),

    # Verification routes
    path("verify-code/", VerifyCodeView.as_view(), name="verify-code"),
    path("verify-code", VerifyCodeView.as_view(), name="verify-code-no-slash"),
    path("verify-otp/", VerifyCodeView.as_view(), name="verify-otp"),
    path("verify-otp", VerifyCodeView.as_view(), name="verify-otp-no-slash"),

    # Login routes
    path("login/", LoginView.as_view(), name="login"),
    path("login", LoginView.as_view(), name="login-no-slash"),

    # Token refresh routes
    path("refresh/", RefreshTokenView.as_view(), name="refresh"),
    path("refresh", RefreshTokenView.as_view(), name="refresh-no-slash"),

    # Logout routes
    path("logout/", LogoutView.as_view(), name="logout"),
    path("logout", LogoutView.as_view(), name="logout-no-slash"),

    # User profile routes
    path("me/", MeView.as_view(), name="me"),
    path("me", MeView.as_view(), name="me-no-slash"),
]

