import React, { useState, useEffect } from 'react';

/**
 * Editorial Live Feed Controls & 80-Call Limiter Monitor.
 * Features:
 * - Live pulse telemetry dot
 * - Auto-update toggle (periodic background sync)
 * - Manual on-demand refresh trigger
 * - Last updated relative time counter
 * - 80-call daily request limiter quota badge
 *
 * @param {object} props
 * @param {boolean} [props.isRefreshing=false] - Whether feed is actively loading
 * @param {() => void} props.onRefresh - Manual refresh callback
 * @param {boolean} props.autoRefresh - Auto-refresh active state
 * @param {(enabled: boolean) => void} props.onToggleAutoRefresh - Auto-refresh toggle callback
 * @param {Date|null} [props.lastUpdated] - Timestamp of last successful fetch
 * @param {object|null} [props.quota] - 80-call daily request limiter quota metrics
 */
export function LiveFeedBar({
  isRefreshing = false,
  onRefresh,
  autoRefresh = true,
  onToggleAutoRefresh,
  lastUpdated,
  quota,
}) {
  const [timeAgo, setTimeAgo] = useState('JUST NOW');

  useEffect(() => {
    if (!lastUpdated) return;

    function updateRelativeTime() {
      const seconds = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000);
      if (seconds < 10) {
        setTimeAgo('JUST NOW');
      } else if (seconds < 60) {
        setTimeAgo(`${seconds}S AGO`);
      } else {
        const mins = Math.floor(seconds / 60);
        setTimeAgo(`${mins}M AGO`);
      }
    }

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 5000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const usedCalls = quota?.used_today ?? 0;
  const dailyLimit = quota?.daily_limit ?? 80;
  const remainingCalls = quota?.remaining ?? (dailyLimit - usedCalls);

  return (
    <div className="w-full bg-swiss-white border-2 border-swiss-black px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none text-xs font-mono font-bold uppercase tracking-wider">
      {/* Left: Live Status & Relative Timestamp */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                autoRefresh ? 'bg-emerald-400' : 'bg-neutral-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                autoRefresh ? 'bg-emerald-600' : 'bg-neutral-500'
              }`}
            />
          </span>
          <span className="text-swiss-black">
            {isRefreshing ? 'SYNCING WIRE...' : autoRefresh ? 'LIVE FEED ACTIVE' : 'LIVE FEED PAUSED'}
          </span>
        </div>

        <span className="text-neutral-400">|</span>

        <span className="text-neutral-500">
          UPDATED: <span className="text-swiss-black">{timeAgo}</span>
        </span>
      </div>

      {/* Right: 80-Call Daily Limiter & Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 80-Call Daily Request Limiter Telemetry */}
        <div
          title="Engineered Django REST APIs with pagination and an 80-call daily request limiter"
          className="flex items-center gap-1.5 px-2 py-1 bg-neutral-100 border border-neutral-300 text-[11px]"
        >
          <span className="w-1.5 h-1.5 bg-swiss-red inline-block" />
          <span className="text-neutral-600">80-CALL LIMITER:</span>
          <span className="text-swiss-black font-extrabold">
            {usedCalls}/{dailyLimit} USED
          </span>
          <span className="text-emerald-700 font-extrabold hidden sm:inline">
            ({remainingCalls} REMAINING)
          </span>
        </div>

        {/* Auto-refresh toggle */}
        <button
          type="button"
          onClick={() => onToggleAutoRefresh && onToggleAutoRefresh(!autoRefresh)}
          className={`px-2 py-1 border transition-colors cursor-pointer text-[11px] ${
            autoRefresh
              ? 'border-swiss-black bg-swiss-black text-swiss-white hover:bg-neutral-800'
              : 'border-neutral-300 bg-neutral-100 text-neutral-600 hover:border-swiss-black'
          }`}
        >
          AUTO-SYNC: {autoRefresh ? 'ON' : 'OFF'}
        </button>

        {/* Manual Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1 px-3 py-1 bg-swiss-white border border-swiss-black text-swiss-black hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50 text-[11px]"
        >
          <svg
            className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="square"
              strokeLinejoin="miter"
              strokeWidth="2.5"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>{isRefreshing ? 'REFRESHING...' : 'REFRESH WIRE'}</span>
        </button>
      </div>
    </div>
  );
}
