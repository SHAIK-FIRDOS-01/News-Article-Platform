import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SwissBadge } from '../../src/components/ui/SwissBadge.jsx';

describe('TICKET 2.4: Status Badges & Edition Tag (SwissBadge)', () => {
  it('renders default badge with zero border-radius, black border, and uppercase text', () => {
    render(<SwissBadge>REGION: IN</SwissBadge>);

    const badge = screen.getByText('REGION: IN');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('uppercase');
    expect(badge).toHaveClass('rounded-none');
    expect(badge).toHaveClass('border');
    expect(badge).toHaveClass('border-swiss-black');
    expect(badge).toHaveClass('bg-swiss-white');
    expect(badge).toHaveClass('text-swiss-black');
  });

  it('renders inverted variant with black background and white text', () => {
    render(<SwissBadge variant="inverted">STATUS: ARCHIVED</SwissBadge>);

    const badge = screen.getByText('STATUS: ARCHIVED');
    expect(badge).toHaveClass('bg-swiss-black');
    expect(badge).toHaveClass('text-swiss-white');
  });

  it('renders red variant with Swiss red background and white text', () => {
    render(<SwissBadge variant="red">BREAKING</SwissBadge>);

    const badge = screen.getByText('BREAKING');
    expect(badge).toHaveClass('bg-swiss-red');
    expect(badge).toHaveClass('text-swiss-white');
  });

  it('renders pulsating live indicator dot when live prop is true', () => {
    render(<SwissBadge live>STATUS: LIVE</SwissBadge>);

    const badge = screen.getByText('STATUS: LIVE');
    expect(badge).toBeInTheDocument();

    const indicator = screen.getByTestId('swiss-badge-live-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-swiss-red');
  });

  it('supports custom className extension', () => {
    render(<SwissBadge className="tracking-widest">LANG: EN</SwissBadge>);

    const badge = screen.getByText('LANG: EN');
    expect(badge).toHaveClass('tracking-widest');
  });
});
