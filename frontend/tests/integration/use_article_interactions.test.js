import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useArticleInteractions } from '../../src/hooks/useArticleInteractions.js';
import * as apiModule from '../../src/lib/api.js';

describe('TICKET INT-4: Optimistic Interactions with Guaranteed Snapshot Rollback', () => {
  const sampleArticles = [
    {
      id: 'art-101',
      title: 'Autonomous System Sovereignty',
      is_bookmarked: false,
      is_read: false,
    },
    {
      id: 'art-102',
      title: 'Semiconductor Foundry Acceleration',
      is_bookmarked: true,
      is_read: true,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('optimistically toggles bookmark state to true immediately and persists on success', async () => {
    let apiEndpointCalled = null;
    vi.spyOn(apiModule, 'api').mockImplementation(async (endpoint) => {
      apiEndpointCalled = endpoint;
      return { status: 'bookmarked' };
    });

    const { result } = renderHook(() =>
      useArticleInteractions({ initialArticles: sampleArticles })
    );

    expect(result.current.articles[0].is_bookmarked).toBe(false);

    await act(async () => {
      await result.current.toggleBookmark('art-101');
    });

    expect(result.current.articles[0].is_bookmarked).toBe(true);
    expect(apiEndpointCalled).toBe('/api/v1/news/bookmarks');
    expect(result.current.errorToast).toBeNull();
  });

  it('rolls back optimistic bookmark toggle and triggers Swiss error toast when network fails', async () => {
    let rejectRequest;
    const pendingPromise = new Promise((_resolve, reject) => {
      rejectRequest = reject;
    });

    vi.spyOn(apiModule, 'api').mockImplementation(() => pendingPromise);

    const { result } = renderHook(() =>
      useArticleInteractions({ initialArticles: sampleArticles })
    );

    expect(result.current.articles[0].is_bookmarked).toBe(false);

    // 1. Dispatch toggle
    let interactionPromise;
    act(() => {
      interactionPromise = result.current.toggleBookmark('art-101');
    });

    // 2. Immediate optimistic UI assertion
    expect(result.current.articles[0].is_bookmarked).toBe(true);

    // 3. Network drop happens mid-flight
    act(() => {
      rejectRequest(new TypeError('Failed to fetch'));
    });

    await act(async () => {
      try {
        await interactionPromise;
      } catch {
        // Expected network drop
      }
    });

    // 4. Guaranteed Snapshot Rollback
    expect(result.current.articles[0].is_bookmarked).toBe(false);

    // 5. Swiss Error Toast Verification
    expect(result.current.errorToast).toBe('ACTION ABORTED // UNABLE TO REACH SERVER');
  });

  it('rolls back optimistic remove-bookmark toggle when backend returns HTTP error', async () => {
    vi.spyOn(apiModule, 'api').mockRejectedValueOnce({
      status: 500,
      code: 'HTTP_5xx',
      detail: 'Internal Server Error',
    });

    const { result } = renderHook(() =>
      useArticleInteractions({ initialArticles: sampleArticles })
    );

    // art-102 is initially bookmarked
    expect(result.current.articles[1].is_bookmarked).toBe(true);

    await act(async () => {
      try {
        await result.current.toggleBookmark('art-102');
      } catch {
        // expected
      }
    });

    // Guaranteed rollback to true
    expect(result.current.articles[1].is_bookmarked).toBe(true);
    expect(result.current.errorToast).toBe('ACTION ABORTED // UNABLE TO REACH SERVER');
  });

  it('optimistically toggles read state immediately and persists on success', async () => {
    let apiEndpointCalled = null;
    vi.spyOn(apiModule, 'api').mockImplementation(async (endpoint) => {
      apiEndpointCalled = endpoint;
      return { status: 'marked_read' };
    });

    const { result } = renderHook(() =>
      useArticleInteractions({ initialArticles: sampleArticles })
    );

    expect(result.current.articles[0].is_read).toBe(false);

    await act(async () => {
      await result.current.toggleRead('art-101');
    });

    expect(result.current.articles[0].is_read).toBe(true);
    expect(apiEndpointCalled).toBe('/api/v1/news/reads');
    expect(result.current.errorToast).toBeNull();
  });

  it('rolls back optimistic read toggle when network connection fails', async () => {
    vi.spyOn(apiModule, 'api').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { result } = renderHook(() =>
      useArticleInteractions({ initialArticles: sampleArticles })
    );

    expect(result.current.articles[0].is_read).toBe(false);

    await act(async () => {
      try {
        await result.current.toggleRead('art-101');
      } catch {
        // expected
      }
    });

    // Guaranteed rollback to false
    expect(result.current.articles[0].is_read).toBe(false);
    expect(result.current.errorToast).toBe('ACTION ABORTED // UNABLE TO REACH SERVER');
  });

  it('debounces rapid sequential clicks on the same article to prevent double submission', async () => {
    let callCount = 0;
    vi.spyOn(apiModule, 'api').mockImplementation(async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { status: 'bookmarked' };
    });

    const { result } = renderHook(() =>
      useArticleInteractions({ initialArticles: sampleArticles })
    );

    // Rapid double-click while socket is lagging
    act(() => {
      result.current.toggleBookmark('art-101');
      result.current.toggleBookmark('art-101');
    });

    await waitFor(() => {
      expect(result.current.articles[0].is_bookmarked).toBe(true);
    });

    // Invariant: Second click was debounced/locked, fetch called strictly ONCE
    expect(callCount).toBe(1);
  });

  it('supports integration mode with external articles and setArticles state', async () => {
    let externalArticles = [...sampleArticles];
    const mockSetArticles = vi.fn((updater) => {
      if (typeof updater === 'function') {
        externalArticles = updater(externalArticles);
      } else {
        externalArticles = updater;
      }
    });

    vi.spyOn(apiModule, 'api').mockRejectedValueOnce(new TypeError('Network dropped'));

    const { result } = renderHook(() =>
      useArticleInteractions({
        articles: externalArticles,
        setArticles: mockSetArticles,
      })
    );

    await act(async () => {
      try {
        await result.current.toggleBookmark('art-101');
      } catch {
        // expected
      }
    });

    // 1st call: optimistic update
    expect(mockSetArticles).toHaveBeenCalledTimes(2);
    // Final state rolled back
    expect(result.current.errorToast).toBe('ACTION ABORTED // UNABLE TO REACH SERVER');
  });

  it('allows manual dismissal of error toast via clearToast', () => {
    const { result } = renderHook(() =>
      useArticleInteractions({ initialArticles: sampleArticles })
    );

    act(() => {
      result.current.setErrorToast('ACTION ABORTED // UNABLE TO REACH SERVER');
    });

    expect(result.current.errorToast).toBe('ACTION ABORTED // UNABLE TO REACH SERVER');

    act(() => {
      result.current.clearToast();
    });

    expect(result.current.errorToast).toBeNull();
  });
});
