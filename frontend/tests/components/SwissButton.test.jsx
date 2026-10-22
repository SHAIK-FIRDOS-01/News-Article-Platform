import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwissButton } from '../../src/components/ui/SwissButton.jsx';

describe('TICKET 2.2: Stark Action Button (SwissButton)', () => {
  it('renders primary button by default with zero border-radius, heavy border, and uppercase bold typography', () => {
    render(<SwissButton>Confirm Action</SwissButton>);

    const button = screen.getByRole('button', { name: /confirm action/i });
    expect(button).toBeInTheDocument();
    // Security Gate: Explicit type="button" by default
    expect(button).toHaveAttribute('type', 'button');
    // Swiss styling tokens
    expect(button).toHaveClass('border-2');
    expect(button).toHaveClass('border-swiss-black');
    expect(button).toHaveClass('bg-swiss-black');
    expect(button).toHaveClass('text-swiss-white');
    expect(button).toHaveClass('uppercase');
    expect(button).toHaveClass('font-bold');
  });

  it('renders secondary variant with white background and black text', () => {
    render(<SwissButton variant="secondary">Cancel</SwissButton>);

    const button = screen.getByRole('button', { name: /cancel/i });
    expect(button).toHaveClass('bg-swiss-white');
    expect(button).toHaveClass('text-swiss-black');
    expect(button).toHaveClass('border-swiss-black');
  });

  it('renders destructive variant with Swiss red styling', () => {
    render(<SwissButton variant="destructive">Purge Cache</SwissButton>);

    const button = screen.getByRole('button', { name: /purge cache/i });
    expect(button).toHaveClass('bg-swiss-red');
    expect(button).toHaveClass('text-swiss-white');
  });

  it('dispatches onClick when clicked by user', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<SwissButton onClick={handleClick}>Trigger Action</SwissButton>);

    const button = screen.getByRole('button', { name: /trigger action/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('prevents click events and applies disabled visual styling when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<SwissButton disabled onClick={handleClick}>Disabled Action</SwissButton>);

    const button = screen.getByRole('button', { name: /disabled action/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50');
    expect(button).toHaveClass('cursor-not-allowed');

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('honors type="submit" for explicit form submissions', () => {
    render(<SwissButton type="submit">Submit Form</SwissButton>);

    const button = screen.getByRole('button', { name: /submit form/i });
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('applies accessible focus ring classes for keyboard navigation', () => {
    render(<SwissButton>Accessible</SwissButton>);

    const button = screen.getByRole('button', { name: /accessible/i });
    expect(button).toHaveClass('focus:ring-2');
    expect(button).toHaveClass('focus:ring-offset-2');
  });
});
