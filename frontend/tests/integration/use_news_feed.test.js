import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNewsFeed } from '../../src/hooks/useNewsFeed.js';
import * as apiModule from '../../src/lib/api.js';

describe('TICKET INT-3: Race-Condition-Free Search & Category Query Hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches category feed with AbortSignal and populates articles and pagination', async () => {
    const mockArticles = [{ id: 'art-tech-1', title: 'Tech Innovation' }];
    vi.spyOn(apiModule, 'api').mockImplementation(async (_endpoint, options) => {
      expect(options.signal).toBeDefined();
      expect(options.signal instanceof AbortSignal).toBe(true);
      return {
        articles: mockArticles,
        has_more: true,
        next_cursor: 'cur-step-2',
      };
    });

    const { result } = renderHook(() => useNewsFeed({ category: 'TECHNOLOGY' }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.articles).toEqual(mockArticles);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.cursor).toBe('cur-step-2');
    expect(result.current.error).toBeNull();
  });

  it('cancels in-flight category request when category changes before response', async () => {
    const signals = [];

    vi.spyOn(apiModule, 'api').mockImplementation((endpoint, options) => {
      signals.push({ endpoint, signal: options.signal });
      if (endpoint.includes('category=business')) {
        return Promise.resolve({
          articles: [{ id: 'biz-1', title: 'Business Wire' }],
          has_more: false,
        });
      }
      // Technology response is delayed
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            articles: [{ id: 'tech-1', title: 'Tech Wire' }],
            has_more: false,
          });
        }, 100);
      });
    });

    const { result, rerender } = renderHook(
      ({ category }) => useNewsFeed({ category }),
      { initialProps: { category: 'TECHNOLOGY' } }
    );

    // Rapid switch to BUSINESS before TECHNOLOGY resolves
    rerender({ category: 'BUSINESS' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Invariant: Technology signal was aborted
    expect(signals[0].endpoint).toContain('category=technology');
    expect(signals[0].signal.aborted).toBe(true);

    // Business wire was accepted
    expect(result.current.articles).toEqual([{ id: 'biz-1', title: 'Business Wire' }]);
  });

  it('cancels in-flight search requests upon rapid query changes ("M", "Mod", "Modi") preventing race conditions', async () => {
    const interceptedSignals = {};

    vi.spyOn(apiModule, 'api').mockImplementation((endpoint, options) => {
      const url = new URL(endpoint, 'http://localhost');
      const query = url.searchParams.get('q');
      interceptedSignals[query] = options.signal;

      if (query === 'M') {
        // Slowest response (120ms)
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ articles: [{ id: 'm-1', title: 'M Stale Result' }] });
          }, 120);
        });
      }

      if (query === 'Mod') {
        // Medium response (80ms)
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ articles: [{ id: 'mod-1', title: 'Mod Stale Result' }] });
          }, 80);
        });
      }

      if (query === 'Modi') {
        // Fastest response (20ms)
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ articles: [{ id: 'modi-1', title: 'Modi Final Result' }], origin: 'UPSTREAM' });
          }, 20);
        });
      }

      return Promise.resolve({ articles: [] });
    });

    const { result, rerender } = renderHook(
      ({ query }) => useNewsFeed({ query }),
      { initialProps: { query: 'M' } }
    );

    // Rapid keystroke simulation
    rerender({ query: 'Mod' });
    rerender({ query: 'Modi' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.articles).toHaveLength(1);
    });

    // Verify earlier requests were aborted
    expect(interceptedSignals['M'].aborted).toBe(true);
    expect(interceptedSignals['Mod'].aborted).toBe(true);
    expect(interceptedSignals['Modi'].aborted).toBe(false);

    // Verify only the final query results populate state
    expect(result.current.articles).toEqual([{ id: 'modi-1', title: 'Modi Final Result' }]);
    expect(result.current.searchOrigin).toBe('UPSTREAM');
  });

  it('silently ignores AbortError on unmount without setting error state', async () => {
    let capturedSignal;
    vi.spyOn(apiModule, 'api').mockImplementation((_endpoint, options) => {
      capturedSignal = options.signal;
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const abortErr = new Error('The user aborted a request.');
          abortErr.name = 'AbortError';
          reject(abortErr);
        });
      });
    });

    const { result, unmount } = renderHook(() => useNewsFeed({ category: 'ALL' }));

    expect(result.current.isLoading).toBe(true);

    unmount();

    expect(capturedSignal.aborted).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('executes 2-stage exponential backoff retry on transient GET failures before succeeding', async () => {
    let callCount = 0;
    vi.spyOn(apiModule, 'api').mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        const netErr = new Error('Network error');
        netErr.code = 'BACKEND_UNREACHABLE';
        throw netErr;
      }
      return {
        articles: [{ id: 'retry-success', title: 'Retried Headline' }],
        has_more: false,
      };
    });

    // Provide small retryBaseDelay for rapid test execution
    const { result } = renderHook(() =>
      useNewsFeed({ category: 'ALL', retryBaseDelay: 20 })
    );

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 3000 }
    );

    // Invariant: Initial attempt + 2 retries = 3 total calls
    expect(callCount).toBe(3);
    expect(result.current.articles).toEqual([{ id: 'retry-success', title: 'Retried Headline' }]);
    expect(result.current.error).toBeNull();
  });

  it('exhausts 2-stage retry and sets error state when all attempts fail', async () => {
    let callCount = 0;
    vi.spyOn(apiModule, 'api').mockImplementation(async () => {
      callCount++;
      const err = new Error('500 Internal Server Error');
      err.code = 'HTTP_5xx';
      err.status = 500;
      throw err;
    });

    const { result } = renderHook(() =>
      useNewsFeed({ category: 'ALL', retryBaseDelay: 10 })
    );

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 2000 }
    );

    expect(callCount).toBe(3); // 1 initial + 2 retries
    expect(result.current.articles).toEqual([]);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error.code).toBe('HTTP_5xx');
  });

  it('supports loadMore pagination using cursor without resetting existing articles', async () => {
    let page = 1;
    vi.spyOn(apiModule, 'api').mockImplementation(async (endpoint) => {
      if (endpoint.includes('cursor=')) {
        return {
          articles: [{ id: 'page-2-item', title: 'Page 2 Headline' }],
          has_more: false,
          next_cursor: null,
        };
      }
      return {
        articles: [{ id: 'page-1-item', title: 'Page 1 Headline' }],
        has_more: true,
        next_cursor: 'cursor-token-xyz',
      };
    });

    const { result } = renderHook(() => useNewsFeed({ category: 'ALL' }));

    await waitFor(() => {
      expect(result.current.articles).toHaveLength(1);
    });

    expect(result.current.hasMore).toBe(true);
    expect(result.current.cursor).toBe('cursor-token-xyz');

    // Load next page
    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.articles).toEqual([
      { id: 'page-1-item', title: 'Page 1 Headline' },
      { id: 'page-2-item', title: 'Page 2 Headline' },
    ]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.cursor).toBeNull();
  });
});
