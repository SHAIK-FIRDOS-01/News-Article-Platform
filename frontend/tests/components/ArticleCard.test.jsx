import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArticleCard } from '../../src/components/dashboard/ArticleCard.jsx';

describe('TICKET 5.2: Standard Article Card & Visual Read States (ArticleCard)', () => {
  const unreadArticle = {
    id: 'art-002',
    title: 'ALGORITHMIC LIQUIDITY COMPRESSES SPREADS ACROSS CONTINENTAL EXCHANGES',
    description: 'High-density trading platforms automate high frequency arbitrage.',
    url: 'https://signalreport.io/articles/algorithmic-liquidity',
    image_url: 'https://images.unsplash.com/photo-trading.jpg',
    source: 'FRANKFURT BOURSE',
    published_at: '4H AGO',
    category: 'BUSINESS',
    is_bookmarked: false,
    is_read: false,
    share_token: 'share-def-456',
  };

  it('renders headline, source, and outbound link with noopener noreferrer', () => {
    render(<ArticleCard article={unreadArticle} index={2} />);

    const link = screen.getByRole('link', { name: new RegExp(unreadArticle.title, 'i') });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', unreadArticle.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/FRANKFURT BOURSE/i)).toBeInTheDocument();
  });

  it('applies muted gray text and read indicator when is_read is true', () => {
    const readArticle = {
      ...unreadArticle,
      is_read: true,
    };

    render(<ArticleCard article={readArticle} index={2} />);

    const headline = screen.getByRole('heading');
    expect(headline).toHaveClass('text-neutral-400');
    expect(screen.getByText(/\[READ\]/i)).toBeInTheDocument();
  });

  it('displays filled bookmark badge when is_bookmarked is true', () => {
    const bookmarkedArticle = {
      ...unreadArticle,
      is_bookmarked: true,
    };

    render(<ArticleCard article={bookmarkedArticle} index={2} />);

    expect(screen.getByText(/BOOKMARKED/i)).toBeInTheDocument();
  });

  it('triggers bookmark and read actions on button click', async () => {
    const user = userEvent.setup();
    const handleBookmark = vi.fn();
    const handleRead = vi.fn();

    render(
      <ArticleCard
        article={unreadArticle}
        index={2}
        onToggleBookmark={handleBookmark}
        onToggleRead={handleRead}
      />
    );

    const bookmarkBtn = screen.getByRole('button', { name: /BOOKMARK|SAVE/i });
    const readBtn = screen.getByRole('button', { name: /MARK READ|READ/i });

    await user.click(bookmarkBtn);
    expect(handleBookmark).toHaveBeenCalledWith(unreadArticle);

    await user.click(readBtn);
    expect(handleRead).toHaveBeenCalledWith(unreadArticle);
  });
});
