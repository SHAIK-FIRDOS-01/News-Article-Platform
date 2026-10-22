import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArticleGrid } from '../../src/components/dashboard/ArticleGrid.jsx';

describe('TICKET 5.3: Asymmetric Article Feed Grid (ArticleGrid)', () => {
  const sampleArticles = [
    {
      id: 'art-001',
      title: 'FIRST STORY: LEAD REGULATORY CONVENTION',
      description: 'Lead abstract...',
      url: 'https://signalreport.io/1',
      source: 'BRUSSELS',
      published_at: '1H AGO',
      is_bookmarked: false,
      is_read: false,
    },
    {
      id: 'art-002',
      title: 'SECOND STORY: ALGORITHMIC LIQUIDITY',
      description: 'Secondary abstract...',
      url: 'https://signalreport.io/2',
      source: 'FRANKFURT',
      published_at: '2H AGO',
      is_bookmarked: false,
      is_read: false,
    },
    {
      id: 'art-003',
      title: 'THIRD STORY: MARITIME FREIGHT RATES SURGE',
      description: 'Logistics abstract...',
      url: 'https://signalreport.io/3',
      source: 'ROTTERDAM',
      published_at: '3H AGO',
      is_bookmarked: false,
      is_read: false,
    },
  ];

  it('renders hero article for first item and standard cards for remaining items', () => {
    render(
      <ArticleGrid
        articles={sampleArticles}
        onLoadMore={vi.fn()}
      />
    );

    // Hero article (first item) has "01 // LEAD"
    expect(screen.getByText(/01 \/\/ LEAD/i)).toBeInTheDocument();
    expect(screen.getByText('FIRST STORY: LEAD REGULATORY CONVENTION')).toBeInTheDocument();

    // Standard cards
    expect(screen.getByText('SECOND STORY: ALGORITHMIC LIQUIDITY')).toBeInTheDocument();
    expect(screen.getByText('THIRD STORY: MARITIME FREIGHT RATES SURGE')).toBeInTheDocument();
  });

  it('renders empty state message when articles array is empty', () => {
    render(<ArticleGrid articles={[]} onLoadMore={vi.fn()} />);

    expect(screen.getByText(/NO DISPATCHES FOUND FOR ACTIVE FILTER/i)).toBeInTheDocument();
  });

  it('renders loading state when isLoading is true and no articles exist', () => {
    render(<ArticleGrid articles={[]} isLoading onLoadMore={vi.fn()} />);

    expect(screen.getByText(/SYNCHRONIZING FEED/i)).toBeInTheDocument();
  });

  it('triggers onLoadMore when LOAD MORE HEADLINES button is clicked', async () => {
    const user = userEvent.setup();
    const handleLoadMore = vi.fn();

    render(
      <ArticleGrid
        articles={sampleArticles}
        hasMore={true}
        onLoadMore={handleLoadMore}
      />
    );

    const loadMoreBtn = screen.getByRole('button', { name: /LOAD MORE HEADLINES/i });
    expect(loadMoreBtn).toBeInTheDocument();

    await user.click(loadMoreBtn);
    expect(handleLoadMore).toHaveBeenCalledTimes(1);
  });
});
