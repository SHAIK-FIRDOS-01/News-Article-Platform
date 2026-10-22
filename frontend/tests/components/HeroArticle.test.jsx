import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeroArticle } from '../../src/components/dashboard/HeroArticle.jsx';

describe('TICKET 5.1: Hero Article Lead Story Component (HeroArticle)', () => {
  const sampleArticle = {
    id: 'art-001',
    title: 'GLOBAL REGULATORY COUNCIL CONVENES ON MONETARY SOVEREIGNTY',
    description: 'Member states establish strict structural boundaries for cross-border autonomous protocols.',
    url: 'https://signalreport.io/articles/global-regulatory-council',
    image_url: 'https://images.unsplash.com/photo-brutalist-council.jpg',
    source: 'BRUSSELS DISPATCH',
    published_at: '3H AGO',
    category: 'BUSINESS',
    is_bookmarked: false,
    is_read: false,
    share_token: 'share-abc-123',
  };

  it('renders headline, abstract, source, and relative timestamp', () => {
    render(<HeroArticle article={sampleArticle} />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'GLOBAL REGULATORY COUNCIL CONVENES ON MONETARY SOVEREIGNTY'
    );
    expect(
      screen.getByText(/Member states establish strict structural boundaries/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/BRUSSELS DISPATCH/i)).toBeInTheDocument();
    expect(screen.getByText(/3H AGO/i)).toBeInTheDocument();
  });

  it('enforces rel="noopener noreferrer" and target="_blank" on outbound link', () => {
    render(<HeroArticle article={sampleArticle} />);

    const link = screen.getByRole('link', { name: new RegExp(sampleArticle.title, 'i') });
    expect(link).toHaveAttribute('href', sampleArticle.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('sanitizes image url and displays image with sanitized https source', () => {
    render(<HeroArticle article={sampleArticle} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', sampleArticle.image_url);
  });

  it('renders fallback placeholder when image_url is missing or unsafe', () => {
    const unsafeArticle = {
      ...sampleArticle,
      image_url: 'javascript:alert(1)',
    };

    render(<HeroArticle article={unsafeArticle} />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByTestId('hero-image-placeholder')).toBeInTheDocument();
  });

  it('fires action triggers for bookmarking, marking read, and sharing', async () => {
    const user = userEvent.setup();
    const handleBookmark = vi.fn();
    const handleRead = vi.fn();
    const handleShare = vi.fn();

    render(
      <HeroArticle
        article={sampleArticle}
        onToggleBookmark={handleBookmark}
        onToggleRead={handleRead}
        onShare={handleShare}
      />
    );

    const bookmarkBtn = screen.getByRole('button', { name: /BOOKMARK|SAVE/i });
    const readBtn = screen.getByRole('button', { name: /MARK READ|READ/i });
    const shareBtn = screen.getByRole('button', { name: /SHARE/i });

    await user.click(bookmarkBtn);
    expect(handleBookmark).toHaveBeenCalledWith(sampleArticle);

    await user.click(readBtn);
    expect(handleRead).toHaveBeenCalledWith(sampleArticle);

    await user.click(shareBtn);
    expect(handleShare).toHaveBeenCalledWith(sampleArticle);
  });
});
