import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookmarksDrawer } from '../../src/components/dashboard/BookmarksDrawer.jsx';
import * as apiModule from '../../src/lib/api.js';

describe('TICKET 6.1: Saved Articles (Bookmarks) Drawer (BookmarksDrawer)', () => {
  const sampleBookmarks = [
    {
      id: 'bm-1',
      title: 'SAVED DOSSIER ON NEURAL COMPRESSION',
      source: 'ZÜRICH LABS',
      published_at: 'YESTERDAY',
      url: 'https://signalreport.io/neural',
    },
    {
      id: 'bm-2',
      title: 'QUANTUM KEY DISTRIBUTION PROTOCOLS',
      source: 'GENEVA TELEGRAPH',
      published_at: '2D AGO',
      url: 'https://signalreport.io/quantum',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <BookmarksDrawer isOpen={false} onClose={vi.fn()} bookmarks={sampleBookmarks} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders drawer header, articles, and close button when isOpen is true', () => {
    render(
      <BookmarksDrawer isOpen={true} onClose={vi.fn()} bookmarks={sampleBookmarks} />
    );

    expect(screen.getByText(/SAVED DISPATCHES \/\/ ARCHIVE/i)).toBeInTheDocument();
    expect(screen.getByText('SAVED DOSSIER ON NEURAL COMPRESSION')).toBeInTheDocument();
    expect(screen.getByText('QUANTUM KEY DISTRIBUTION PROTOCOLS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CLOSE/i })).toBeInTheDocument();
  });

  it('closes on Escape key press or close button click', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <BookmarksDrawer isOpen={true} onClose={handleClose} bookmarks={sampleBookmarks} />
    );

    const closeBtn = screen.getByRole('button', { name: /CLOSE/i });
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('optimistically removes bookmark when remove button is clicked', async () => {
    const user = userEvent.setup();
    const handleRemove = vi.fn();
    vi.spyOn(apiModule, 'api').mockResolvedValueOnce({ status: 'removed' });

    render(
      <BookmarksDrawer
        isOpen={true}
        onClose={vi.fn()}
        bookmarks={sampleBookmarks}
        onRemoveBookmark={handleRemove}
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: /REMOVE/i });
    expect(removeButtons).toHaveLength(2);

    await user.click(removeButtons[0]);

    // Item should immediately disappear optimistically
    expect(screen.queryByText('SAVED DOSSIER ON NEURAL COMPRESSION')).toBeNull();
    expect(handleRemove).toHaveBeenCalledWith('bm-1');
  });

  it('renders empty state message when no bookmarks exist', () => {
    render(
      <BookmarksDrawer isOpen={true} onClose={vi.fn()} bookmarks={[]} />
    );

    expect(screen.getByText(/NO SAVED ARTICLES/i)).toBeInTheDocument();
  });
});
