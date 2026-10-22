"""
Root URL configuration for SignalReport Django project.
Mounts authentication and feed apps under /api/v1/ and root fallback prefixes.
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from apps.feed.views import HealthCheckView


class RootIndexView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            "status": "online",
            "platform": "SignalReport News Intelligence Platform",
            "api_version": "v1",
            "frontend_url": "http://localhost:5173/",
            "endpoints": {
                "health": "/health/",
                "feed": "/api/v1/news/feed/",
                "search": "/api/v1/news/search/",
                "quota": "/api/v1/news/quota/",
                "auth_register": "/api/v1/auth/register",
                "auth_login": "/api/v1/auth/login",
            }
        })


urlpatterns = [
    # Root Landing
    path("", RootIndexView.as_view(), name="root-index"),

    # Admin interface
    path("admin/", admin.site.urls),

    # Health check endpoints
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("health", HealthCheckView.as_view(), name="health-check-no-slash"),

    # Version 1 API Routing (Primary)
    path("api/v1/auth/", include("apps.authentication.urls", namespace="api-v1-auth")),
    path("api/v1/", include("apps.feed.urls", namespace="api-v1-feed")),

    # Root Fallbacks (Matching FastAPI dual-mount behavior)
    path("auth/", include("apps.authentication.urls", namespace="root-auth")),
    path("", include("apps.feed.urls", namespace="root-feed")),
]
