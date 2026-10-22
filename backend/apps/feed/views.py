"""
DRF Views for SignalReport news feed, search, bookmarks, reads, and sharing.
Replaces: backend/app/api/v1/routes_feed.py, routes_bookmarks.py, routes_reads.py, routes_search.py, routes_share.py
Ponytail: Uses standard DRF ListAPIView and APIView with native querysets and pagination.
Security-audit: IDOR defense on bookmarks/reads (always filtered by request.user, 404 on unowned objects), input validation on search endpoints.
"""

import hashlib
from django.db import transaction
from django.db.models import Q, Prefetch
from django.http import Http404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Article, Bookmark, ArticleRead
from .serializers import (
    ArticleSerializer,
    BookmarkSerializer,
    ArticleReadSerializer,
)
from .pagination import StandardFeedPagination



class FeedView(generics.ListAPIView):
    """
    Serves paginated news articles ordered newest first.
    Supports optional category filtering.
    For authenticated users, dynamically annotates is_bookmarked and is_read without N+1 queries.
    Endpoints: GET /api/v1/feed/, GET /api/v1/news/feed/
    """
    serializer_class = ArticleSerializer
    pagination_class = StandardFeedPagination
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Article.objects.all().order_by("-published_at")

        category = self.request.query_params.get("category")
        if category and category.upper() != "ALL":
            qs = qs.filter(category=category.lower().strip())

        search_query = self.request.query_params.get("search") or self.request.query_params.get("q")
        if search_query:
            term = search_query.strip()
            qs = qs.filter(
                Q(title__icontains=term)
                | Q(description__icontains=term)
                | Q(content__icontains=term)
                | Q(source_name__icontains=term)
            )

        if self.request.user and self.request.user.is_authenticated:
            qs = qs.prefetch_related(
                Prefetch("bookmarked_by", queryset=Bookmark.objects.filter(user=self.request.user)),
                Prefetch("read_by", queryset=ArticleRead.objects.filter(user=self.request.user)),
            )

        return qs


class BookmarkListCreateView(APIView):
    """
    Lists authenticated user's bookmarks (GET) or creates a bookmark via JSON body (POST).
    Endpoints: GET/POST /api/v1/news/bookmarks/, GET /api/v1/bookmarks/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = (
            Bookmark.objects.filter(user=request.user)
            .select_related("article")
            .prefetch_related(
                Prefetch("article__read_by", queryset=ArticleRead.objects.filter(user=request.user))
            )
            .order_by("-created_at")
        )
        paginator = StandardFeedPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = BookmarkSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        article_id = request.data.get("article_id")
        if not article_id:
            return Response(
                {"detail": "article_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        article = Article.objects.filter(id=article_id).first()
        if not article:
            raise Http404("Article not found.")

        existing = Bookmark.objects.filter(user=request.user, article_id=article_id).first()
        if existing:
            return Response(
                {
                    "bookmarked": True,
                    "article_id": article_id,
                    "message": "Article already bookmarked.",
                },
                status=status.HTTP_200_OK,
            )

        Bookmark.objects.create(user=request.user, article=article)
        return Response(
            {
                "bookmarked": True,
                "article_id": article_id,
                "message": "Article bookmarked successfully.",
            },
            status=status.HTTP_200_OK,
        )


class ArticleBookmarkToggleView(APIView):
    """
    Idempotent bookmark toggle endpoint operating on article ID in the URL.
    Endpoints: POST /api/v1/articles/<id>/bookmark/, DELETE /api/v1/articles/<id>/bookmark/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, article_id):
        article = Article.objects.filter(id=article_id).first()
        if not article:
            raise Http404("Article not found.")

        bookmark, created = Bookmark.objects.get_or_create(user=request.user, article=article)
        message = "Article bookmarked successfully." if created else "Article already bookmarked."
        return Response(
            {
                "bookmarked": True,
                "article_id": article_id,
                "message": message,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, article_id):
        article = Article.objects.filter(id=article_id).first()
        if not article:
            raise Http404("Article not found.")

        deleted_count, _ = Bookmark.objects.filter(user=request.user, article_id=article_id).delete()
        if deleted_count > 0:
            return Response(
                {
                    "bookmarked": False,
                    "article_id": article_id,
                    "message": "Article bookmark removed successfully.",
                },
                status=status.HTTP_200_OK,
            )
        return Response(
            {
                "bookmarked": False,
                "article_id": article_id,
                "message": "Article was not bookmarked.",
            },
            status=status.HTTP_200_OK,
        )


class BookmarkDetailDeleteView(APIView):
    """
    Inspects or deletes a private bookmark enforcing compound ownership:
    WHERE (bookmark.id = :id OR bookmark.article_id = :id) AND bookmark.user_id = :user.id.
    Strictly raises HTTP 404 (never 403) to prevent ID enumeration probing.
    Endpoints: GET/DELETE /api/v1/news/bookmarks/<id>/
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, user, bookmark_id):
        bookmark = (
            Bookmark.objects.filter(
                Q(id=bookmark_id) | Q(article_id=bookmark_id),
                user=user,
            )
            .select_related("article")
            .prefetch_related(
                Prefetch("article__read_by", queryset=ArticleRead.objects.filter(user=user))
            )
            .first()
        )
        if not bookmark:
            raise Http404("Bookmark not found.")
        return bookmark

    def get(self, request, id):
        bookmark = self.get_object(request.user, id)
        serializer = BookmarkSerializer(bookmark, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, id):
        bookmark = self.get_object(request.user, id)
        article_id = bookmark.article_id
        bookmark.delete()
        return Response(
            {
                "bookmarked": False,
                "article_id": article_id,
                "message": "Article bookmark removed successfully.",
            },
            status=status.HTTP_200_OK,
        )


class ReadListCreateView(APIView):
    """
    Lists authenticated user's read history (GET) or marks an article as read (POST).
    Endpoint: GET/POST /api/v1/news/reads/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = (
            ArticleRead.objects.filter(user=request.user)
            .select_related("article")
            .prefetch_related(
                Prefetch("article__bookmarked_by", queryset=Bookmark.objects.filter(user=request.user))
            )
            .order_by("-read_at")
        )
        paginator = StandardFeedPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = ArticleReadSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        article_id = request.data.get("article_id")
        if not article_id:
            return Response(
                {"detail": "article_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        article = Article.objects.filter(id=article_id).first()
        if not article:
            raise Http404("Article not found.")

        existing = ArticleRead.objects.filter(user=request.user, article_id=article_id).first()
        if existing:
            return Response(
                {
                    "read": True,
                    "article_id": article_id,
                    "message": "Article already marked as read.",
                },
                status=status.HTTP_200_OK,
            )

        ArticleRead.objects.create(user=request.user, article=article)
        return Response(
            {
                "read": True,
                "article_id": article_id,
                "message": "Article marked as read.",
            },
            status=status.HTTP_200_OK,
        )


class ArticleReadToggleView(APIView):
    """
    Marks an article as read (POST) or unread (DELETE) for authenticated users.
    Endpoints: POST/DELETE /api/v1/articles/<id>/read/, POST/DELETE /api/v1/news/articles/<id>/read/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, article_id):
        article = Article.objects.filter(id=article_id).first()
        if not article:
            raise Http404("Article not found.")

        read_record, created = ArticleRead.objects.get_or_create(user=request.user, article=article)
        message = "Article marked as read." if created else "Article already marked as read."
        return Response(
            {
                "read": True,
                "article_id": article_id,
                "message": message,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, article_id):
        article = Article.objects.filter(id=article_id).first()
        if not article:
            raise Http404("Article not found.")

        deleted_count, _ = ArticleRead.objects.filter(user=request.user, article_id=article_id).delete()
        if deleted_count > 0:
            return Response(
                {
                    "read": False,
                    "article_id": article_id,
                    "message": "Article marked as unread.",
                },
                status=status.HTTP_200_OK,
            )
        return Response(
            {
                "read": False,
                "article_id": article_id,
                "message": "Article was not marked as read.",
            },
            status=status.HTTP_200_OK,
        )


class ReadDeleteView(APIView):
    """
    Deletes read status for an article via DELETE /api/v1/news/reads/<article_id>/.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, article_id):
        deleted_count, _ = ArticleRead.objects.filter(user=request.user, article_id=article_id).delete()
        if deleted_count > 0:
            return Response(
                {
                    "read": False,
                    "article_id": article_id,
                    "message": "Article marked as unread.",
                },
                status=status.HTTP_200_OK,
            )
        return Response(
            {
                "read": False,
                "article_id": article_id,
                "message": "Article was not marked as read.",
            },
            status=status.HTTP_200_OK,
        )


class ShareArticleView(APIView):
    """
    Resolves a publicly accessible shared article via its unique cryptographically secure share_token.
    If accessed by an authenticated user, annotates personal bookmark and read statuses.
    Endpoint: GET /api/v1/news/share/<share_token>/
    """
    permission_classes = [AllowAny]

    def get(self, request, share_token):
        clean_token = share_token.strip()
        qs = Article.objects.filter(share_token=clean_token)
        if request.user and request.user.is_authenticated:
            qs = qs.prefetch_related(
                Prefetch("bookmarked_by", queryset=Bookmark.objects.filter(user=request.user)),
                Prefetch("read_by", queryset=ArticleRead.objects.filter(user=request.user)),
            )

        article = qs.first()
        if not article:
            raise Http404("Shared article not found.")

        serializer = ArticleSerializer(article, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class HealthCheckView(APIView):
    """
    Basic system operational health check endpoint.
    Endpoint: GET /health/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "healthy"}, status=status.HTTP_200_OK)


class SearchView(generics.ListAPIView):
    """
    Full-text and keyword search endpoint for news articles.
    Supports query parameters: 'q' or 'search', and optional 'category'.
    Returns paginated search results with annotated bookmark and read flags.
    Endpoints: GET /api/v1/news/search/, GET /api/v1/search/
    """
    serializer_class = ArticleSerializer
    pagination_class = StandardFeedPagination
    permission_classes = [AllowAny]

    def get_queryset(self):
        query = (self.request.query_params.get("q") or self.request.query_params.get("search") or "").strip()
        category = self.request.query_params.get("category")

        qs = Article.objects.all().order_by("-published_at")

        if category and category.upper() != "ALL":
            qs = qs.filter(category=category.lower().strip())

        if query:
            qs = qs.filter(
                Q(title__icontains=query)
                | Q(description__icontains=query)
                | Q(content__icontains=query)
                | Q(source_name__icontains=query)
            )

        if self.request.user and self.request.user.is_authenticated:
            qs = qs.prefetch_related(
                Prefetch("bookmarked_by", queryset=Bookmark.objects.filter(user=self.request.user)),
                Prefetch("read_by", queryset=ArticleRead.objects.filter(user=self.request.user)),
            )

        return qs


class QuotaStatusView(APIView):
    """
    Inspects live metrics for the 80-call daily request limiter.
    Audits outbound news ingestion calls in the last 24 hours against the daily quota budget.
    Endpoints: GET /api/v1/news/quota/, GET /api/v1/quota/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone
        from django.conf import settings
        from apps.ingestion.models import APICallLog

        now = timezone.now()
        day_ago = now - timedelta(hours=24)
        daily_limit = getattr(settings, "GNEWS_MAX_DAILY_CALLS", 80)

        # Count API calls logged within the rolling 24-hour window
        used_today = APICallLog.objects.filter(service="gnews", timestamp__gte=day_ago).count()
        remaining = max(0, daily_limit - used_today)

        # Check circuit breaker status (429 within past 6 hours)
        six_hours_ago = now - timedelta(hours=6)
        circuit_breaker = APICallLog.objects.filter(
            service="gnews", status_code=429, timestamp__gte=six_hours_ago
        ).exists()

        status_text = "PAUSED_429" if circuit_breaker else ("EXHAUSTED" if remaining == 0 else "HEALTHY")

        return Response({
            "service": "gnews",
            "daily_limit": daily_limit,
            "used_today": used_today,
            "remaining": remaining,
            "circuit_breaker_active": circuit_breaker,
            "status": status_text,
            "window_hours": 24,
            "timestamp": now.isoformat(),
        }, status=status.HTTP_200_OK)

