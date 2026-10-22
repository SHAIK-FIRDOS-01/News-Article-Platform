import { describe, it, expect } from 'vitest';
import { API_ROUTES, CATEGORIES, sanitizeUrl } from '../../src/lib/constants.js';

describe('TICKET 1.3: Central Constants & Phishing Guards', () => {
  describe('API Routes Immutability & Structure', () => {
    it('verifies API_ROUTES is deeply frozen and cannot be mutated', () => {
      expect(Object.isFrozen(API_ROUTES)).toBe(true);
      expect(Object.isFrozen(API_ROUTES.AUTH)).toBe(true);
      expect(Object.isFrozen(API_ROUTES.NEWS)).toBe(true);

      // Mutating frozen object in strict mode should fail or be ignored
      expect(() => {
        API_ROUTES.AUTH.LOGIN = '/tampered';
      }).toThrow();
    });

    it('contains all required authentication and news endpoint routes', () => {
      expect(API_ROUTES.AUTH.REGISTER).toBe('/api/v1/auth/register');
      expect(API_ROUTES.AUTH.VERIFY_OTP).toBe('/api/v1/auth/verify-code');
      expect(API_ROUTES.AUTH.LOGIN).toBe('/api/v1/auth/login');
      expect(API_ROUTES.AUTH.REFRESH).toBe('/api/v1/auth/refresh');
      expect(API_ROUTES.AUTH.LOGOUT).toBe('/api/v1/auth/logout');

      expect(API_ROUTES.NEWS.FEED).toBe('/api/v1/news/feed');
      expect(API_ROUTES.NEWS.SEARCH).toBe('/api/v1/news/search');
      expect(API_ROUTES.NEWS.BOOKMARKS).toBe('/api/v1/news/bookmarks');
      expect(API_ROUTES.NEWS.READS).toBe('/api/v1/news/reads');
      expect(API_ROUTES.NEWS.SHARE).toBe('/api/v1/news/share');
    });
  });

  describe('Indian Categories Constants', () => {
    it('verifies CATEGORIES is deeply frozen and contains exact Indian edition categories', () => {
      expect(Object.isFrozen(CATEGORIES)).toBe(true);
      expect(CATEGORIES).toEqual(['ALL', 'NATION', 'BUSINESS', 'TECHNOLOGY', 'GENERAL']);

      expect(() => {
        CATEGORIES.push('CRICKET');
      }).toThrow();
    });
  });

  describe('Phishing & Malicious Scheme Sanitizer (sanitizeUrl)', () => {
    it('allows valid HTTP and HTTPS URLs', () => {
      expect(sanitizeUrl('https://signalreport.io/article/ai-breakthrough')).toBe(
        'https://signalreport.io/article/ai-breakthrough'
      );
      expect(sanitizeUrl('http://example.com/feed')).toBe('http://example.com/feed');
    });

    it('rejects dangerous javascript:, data:, and vbscript: URIs', () => {
      expect(sanitizeUrl('javascript:alert(document.cookie)')).toBe('');
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
      expect(sanitizeUrl('DATA:image/svg+xml;base64,...')).toBe('');
      expect(sanitizeUrl('vbscript:msgbox("xss")')).toBe('');
      expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    });

    it('rejects leading/trailing whitespace bypass attacks', () => {
      expect(sanitizeUrl('  javascript:alert(1)  ')).toBe('');
      expect(sanitizeUrl('\njavascript:alert(1)')).toBe('');
    });

    it('safely handles null, undefined, and non-string inputs', () => {
      expect(sanitizeUrl(null)).toBe('');
      expect(sanitizeUrl(undefined)).toBe('');
      expect(sanitizeUrl(12345)).toBe('');
      expect(sanitizeUrl({})).toBe('');
      expect(sanitizeUrl('')).toBe('');
    });
  });
});
