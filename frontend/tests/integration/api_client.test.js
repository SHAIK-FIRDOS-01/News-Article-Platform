import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ERROR_CODES } from '../../src/lib/api.js';

describe('TICKET INT-1: Resilient Native HTTP Client & Cloudflare Handshake Guard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('executes successful GET request with credentials: "include" and parses JSON payload', async () => {
    const mockData = { status: 'operational', version: '1.0.0' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockData,
    });

    const result = await api('/api/v1/health');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, config] = fetch.mock.calls[0];
    expect(url).toBe('/api/v1/health');
    expect(config.credentials).toBe('include');
    expect(result).toEqual(mockData);
  });

  it('automatically aborts request after 8000ms timeout and throws error with code NETWORK_TIMEOUT', async () => {
    vi.useFakeTimers();

    global.fetch = vi.fn().mockImplementation((_url, config) => {
      return new Promise((_resolve, reject) => {
        if (config.signal) {
          config.signal.addEventListener('abort', () => {
            const abortErr = new Error('The operation was aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        }
      });
    });

    const promise = api('/api/v1/news/feed');

    vi.advanceTimersByTime(8000);

    await expect(promise).rejects.toMatchObject({
      code: ERROR_CODES.NETWORK_TIMEOUT,
    });
  });

  it('links external AbortSignal and aborts immediately when external controller triggers without waiting for 8000ms', async () => {
    const externalController = new AbortController();

    global.fetch = vi.fn().mockImplementation((_url, config) => {
      return new Promise((_resolve, reject) => {
        if (config.signal) {
          config.signal.addEventListener('abort', () => {
            const abortErr = new Error('User cancelled request');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        }
      });
    });

    const promise = api('/api/v1/news/feed', { signal: externalController.signal });

    externalController.abort(new Error('User cancelled request'));

    await expect(promise).rejects.toThrow('User cancelled request');
  });

  it('intercepts HTTP 401, queues concurrent failing requests, executes a single refresh call, and replays all queued requests', async () => {
    let refreshCallCount = 0;
    let feedAttempts = 0;
    let bookmarksAttempts = 0;

    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (url === '/api/v1/news/feed') {
        feedAttempts++;
        if (feedAttempts === 1) {
          return {
            ok: false,
            status: 401,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ detail: 'Token expired' }),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ feed: ['headline-1', 'headline-2'] }),
        };
      }

      if (url === '/api/v1/news/bookmarks') {
        bookmarksAttempts++;
        if (bookmarksAttempts === 1) {
          return {
            ok: false,
            status: 401,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ detail: 'Token expired' }),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ bookmarks: ['bm-1'] }),
        };
      }

      if (url === '/api/v1/auth/refresh') {
        refreshCallCount++;
        // Small delay to simulate async network handshake
        await new Promise((resolve) => setTimeout(resolve, 15));
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ status: 'refreshed' }),
        };
      }

      throw new Error(`Unexpected endpoint ${url}`);
    });

    const [feedRes, bookmarksRes] = await Promise.all([
      api('/api/v1/news/feed'),
      api('/api/v1/news/bookmarks'),
    ]);

    expect(feedRes).toEqual({ feed: ['headline-1', 'headline-2'] });
    expect(bookmarksRes).toEqual({ bookmarks: ['bm-1'] });
    // Invariant: Concurrent 401s trigger exactly ONE refresh request
    expect(refreshCallCount).toBe(1);
  });

  it('intercepts HTTP 401, queues concurrent requests, and throws HTTP_4xx when the refresh call fails', async () => {
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (url === '/api/v1/auth/refresh') {
        return {
          ok: false,
          status: 401,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ detail: 'Refresh token invalid or revoked' }),
        };
      }
      return {
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ detail: 'Session expired' }),
      };
    });

    const [feedResult, bookmarksResult] = await Promise.allSettled([
      api('/api/v1/news/feed'),
      api('/api/v1/news/bookmarks'),
    ]);

    expect(feedResult.status).toBe('rejected');
    expect(bookmarksResult.status).toBe('rejected');
    expect(feedResult.reason.status).toBe(401);
    expect(feedResult.reason.code).toBe(ERROR_CODES.HTTP_4XX);
    expect(bookmarksResult.reason.status).toBe(401);
    expect(bookmarksResult.reason.code).toBe(ERROR_CODES.HTTP_4XX);
  });

  it('intercepts HTTP 429 and extracts numeric Retry-After duration into error.retryAfter and error.code HTTP_4xx', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({
        'content-type': 'application/json',
        'Retry-After': '120',
      }),
      json: async () => ({ detail: 'Rate limit exceeded. Slow down.' }),
    });

    try {
      await api('/api/v1/news/feed');
      expect.fail('Should have thrown on 429');
    } catch (err) {
      expect(err.status).toBe(429);
      expect(err.retryAfter).toBe(120);
      expect(err.code).toBe(ERROR_CODES.HTTP_4XX);
      expect(err.detail).toContain('Rate limit exceeded');
    }
  });

  it('intercepts HTTP 429 and parses RFC-compliant HTTP-date Retry-After into error.retryAfter seconds', async () => {
    const futureDate = new Date(Date.now() + 45000).toUTCString();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({
        'content-type': 'application/json',
        'Retry-After': futureDate,
      }),
      json: async () => ({ detail: 'Too many requests' }),
    });

    try {
      await api('/api/v1/news/feed');
      expect.fail('Should have thrown on 429');
    } catch (err) {
      expect(err.status).toBe(429);
      expect(typeof err.retryAfter).toBe('number');
      expect(err.retryAfter).toBeGreaterThanOrEqual(40);
      expect(err.retryAfter).toBeLessThanOrEqual(50);
      expect(err.code).toBe(ERROR_CODES.HTTP_4XX);
    }
  });

  it('detects when client is offline before request dispatch and throws CLIENT_OFFLINE error', async () => {
    const originalOnLine = navigator.onLine;
    try {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      await expect(api('/api/v1/news/feed')).rejects.toMatchObject({
        code: ERROR_CODES.CLIENT_OFFLINE,
      });
    } finally {
      Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
    }
  });

  it('detects network drop / connection failure when client is online and classifies error as BACKEND_UNREACHABLE', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(api('/api/v1/news/feed')).rejects.toMatchObject({
      code: ERROR_CODES.BACKEND_UNREACHABLE,
    });
  });

  it('classifies HTTP 5xx responses with code HTTP_5xx', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ detail: 'Service Unavailable' }),
    });

    await expect(api('/api/v1/news/feed')).rejects.toMatchObject({
      status: 503,
      code: ERROR_CODES.HTTP_5XX,
    });
  });
});
