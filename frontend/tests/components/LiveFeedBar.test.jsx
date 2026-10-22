import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveFeedBar } from '../../src/components/dashboard/LiveFeedBar.jsx';

describe('LiveFeedBar Component', () => {
  it('renders live status indicator and 80-call quota telemetry', () => {
    const quota = {
      service: 'gnews',
      daily_limit: 80,
      used_today: 14,
      remaining: 66,
    };

    render(
      <LiveFeedBar
        isRefreshing={false}
        onRefresh={vi.fn()}
        autoRefresh={true}
        onToggleAutoRefresh={vi.fn()}
        lastUpdated={new Date()}
        quota={quota}
      />
    );

    expect(screen.getByText(/LIVE FEED ACTIVE/i)).toBeInTheDocument();
    expect(screen.getByText(/14\/80 USED/i)).toBeInTheDocument();
    expect(screen.getByText(/66 REMAINING/i)).toBeInTheDocument();
  });

  it('triggers onRefresh when REFRESH WIRE button is clicked', async () => {
    const handleRefresh = vi.fn();
    const user = userEvent.setup();

    render(
      <LiveFeedBar
        isRefreshing={false}
        onRefresh={handleRefresh}
        autoRefresh={true}
        onToggleAutoRefresh={vi.fn()}
        lastUpdated={new Date()}
      />
    );

    const refreshBtn = screen.getByRole('button', { name: /REFRESH WIRE/i });
    await user.click(refreshBtn);
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });

  it('toggles auto-refresh state when toggle button is clicked', async () => {
    const handleToggle = vi.fn();
    const user = userEvent.setup();

    render(
      <LiveFeedBar
        isRefreshing={false}
        onRefresh={vi.fn()}
        autoRefresh={true}
        onToggleAutoRefresh={handleToggle}
        lastUpdated={new Date()}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /AUTO-SYNC: ON/i });
    await user.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalledWith(false);
  });
});
