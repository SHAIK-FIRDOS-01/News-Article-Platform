import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Masthead } from '../../src/components/dashboard/Masthead.jsx';
import * as apiModule from '../../src/lib/api.js';

describe('TICKET 4.1: Editorial Masthead & Dynamic Edition Bar (Masthead)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders monumental display title and live date ticker with Hyderabad/IST location', () => {
    render(<Masthead user={{ email: 'editor@signalreport.io' }} onLogout={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /SIGNAL REPORT/i })).toBeInTheDocument();
    expect(screen.getByText(/HYDERABAD, IN/i)).toBeInTheDocument();
    expect(screen.getByText(/EDITOR@SIGNALREPORT.IO/i)).toBeInTheDocument();
  });

  it('invokes logout API and onLogout callback when LOGOUT button is clicked', async () => {
    const user = userEvent.setup();
    const handleLogout = vi.fn();
    const apiSpy = vi.spyOn(apiModule, 'api').mockResolvedValueOnce({ status: 'success' });

    render(<Masthead user={{ email: 'editor@signalreport.io' }} onLogout={handleLogout} />);

    const logoutBtn = screen.getByRole('button', { name: /LOG OUT|LOGOUT/i });
    await user.click(logoutBtn);

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith('/api/v1/auth/logout', { method: 'POST' });
      expect(handleLogout).toHaveBeenCalled();
    });
  });

  it('renders bookmark drawer trigger when onOpenBookmarks is provided', async () => {
    const user = userEvent.setup();
    const handleOpenBookmarks = vi.fn();

    render(
      <Masthead
        user={{ email: 'editor@signalreport.io' }}
        onLogout={vi.fn()}
        onOpenBookmarks={handleOpenBookmarks}
        bookmarkCount={3}
      />
    );

    const bookmarksBtn = screen.getByRole('button', { name: /SAVED|BOOKMARKS/i });
    expect(bookmarksBtn).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    await user.click(bookmarksBtn);
    expect(handleOpenBookmarks).toHaveBeenCalledTimes(1);
  });
});
