import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwissInput } from '../../src/components/ui/SwissInput.jsx';

describe('TICKET 2.3: Monospaced Text Input & Sanitized Error Slot (SwissInput)', () => {
  it('renders input with uppercase label and standard attributes', () => {
    render(
      <SwissInput
        id="test-email"
        label="01 / OPERATOR CREDENTIAL"
        placeholder="OPERATOR@DISPATCH.CH"
        type="email"
      />
    );

    const label = screen.getByText('01 / OPERATOR CREDENTIAL');
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass('uppercase');

    const input = screen.getByPlaceholderText('OPERATOR@DISPATCH.CH');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('id', 'test-email');
    // Swiss styling: rectangular, sharp borders
    expect(input).toHaveClass('rounded-none');
    expect(input).toHaveClass('border-2');
    expect(input).toHaveClass('border-swiss-black');
  });

  it('handles user typing and triggers onChange callback', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <SwissInput
        id="username"
        label="Username"
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'vignelli');

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('vignelli');
  });

  it('applies high-contrast focus ring for accessible navigation', () => {
    render(
      <SwissInput
        id="accessible-input"
        label="Access Code"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('focus:ring-2');
    expect(input).toHaveClass('focus:ring-swiss-black');
  });

  it('renders dedicated error container beneath input without layout shift', () => {
    const { rerender } = render(
      <SwissInput
        id="field"
        label="Field"
      />
    );

    const errorContainer = screen.getByTestId('swiss-input-error');
    expect(errorContainer).toBeInTheDocument();
    expect(errorContainer).toBeEmptyDOMElement();

    rerender(
      <SwissInput
        id="field"
        label="Field"
        error="INVALID OPERATOR ID"
      />
    );

    expect(errorContainer).toHaveTextContent('INVALID OPERATOR ID');
    expect(errorContainer).toHaveClass('text-swiss-red');
  });

  it('strictly renders error as a sanitized text node preventing XSS', () => {
    const xssPayload = '<b id="xss-tag">INJECTED</b>';
    render(
      <SwissInput
        id="security-field"
        label="Security Check"
        error={xssPayload}
      />
    );

    const errorContainer = screen.getByTestId('swiss-input-error');
    // Rendered literally as text content, not as parsed HTML element
    expect(errorContainer.textContent).toBe(xssPayload);
    expect(document.getElementById('xss-tag')).toBeNull();
  });

  it('supports disabled state with muted styling', () => {
    render(
      <SwissInput
        id="disabled-field"
        label="Locked Field"
        disabled
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('opacity-50');
    expect(input).toHaveClass('cursor-not-allowed');
  });
});
