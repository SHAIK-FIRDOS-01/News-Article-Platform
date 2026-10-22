import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../../src/lib/api.js';

describe('TICKET 1.4: Base HTTP Client & Cookie Interceptor', () => {
  let getItemSpy;
  let setItemSpy;

  beforeEach(() => {
    vi.restoreAllMocks();
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('performs standard request with credentials: "include" and parses JSON response', async () => {
    const mockData = { status: 'healthy' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockData,
    });

    const result = await api('/health');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/health');
    expect(options.credentials).toBe('include');
    expect(result).toEqual(mockData);

    // Verify Zero Client-Side Token Storage Gate
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('serializes JSON body automatically when provided as object', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    });

    const payload = { email: 'vignelli@dispatch.ch', password: 'ValidPassword123!' };
    await api('/api/v1/auth/login', {
      method: 'POST',
      body: payload,
    });

    const [, options] = fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify(payload));
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('catches 401, invokes /api/v1/auth/refresh with credentials, and replays request on success', async () => {
    // 1st call: /api/v1/news/bookmarks -> 401
    // 2nd call: /api/v1/auth/refresh -> 200
    // 3rd call: /api/v1/news/bookmarks replay -> 200
    const finalData = { items: [{ id: 1, title: 'Replayed Item' }] };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ detail: 'Access token expired' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ status: 'refreshed' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => finalData,
      });

    const result = await api('/api/v1/news/bookmarks');

    expect(fetch).toHaveBeenCalledTimes(3);

    // Call 1: Original request
    expect(fetch.mock.calls[0][0]).toBe('/api/v1/news/bookmarks');

    // Call 2: Refresh call
    expect(fetch.mock.calls[1][0]).toBe('/api/v1/auth/refresh');
    expect(fetch.mock.calls[1][1].method).toBe('POST');
    expect(fetch.mock.calls[1][1].credentials).toBe('include');

    // Call 3: Replayed request
    expect(fetch.mock.calls[2][0]).toBe('/api/v1/news/bookmarks');
    expect(result).toEqual(finalData);

    // Verify Zero Client-Side Token Storage Gate
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('throws 401 error if token refresh call also fails', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ detail: 'Token expired' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ detail: 'Refresh token invalid' }),
      });

    await expect(api('/api/v1/news/feed')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('captures 429 Too Many Requests and parses Retry-After header', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({
        'content-type': 'application/json',
        'Retry-After': '900',
      }),
      json: async () => ({
        detail: 'Too many failed login attempts. Account temporarily locked.',
      }),
    });

    try {
      await api('/api/v1/auth/login', { method: 'POST', body: {} });
      expect.fail('Should have thrown on 429 response');
    } catch (err) {
      expect(err.status).toBe(429);
      expect(err.retryAfter).toBe(900);
      expect(err.detail).toContain('locked');
    }
  });
});
