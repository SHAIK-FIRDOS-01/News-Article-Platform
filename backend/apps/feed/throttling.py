"""
DRF Throttling for SignalReport: 80-Call Daily Request Limiter.
Enforces daily request quota limits on designated REST endpoints.
"""

from rest_framework.throttling import SimpleRateThrottle


class Daily80RequestThrottle(SimpleRateThrottle):
    """
    Enforces a strict 80-request daily limiter on Django REST APIs.
    Identifies authenticated users by user ID, and anonymous callers by IP address.
    """
    scope = "daily_80"
    rate = "80/day"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = f"user_{request.user.pk}"
        else:
            ident = f"ip_{self.get_ident(request)}"

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }
