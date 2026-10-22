import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act, renderHook } from '@testing-library/react';
import { useNetworkStatus, useTabWakeup, useNetworkSync } from '../../src/hooks/useNetworkSync.js';
import { NetworkBanner } from '../../src/components/ui/NetworkBanner.jsx';

describe('TICKET INT-2: Real-Time Network Connectivity & Tab Resync Store', () => {
  let originalOnLine;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
  });

  describe('useNetworkStatus Hook', () => {
    it('initializes with current navigator.onLine state', () => {
      const { result } = renderHook(() => useNetworkStatus());
      expect(result.current).toBe(true);
    });

    it('updates dynamically on window offline and online events via useSyncExternalStore', () => {
      const { result } = renderHook(() => useNetworkStatus());
      expect(result.current).toBe(true);

      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        window.dispatchEvent(new Event('offline'));
      });
      expect(result.current).toBe(false);

      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        window.dispatchEvent(new Event('online'));
      });
      expect(result.current).toBe(true);
    });
  });

  describe('useTabWakeup Hook', () => {
    it('triggers callback when tab transitions from hidden to visible after exceeding staleTimeMs', () => {
      vi.useFakeTimers();
      const onWakeup = vi.fn();
      const staleTimeMs = 5000;

      renderHook(() => useTabWakeup(onWakeup, staleTimeMs));

      // 1. Tab goes hidden
      act(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(onWakeup).not.toHaveBeenCalled();

      // 2. Advance time past stale threshold (6000ms > 5000ms)
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      // 3. Tab becomes visible again
      act(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(onWakeup).toHaveBeenCalledTimes(1);
    });

    it('does not trigger callback if tab becomes visible before staleTimeMs elapsed', () => {
      vi.useFakeTimers();
      const onWakeup = vi.fn();
      const staleTimeMs = 10000;

      renderHook(() => useTabWakeup(onWakeup, staleTimeMs));

      // 1. Tab goes hidden
      act(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // 2. Advance only 2000ms (< 10000ms)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // 3. Tab returns to visible prematurely
      act(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(onWakeup).not.toHaveBeenCalled();
    });

    it('does not trigger callback when tab transitions to hidden', () => {
      const onWakeup = vi.fn();
      renderHook(() => useTabWakeup(onWakeup, 0));

      act(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(onWakeup).not.toHaveBeenCalled();
    });
  });

  describe('useNetworkSync Hook', () => {
    it('provides unified isOnline status and integrates tab wakeup listener', () => {
      const onWakeup = vi.fn();
      const { result } = renderHook(() => useNetworkSync(onWakeup, 1000));

      expect(result.current.isOnline).toBe(true);

      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('NetworkBanner Component', () => {
    it('renders null when connected online', () => {
      const { container } = render(<NetworkBanner />);
      expect(screen.queryByTestId('network-banner')).toBeNull();
      expect(container.firstChild).toBeNull();
    });

    it('renders Swiss-styled stark black bar with border-b-2 border-red-600 and exact offline copy when disconnected', () => {
      render(<NetworkBanner isOnline={false} />);

      const banner = screen.getByTestId('network-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent('SYSTEM STATUS: OFFLINE // DISPLAYING CACHED HEADLINES');
      expect(banner).toHaveClass('border-b-2');
      expect(banner).toHaveClass('border-red-600');
      expect(banner).toHaveClass('bg-black');
    });

    it('dynamically displays on window offline event and unmounts on online event', () => {
      render(<NetworkBanner />);

      expect(screen.queryByTestId('network-banner')).toBeNull();

      // Trigger offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        window.dispatchEvent(new Event('offline'));
      });

      const banner = screen.getByTestId('network-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent('SYSTEM STATUS: OFFLINE // DISPLAYING CACHED HEADLINES');

      // Trigger online
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        window.dispatchEvent(new Event('online'));
      });

      expect(screen.queryByTestId('network-banner')).toBeNull();
    });
  });
});
