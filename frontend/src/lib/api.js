import { API_ROUTES } from './constants.js';

/**
 * Distinct classification categories for resilient error handling.
 */
export const ERROR_CODES = Object.freeze({
  CLIENT_OFFLINE: 'CLIENT_OFFLINE',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  BACKEND_UNREACHABLE: 'BACKEND_UNREACHABLE',
  HTTP_4XX: 'HTTP_4xx',
  HTTP_5XX: 'HTTP_5xx',
});

export const DEFAULT_TIMEOUT_MS = 8000;

// Module-level mutex holding in-flight token refresh promise for concurrent 401 queuing
let activeRefreshPromise = null;

/**
 * Pure JavaScript fetch wrapper enforcing credentials, 8000ms timeout abort,
 * concurrent 401 token rotation queue, and structured error categorization.
 *
 * @param {string} endpoint - API endpoint path or URL
 * @param {RequestInit & { body?: any, timeout?: number }} [options={}] - Fetch options
 * @param {boolean} [isRetry=false] - Replay recursion guard
 * @returns {Promise<any>} Parsed JSON response body
 */
export async function api(endpoint, options = {}, isRetry = false) {
  // Pre-dispatch client offline guard
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const offlineError = new Error('Client is currently offline');
    offlineError.code = ERROR_CODES.CLIENT_OFFLINE;
    throw offlineError;
  }

  const { headers = {}, body, timeout = DEFAULT_TIMEOUT_MS, signal: externalSignal, ...customConfig } = options;

  const isJsonBody = body && typeof body === 'object' && !(body instanceof FormData);

  // Setup 8000ms timeout AbortController
  const timeoutController = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    timeoutController.abort(new Error('NETWORK_TIMEOUT'));
  }, timeout);

  // Link external AbortSignal with internal timeout controller
  let effectiveSignal;
  let cleanupBridge = null;

  if (externalSignal) {
    if (typeof AbortSignal.any === 'function') {
      effectiveSignal = AbortSignal.any([externalSignal, timeoutController.signal]);
    } else {
      const bridge = new AbortController();
      const onExternalAbort = () => bridge.abort(externalSignal.reason);
      const onTimeoutAbort = () => bridge.abort(timeoutController.signal.reason);

      if (externalSignal.aborted) {
        bridge.abort(externalSignal.reason);
      } else if (timeoutController.signal.aborted) {
        bridge.abort(timeoutController.signal.reason);
      } else {
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
        timeoutController.signal.addEventListener('abort', onTimeoutAbort, { once: true });
        cleanupBridge = () => {
          externalSignal.removeEventListener('abort', onExternalAbort);
          timeoutController.signal.removeEventListener('abort', onTimeoutAbort);
        };
      }
      effectiveSignal = bridge.signal;
    }
  } else {
    effectiveSignal = timeoutController.signal;
  }

  const config = {
    method: options.method || 'GET',
    credentials: 'include',
    headers: {
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(isJsonBody ? { body: JSON.stringify(body) } : body ? { body } : {}),
    signal: effectiveSignal,
    ...customConfig,
  };

  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
    : '';
  const targetUrl = (endpoint.startsWith('http://') || endpoint.startsWith('https://') || !baseUrl)
    ? endpoint
    : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let response;
  try {
    response = await fetch(targetUrl, config);
  } catch (fetchErr) {
    if (timedOut || timeoutController.signal.aborted) {
      const timeoutError = new Error('Network request timed out');
      timeoutError.code = ERROR_CODES.NETWORK_TIMEOUT;
      timeoutError.cause = fetchErr;
      throw timeoutError;
    }

    if (externalSignal?.aborted) {
      throw fetchErr;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const offlineError = new Error('Client went offline during request');
      offlineError.code = ERROR_CODES.CLIENT_OFFLINE;
      offlineError.cause = fetchErr;
      throw offlineError;
    }

    const unreachableError = new Error(fetchErr?.message || 'Backend unreachable');
    unreachableError.code = ERROR_CODES.BACKEND_UNREACHABLE;
    unreachableError.cause = fetchErr;
    throw unreachableError;
  } finally {
    clearTimeout(timeoutId);
    if (cleanupBridge) {
      cleanupBridge();
    }
  }

  const contentType = response.headers?.get?.('content-type') || '';
  const data = (typeof contentType === 'string' && contentType.includes('application/json') && typeof response.json === 'function')
    ? await response.json()
    : null;

  // Intercept HTTP 401: queue concurrent requests and replay upon single refresh success
  if (
    response.status === 401 &&
    !isRetry &&
    endpoint !== API_ROUTES.AUTH.REFRESH &&
    endpoint !== API_ROUTES.AUTH.LOGIN
  ) {
    if (!activeRefreshPromise) {
      activeRefreshPromise = api(API_ROUTES.AUTH.REFRESH, { method: 'POST' }, true)
        .finally(() => {
          activeRefreshPromise = null;
        });
    }

    try {
      await activeRefreshPromise;
      return await api(endpoint, options, true);
    } catch {
      // Refresh failed; fall through to throw HTTP_4xx error below
    }
  }

  if (!response.ok) {
    const error = new Error(data?.detail || `HTTP Error ${response.status}`);
    error.status = response.status;
    error.data = data;
    error.detail = data?.detail;
    error.code = response.status >= 500 ? ERROR_CODES.HTTP_5XX : ERROR_CODES.HTTP_4XX;

    if (response.status === 429) {
      const retryHeader = response.headers?.get?.('Retry-After');
      if (retryHeader) {
        const parsedSeconds = parseInt(retryHeader, 10);
        if (!isNaN(parsedSeconds)) {
          error.retryAfter = parsedSeconds;
        } else {
          const dateMs = new Date(retryHeader).getTime();
          if (!isNaN(dateMs)) {
            error.retryAfter = Math.max(0, Math.ceil((dateMs - Date.now()) / 1000));
          } else {
            error.retryAfter = retryHeader;
          }
        }
      } else {
        error.retryAfter = null;
      }
    }

    throw error;
  }

  return data;
}
