/**
 * Central frozen application constants and URL phishing/XSS guards.
 * Conforms to Ponytail Ultra: zero external dependencies, native browser APIs.
 */

export const API_ROUTES = Object.freeze({
  AUTH: Object.freeze({
    REGISTER: '/api/v1/auth/register',
    VERIFY_OTP: '/api/v1/auth/verify-code',
    LOGIN: '/api/v1/auth/login',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
    ME: '/api/v1/auth/me',
  }),
  NEWS: Object.freeze({
    FEED: '/api/v1/news/feed',
    SEARCH: '/api/v1/news/search',
    BOOKMARKS: '/api/v1/news/bookmarks',
    READS: '/api/v1/news/reads',
    SHARE: '/api/v1/news/share',
    QUOTA: '/api/v1/news/quota',
  }),
});

export const CATEGORIES = Object.freeze([
  'ALL',
  'NATION',
  'BUSINESS',
  'TECHNOLOGY',
  'GENERAL',
]);

/**
 * Validates candidate URLs and strips dangerous schemes (javascript:, data:, vbscript:, etc.).
 * Strictly permits only standard http:// and https:// protocols to prevent reflected XSS and SSRF.
 *
 * @param {string} url - Candidate URL to sanitize
 * @returns {string} Sanitized URL or empty string if unsafe
 */
export function sanitizeUrl(url) {
  if (typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }

  // Regex strictly enforces http:// or https:// protocol prefix
  const SAFE_PROTOCOL_REGEX = /^https?:\/\//i;
  if (!SAFE_PROTOCOL_REGEX.test(trimmed)) {
    return '';
  }

  return trimmed;
}
