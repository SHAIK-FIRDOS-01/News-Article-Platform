import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthPosterLayout } from '../../src/components/auth/AuthPosterLayout.jsx';

describe('TICKET 3.1: Swiss Auth Poster Frame (AuthPosterLayout)', () => {
  it('renders two-column poster layout with editorial brand stack and children slot', () => {
    render(
      <AuthPosterLayout>
        <div data-testid="test-form">AUTH FORM CONTENT</div>
      </AuthPosterLayout>
    );

    // Left column editorial stack
    expect(screen.getByText(/SIGNAL \/ REPORT \/\/ INTELLIGENCE/i)).toBeInTheDocument();
    expect(screen.getByText(/EDITION/i)).toBeInTheDocument();

    // Clock element
    const clock = screen.getByTestId('auth-poster-clock');
    expect(clock).toBeInTheDocument();
    expect(clock.textContent).toMatch(/IST/i);

    // Right column form slot
    expect(screen.getByTestId('test-form')).toBeInTheDocument();
    expect(screen.getByText('AUTH FORM CONTENT')).toBeInTheDocument();
  });

  it('contains stark 2px dividing border between columns', () => {
    const { container } = render(
      <AuthPosterLayout>
        <div>Slot</div>
      </AuthPosterLayout>
    );

    const divider = container.querySelector('.border-swiss-black');
    expect(divider).toBeInTheDocument();
  });

  it('renders custom edition and subtitle if provided', () => {
    render(
      <AuthPosterLayout edition="SPECIAL DISPATCH 09" subtitle="CONFIDENTIAL ACCESS">
        <div>Form</div>
      </AuthPosterLayout>
    );

    expect(screen.getByText('SPECIAL DISPATCH 09')).toBeInTheDocument();
    expect(screen.getByText('CONFIDENTIAL ACCESS')).toBeInTheDocument();
  });
});
