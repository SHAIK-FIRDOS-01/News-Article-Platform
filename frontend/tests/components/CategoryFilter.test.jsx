import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryFilter } from '../../src/components/dashboard/CategoryFilter.jsx';

describe('TICKET 4.2: Category Filter Bar (CategoryFilter)', () => {
  it('renders all Indian edition categories', () => {
    render(<CategoryFilter activeCategory="ALL" onSelectCategory={vi.fn()} />);

    expect(screen.getByRole('button', { name: /ALL/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /NATION/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /BUSINESS/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /TECHNOLOGY/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GENERAL/i })).toBeInTheDocument();
  });

  it('applies inverted black background to the active category pill', () => {
    render(<CategoryFilter activeCategory="TECHNOLOGY" onSelectCategory={vi.fn()} />);

    const techBtn = screen.getByRole('button', { name: /TECHNOLOGY/i });
    expect(techBtn).toHaveClass('bg-swiss-black');
    expect(techBtn).toHaveClass('text-swiss-white');

    const nationBtn = screen.getByRole('button', { name: /NATION/i });
    expect(nationBtn).toHaveClass('bg-swiss-white');
    expect(nationBtn).toHaveClass('text-swiss-black');
  });

  it('invokes onSelectCategory with the selected category name when clicked', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(<CategoryFilter activeCategory="ALL" onSelectCategory={handleSelect} />);

    const businessBtn = screen.getByRole('button', { name: /BUSINESS/i });
    await user.click(businessBtn);

    expect(handleSelect).toHaveBeenCalledWith('BUSINESS');
  });
});
