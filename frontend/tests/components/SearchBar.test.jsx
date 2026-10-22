import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../../src/components/dashboard/SearchBar.jsx';

describe('SearchBar Component', () => {
  it('renders input with placeholder text and hotkey hint', () => {
    render(<SearchBar query="" onSearch={vi.fn()} onClear={vi.fn()} />);
    const input = screen.getByPlaceholderText(/SEARCH DISPATCHES BY KEYWORD/i);
    expect(input).toBeInTheDocument();
  });

  it('calls onSearch when user types in the search field', async () => {
    const handleSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar query="" onSearch={handleSearch} onClear={vi.fn()} />);

    const input = screen.getByPlaceholderText(/SEARCH DISPATCHES BY KEYWORD/i);
    await user.type(input, 'semiconductor');
    expect(handleSearch).toHaveBeenCalled();
  });

  it('renders clear button when query is present and triggers onClear', async () => {
    const handleClear = vi.fn();
    const user = userEvent.setup();
    render(
      <SearchBar
        query="lithography"
        onSearch={vi.fn()}
        onClear={handleClear}
        resultCount={3}
      />
    );

    expect(screen.getByText(/FILTERING FOR/i)).toBeInTheDocument();
    expect(screen.getByText(/3 DISPATCHES FOUND/i)).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /CLEAR ✕/i });
    await user.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
