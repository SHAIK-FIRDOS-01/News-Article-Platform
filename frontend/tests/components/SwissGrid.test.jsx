import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SwissGrid, SwissGridCell } from '../../src/components/ui/SwissGrid.jsx';

describe('TICKET 2.1: SwissGrid & SwissGridCell Layout Primitives', () => {
  it('renders SwissGrid container with stark 2px border and grid classes', () => {
    render(
      <SwissGrid className="custom-test-grid">
        <div>Grid Content</div>
      </SwissGrid>
    );

    const grid = screen.getByTestId('swiss-grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('border-2');
    expect(grid).toHaveClass('border-swiss-black');
    expect(grid).toHaveClass('custom-test-grid');
    expect(screen.getByText('Grid Content')).toBeInTheDocument();
  });

  it('renders SwissGridCell with section tag and content', () => {
    render(
      <SwissGridCell tag="01 // INTEL" span={8} borderRight>
        <p>Cell Body</p>
      </SwissGridCell>
    );

    const cell = screen.getByTestId('swiss-grid-cell');
    expect(cell).toBeInTheDocument();
    expect(cell).toHaveClass('lg:col-span-8');
    expect(cell).toHaveClass('lg:border-r-2');
    expect(cell).toHaveClass('border-swiss-black');

    const tag = screen.getByTestId('swiss-grid-cell-tag');
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveTextContent('01 // INTEL');
    expect(screen.getByText('Cell Body')).toBeInTheDocument();
  });

  it('omits tag slot when tag prop is not provided', () => {
    render(
      <SwissGridCell>
        <span>Tagless Cell</span>
      </SwissGridCell>
    );

    expect(screen.queryByTestId('swiss-grid-cell-tag')).not.toBeInTheDocument();
    expect(screen.getByText('Tagless Cell')).toBeInTheDocument();
  });

  it('renders compound layout with multiple cells and dividers', () => {
    render(
      <SwissGrid cols={12}>
        <SwissGridCell tag="01 // LEAD" span={8} borderRight borderBottom>
          <h2>Lead Story</h2>
        </SwissGridCell>
        <SwissGridCell tag="02 // SECONDARY" span={4} borderBottom>
          <h2>Sidebar Story</h2>
        </SwissGridCell>
      </SwissGrid>
    );

    const cells = screen.getAllByTestId('swiss-grid-cell');
    expect(cells).toHaveLength(2);
    expect(screen.getByText('Lead Story')).toBeInTheDocument();
    expect(screen.getByText('Sidebar Story')).toBeInTheDocument();
  });
});
