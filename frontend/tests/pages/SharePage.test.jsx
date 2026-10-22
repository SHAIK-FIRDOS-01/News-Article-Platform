import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SharePage } from '../../src/pages/SharePage.jsx';
import * as apiModule from '../../src/lib/api.js';

describe('TICKET 6.2: Public Shareable Link Landing Page (SharePage)', () => {
  const sampleArticle = {
    id: 'share-001',
    share_token: 'valid-share-token-123',
    title: 'AUTONOMOUS AI SYSTEM ARCHITECTURES IN PRODUCTION',
    description: 'Analysis of multi-agent cognitive loops in enterprise environments.',
    content: 'Comprehensive technical deep-dive into autonomous multi-agent systems in high reliability settings.',
    url: 'https://signalreport.io/news/autonomous-ai-architecture',
    image_url: 'https://images.unsplash.com/photo-ai.jpg',
    source_name: 'ArchitectureToday',
    published_at: '2026-09-19T10:00:00Z',
    category: 'technology',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches unauthenticated share article and renders full editorial layout', async () => {
    const apiSpy = vi.spyOn(apiModule, 'api').mockResolvedValueOnce(sampleArticle);

    render(<SharePage shareToken="valid-share-token-123" />);

    // Shows loading state initially
    expect(screen.getByText(/RETRIEVING DISPATCH DOSSIER/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith('/api/v1/news/share/valid-share-token-123');
      expect(screen.getByRole('heading', { name: sampleArticle.title })).toBeInTheDocument();
      expect(screen.getByText(sampleArticle.description)).toBeInTheDocument();
      expect(screen.getByText(sampleArticle.content)).toBeInTheDocument();
      expect(screen.getByText(/ArchitectureToday/i)).toBeInTheDocument();
    });

    // Outbound link security check
    const originalLink = screen.getByRole('link', { name: /ORIGINAL SOURCE|READ ORIGINAL/i });
    expect(originalLink).toHaveAttribute('href', sampleArticle.url);
    expect(originalLink).toHaveAttribute('target', '_blank');
    expect(originalLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders 404 error view when share token is not found or invalid', async () => {
    vi.spyOn(apiModule, 'api').mockRejectedValueOnce({
      status: 404,
      detail: 'Dispatch dossier not found',
    });

    render(<SharePage shareToken="invalid-token" />);

    await waitFor(() => {
      expect(screen.getByText(/404 \/\/ DOSSIER NOT FOUND/i)).toBeInTheDocument();
    });
  });

  it('updates document title with article headline upon load', async () => {
    vi.spyOn(apiModule, 'api').mockResolvedValueOnce(sampleArticle);

    render(<SharePage shareToken="valid-share-token-123" />);

    await waitFor(() => {
      expect(document.title).toContain('AUTONOMOUS AI SYSTEM ARCHITECTURES');
    });
  });
});
