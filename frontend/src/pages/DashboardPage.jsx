import React, { useState, useEffect, useCallback } from 'react';
import { Masthead } from '../components/dashboard/Masthead.jsx';
import { CategoryFilter } from '../components/dashboard/CategoryFilter.jsx';
import { SearchBar } from '../components/dashboard/SearchBar.jsx';
import { LiveFeedBar } from '../components/dashboard/LiveFeedBar.jsx';
import { ArticleGrid } from '../components/dashboard/ArticleGrid.jsx';
import { BookmarksDrawer } from '../components/dashboard/BookmarksDrawer.jsx';
import { api } from '../lib/api.js';
import { API_ROUTES } from '../lib/constants.js';

const SAMPLE_DISPATCHES = [
  {
    id: 'art-001',
    title: 'GLOBAL REGULATORY COUNCIL CONVENES ON MONETARY SOVEREIGNTY AND ARTIFICIAL COGNITION',
    description: 'Member states establish strict structural boundaries for cross-border autonomous protocols amidst growing fiscal consolidation and geopolitical realignment.',
    url: 'https://signalreport.io/news/global-regulatory-council',
    image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    source: 'GLOBAL REGULATORY DESK',
    published_at: '3H AGO',
    category: 'BUSINESS',
    is_bookmarked: false,
    is_read: false,
    share_token: 'share-sample-01',
  },
  {
    id: 'art-002',
    title: 'ALGORITHMIC LIQUIDITY COMPRESSES SPREADS ACROSS CONTINENTAL EXCHANGES',
    description: 'High-density automated market making protocols recalibrate European sovereign debt spreads within sub-millisecond intervals.',
    url: 'https://signalreport.io/news/algorithmic-liquidity',
    image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
    source: 'GLOBAL FINANCIAL WIRE',
    published_at: '4H AGO',
    category: 'BUSINESS',
    is_bookmarked: true,
    is_read: false,
    share_token: 'share-sample-02',
  },
  {
    id: 'art-003',
    title: 'MARITIME FREIGHT RATES SURGE AS STRATEGIC STRAITS FACE NEW QUOTA PROTOCOLS',
    description: 'Deep-water logistics corridors enforce automated routing quotas, shifting bulk container transshipment schedules.',
    url: 'https://signalreport.io/news/maritime-freight',
    image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    source: 'GLOBAL TRADE DESK',
    published_at: '5H AGO',
    category: 'NATION',
    is_bookmarked: false,
    is_read: true,
    share_token: 'share-sample-03',
  },
  {
    id: 'art-004',
    title: 'SEMICONDUCTOR FOUNDRIES ACCELERATE EUV LITHOGRAPHY EXPANSION IN ASIA-PACIFIC',
    description: 'Next-generation 2nm node manufacturing facilities commence pilot production under bilateral technology security pacts.',
    url: 'https://signalreport.io/news/semiconductor-euv',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    source: 'TECH INTELLIGENCE WIRE',
    published_at: '6H AGO',
    category: 'TECHNOLOGY',
    is_bookmarked: false,
    is_read: false,
    share_token: 'share-sample-04',
  },
  {
    id: 'art-005',
    title: 'DISTRIBUTED ENERGY GRIDS INTEGRATE REAL-TIME FREQUENCY REGULATION PROTOCOLS',
    description: 'Renewable power networks stabilize transmission loads utilizing decentralized battery storage reserves.',
    url: 'https://signalreport.io/news/energy-grids',
    image_url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80',
    source: 'SIGNALREPORT ENERGY WIRE',
    published_at: '7H AGO',
    category: 'GENERAL',
    is_bookmarked: false,
    is_read: false,
    share_token: 'share-sample-05',
  },
];

/**
 * Main Editorial Dashboard Page.
 * Conforms to Ponytail Ultra: native React hooks, standard Web APIs, zero state machine bloat.
 *
 * @param {object} props
 * @param {object|string} [props.user] - Current authenticated user
 * @param {() => void} [props.onLogout] - Logout handler
 * @param {(token: string) => void} [props.onSelectShareToken] - Share view router callback
 */
export function DashboardPage({ user, onLogout, onSelectShareToken }) {
  const [articles, setArticles] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);

  // Search & Live Feed telemetry states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchOrigin, setSearchOrigin] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [quota, setQuota] = useState({
    service: 'gnews',
    daily_limit: 80,
    used_today: 0,
    remaining: 80,
  });

  const fetchQuota = useCallback(async () => {
    try {
      const data = await api(API_ROUTES.NEWS.QUOTA);
      if (data && typeof data.daily_limit === 'number') {
        setQuota(data);
      }
    } catch {
      // Default to 80-call baseline
      setQuota({ service: 'gnews', daily_limit: 80, used_today: 0, remaining: 80 });
    }
  }, []);

  const fetchFeed = useCallback(async (category = 'ALL', reset = true) => {
    setIsLoading(true);
    try {
      const categoryParam = category === 'ALL' ? '' : `&category=${category.toLowerCase()}`;
      const data = await api(`${API_ROUTES.NEWS.FEED}?limit=10${categoryParam}`);
      let fetchedArticles = data?.items || data?.articles || (Array.isArray(data) ? data : []);
      if (fetchedArticles.length === 0) {
        const filtered = category === 'ALL'
          ? SAMPLE_DISPATCHES
          : SAMPLE_DISPATCHES.filter((a) => a.category.toUpperCase() === category.toUpperCase());
        fetchedArticles = filtered;
      }
      setArticles(fetchedArticles);
      setHasMore(Boolean(data?.has_more));
      setCursor(data?.next_cursor || null);
      setLastUpdated(new Date());
      setSearchOrigin(null);
    } catch {
      // Offline fallback for preview mode
      const filtered = category === 'ALL'
        ? SAMPLE_DISPATCHES
        : SAMPLE_DISPATCHES.filter((a) => a.category.toUpperCase() === category.toUpperCase());
      setArticles(filtered);
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const executeSearch = useCallback(async (query, category = activeCategory) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchQuery('');
      setSearchOrigin(null);
      fetchFeed(category);
      return;
    }

    setIsSearching(true);
    try {
      const categoryParam = category === 'ALL' ? '' : `&category=${category.toLowerCase()}`;
      const data = await api(`${API_ROUTES.NEWS.SEARCH}?q=${encodeURIComponent(trimmed)}${categoryParam}&limit=20`);
      const searchItems = data?.items || data?.articles || (Array.isArray(data) ? data : []);
      if (searchItems.length > 0) {
        setArticles(searchItems);
        setSearchOrigin(data?.origin || 'BACKEND');
      } else {
        // Fallback filter locally
        const lower = trimmed.toLowerCase();
        const localMatches = SAMPLE_DISPATCHES.filter((a) => {
          const catMatch = category === 'ALL' || a.category.toUpperCase() === category.toUpperCase();
          const queryMatch =
            a.title.toLowerCase().includes(lower) ||
            a.description.toLowerCase().includes(lower) ||
            a.source.toLowerCase().includes(lower);
          return catMatch && queryMatch;
        });
        setArticles(localMatches);
        setSearchOrigin('OFFLINE_INDEX');
      }
      setHasMore(false);
      setCursor(null);
    } catch {
      const lower = trimmed.toLowerCase();
      const localMatches = SAMPLE_DISPATCHES.filter((a) => {
        const catMatch = category === 'ALL' || a.category.toUpperCase() === category.toUpperCase();
        const queryMatch =
          a.title.toLowerCase().includes(lower) ||
          a.description.toLowerCase().includes(lower) ||
          a.source.toLowerCase().includes(lower);
        return catMatch && queryMatch;
      });
      setArticles(localMatches);
      setSearchOrigin('OFFLINE_INDEX');
      setHasMore(false);
      setCursor(null);
    } finally {
      setIsSearching(false);
    }
  }, [activeCategory, fetchFeed]);

  // Debounced search handler
  useEffect(() => {
    if (!searchQuery) return;
    const timeout = setTimeout(() => {
      executeSearch(searchQuery, activeCategory);
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery, activeCategory, executeSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchOrigin(null);
    fetchFeed(activeCategory);
  }, [activeCategory, fetchFeed]);

  const fetchBookmarks = useCallback(async () => {
    try {
      const data = await api(API_ROUTES.NEWS.BOOKMARKS);
      setBookmarks(data?.items || data?.bookmarks || (Array.isArray(data) ? data : []));
    } catch {
      setBookmarks(SAMPLE_DISPATCHES.filter((a) => a.is_bookmarked));
    }
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      fetchFeed(activeCategory);
    }
    fetchBookmarks();
    fetchQuota();
  }, [activeCategory, searchQuery, fetchFeed, fetchBookmarks, fetchQuota]);

  // Auto-sync polling every 60s
  useEffect(() => {
    if (!autoRefresh || searchQuery) return;
    const interval = setInterval(() => {
      fetchFeed(activeCategory, false);
      fetchQuota();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, searchQuery, activeCategory, fetchFeed, fetchQuota]);


  async function handleToggleBookmark(article) {
    const isCurrentlyBookmarked = Boolean(article.is_bookmarked);
    // Optimistic toggle
    setArticles((prev) =>
      prev.map((a) => (a.id === article.id ? { ...a, is_bookmarked: !isCurrentlyBookmarked } : a))
    );

    try {
      if (isCurrentlyBookmarked) {
        await api(`${API_ROUTES.NEWS.BOOKMARKS}/${article.id}`, { method: 'DELETE' });
        setBookmarks((prev) => prev.filter((b) => b.id !== article.id));
      } else {
        await api(API_ROUTES.NEWS.BOOKMARKS, {
          method: 'POST',
          body: { article_id: article.id },
        });
        setBookmarks((prev) => [...prev, { ...article, is_bookmarked: true }]);
      }
    } catch {
      // Revert on error
      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, is_bookmarked: isCurrentlyBookmarked } : a))
      );
    }
  }

  async function handleToggleRead(article) {
    const isCurrentlyRead = Boolean(article.is_read);
    setArticles((prev) =>
      prev.map((a) => (a.id === article.id ? { ...a, is_read: !isCurrentlyRead } : a))
    );

    try {
      if (isCurrentlyRead) {
        await api(`${API_ROUTES.NEWS.READS}/${article.id}`, { method: 'DELETE' });
      } else {
        await api(API_ROUTES.NEWS.READS, {
          method: 'POST',
          body: { article_id: article.id },
        });
      }
    } catch {
      // Revert on error
      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, is_read: isCurrentlyRead } : a))
      );
    }
  }

  function handleShare(article) {
    const token = article.share_token || article.id;
    if (typeof onSelectShareToken === 'function') {
      onSelectShareToken(token);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
    }
  }

  async function handleLoadMore() {
    if (!cursor) return;
    try {
      const categoryParam = activeCategory === 'ALL' ? '' : `&category=${activeCategory.toLowerCase()}`;
      const data = await api(`${API_ROUTES.NEWS.FEED}?limit=10&cursor=${cursor}${categoryParam}`);
      const moreArticles = data?.items || data?.articles || (Array.isArray(data) ? data : []);
      setArticles((prev) => [...prev, ...moreArticles]);
      setHasMore(Boolean(data?.has_more));
      setCursor(data?.next_cursor || null);
    } catch {
      setHasMore(false);
    }
  }

  return (
    <div className="min-h-screen bg-swiss-white flex flex-col">
      <Masthead
        user={user}
        onLogout={onLogout}
        onOpenBookmarks={() => setIsDrawerOpen(true)}
        bookmarkCount={bookmarks.length}
      />

      <main className="max-w-7xl w-full mx-auto px-4 py-6 flex flex-col space-y-6 flex-1">
        <LiveFeedBar
          isRefreshing={isLoading || isSearching}
          onRefresh={() => {
            if (searchQuery) {
              executeSearch(searchQuery, activeCategory);
            } else {
              fetchFeed(activeCategory);
            }
            fetchQuota();
          }}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={setAutoRefresh}
          lastUpdated={lastUpdated}
          quota={quota}
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <CategoryFilter
            activeCategory={activeCategory}
            onSelectCategory={(cat) => {
              setActiveCategory(cat);
              if (searchQuery) {
                executeSearch(searchQuery, cat);
              }
            }}
            className="flex-1"
          />
        </div>

        <SearchBar
          query={searchQuery}
          onSearch={(val) => setSearchQuery(val)}
          onClear={handleClearSearch}
          resultCount={articles.length}
          isLoading={isSearching}
          origin={searchOrigin}
        />

        <ArticleGrid
          articles={articles}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          onToggleBookmark={handleToggleBookmark}
          onToggleRead={handleToggleRead}
          onShare={handleShare}
        />
      </main>

      <BookmarksDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        bookmarks={bookmarks}
        onRemoveBookmark={(id) => {
          setBookmarks((prev) => prev.filter((b) => b.id !== id));
          setArticles((prev) =>
            prev.map((a) => (a.id === id ? { ...a, is_bookmarked: false } : a))
          );
        }}
      />
    </div>
  );
}
