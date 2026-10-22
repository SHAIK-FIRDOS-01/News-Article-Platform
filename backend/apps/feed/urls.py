"""
Feed, Search, Bookmark, Read, and Analysis URL routing.
"""

from django.urls import path
from .views import (
    FeedView,
    SearchView,
    QuotaStatusView,
    BookmarkListCreateView,
    BookmarkDetailDeleteView,
    ArticleBookmarkToggleView,
    ReadListCreateView,
    ArticleReadToggleView,
    ReadDeleteView,
    ShareArticleView,
)

app_name = "feed"

urlpatterns = [
    # Feed routes
    path("feed/", FeedView.as_view(), name="feed"),
    path("feed", FeedView.as_view(), name="feed-no-slash"),
    path("news/feed/", FeedView.as_view(), name="news-feed"),
    path("news/feed", FeedView.as_view(), name="news-feed-no-slash"),

    # Search routes
    path("news/search/", SearchView.as_view(), name="news-search"),
    path("news/search", SearchView.as_view(), name="news-search-no-slash"),
    path("search/", SearchView.as_view(), name="search"),
    path("search", SearchView.as_view(), name="search-no-slash"),

    # Quota monitoring routes (80-call daily request limiter)
    path("news/quota/", QuotaStatusView.as_view(), name="news-quota"),
    path("news/quota", QuotaStatusView.as_view(), name="news-quota-no-slash"),
    path("quota/", QuotaStatusView.as_view(), name="quota"),
    path("quota", QuotaStatusView.as_view(), name="quota-no-slash"),

    # Bookmark collection routes
    path("bookmarks/", BookmarkListCreateView.as_view(), name="bookmarks"),
    path("bookmarks", BookmarkListCreateView.as_view(), name="bookmarks-no-slash"),
    path("news/bookmarks/", BookmarkListCreateView.as_view(), name="news-bookmarks"),
    path("news/bookmarks", BookmarkListCreateView.as_view(), name="news-bookmarks-no-slash"),

    # Bookmark item routes (by id or article_id)
    path("bookmarks/<int:id>/", BookmarkDetailDeleteView.as_view(), name="bookmark-detail"),
    path("bookmarks/<int:id>", BookmarkDetailDeleteView.as_view(), name="bookmark-detail-no-slash"),
    path("news/bookmarks/<int:id>/", BookmarkDetailDeleteView.as_view(), name="news-bookmark-detail"),
    path("news/bookmarks/<int:id>", BookmarkDetailDeleteView.as_view(), name="news-bookmark-detail-no-slash"),

    # Article bookmark toggle routes
    path("articles/<int:article_id>/bookmark/", ArticleBookmarkToggleView.as_view(), name="article-bookmark"),
    path("articles/<int:article_id>/bookmark", ArticleBookmarkToggleView.as_view(), name="article-bookmark-no-slash"),
    path("news/articles/<int:article_id>/bookmark/", ArticleBookmarkToggleView.as_view(), name="news-article-bookmark"),
    path("news/articles/<int:article_id>/bookmark", ArticleBookmarkToggleView.as_view(), name="news-article-bookmark-no-slash"),

    # Read history collection routes
    path("reads/", ReadListCreateView.as_view(), name="reads"),
    path("reads", ReadListCreateView.as_view(), name="reads-no-slash"),
    path("news/reads/", ReadListCreateView.as_view(), name="news-reads"),
    path("news/reads", ReadListCreateView.as_view(), name="news-reads-no-slash"),

    # Read item delete routes
    path("reads/<int:article_id>/", ReadDeleteView.as_view(), name="read-detail"),
    path("reads/<int:article_id>", ReadDeleteView.as_view(), name="read-detail-no-slash"),
    path("news/reads/<int:article_id>/", ReadDeleteView.as_view(), name="news-read-detail"),
    path("news/reads/<int:article_id>", ReadDeleteView.as_view(), name="news-read-detail-no-slash"),

    # Article read toggle routes
    path("articles/<int:article_id>/read/", ArticleReadToggleView.as_view(), name="article-read"),
    path("articles/<int:article_id>/read", ArticleReadToggleView.as_view(), name="article-read-no-slash"),
    path("news/articles/<int:article_id>/read/", ArticleReadToggleView.as_view(), name="news-article-read"),
    path("news/articles/<int:article_id>/read", ArticleReadToggleView.as_view(), name="news-article-read-no-slash"),

    # Share token routes
    path("news/share/<str:share_token>/", ShareArticleView.as_view(), name="news-share-detail"),
    path("news/share/<str:share_token>", ShareArticleView.as_view(), name="news-share-detail-no-slash"),
    path("share/<str:share_token>/", ShareArticleView.as_view(), name="share-detail"),
    path("share/<str:share_token>", ShareArticleView.as_view(), name="share-detail-no-slash"),
]

