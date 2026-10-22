import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwissErrorBoundary } from '../../src/components/ui/SwissErrorBoundary.jsx';

function ProblematicChild({ shouldThrow = false, message = 'Fatal Render Explosion' }) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div data-testid="healthy-child">OPERATIONAL SUBSYSTEM ACTIVE</div>;
}

function ResilientParent() {
  const [hasCrash, setHasCrash] = useState(true);

  return (
    <SwissErrorBoundary
      moduleName="FEED_GRID"
      onReset={() => setHasCrash(false)}
    >
      <ProblematicChild shouldThrow={hasCrash} message="Recoverable Feed Anomaly" />
    </SwissErrorBoundary>
  );
}

describe('TICKET INT-7: Isolated Swiss Error Boundary & Crash Barrier (SwissErrorBoundary)', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Suppress React's default console.error log for intentional error boundary tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children normally when no rendering error occurs', () => {
    render(
      <SwissErrorBoundary moduleName="MASTHEAD">
        <ProblematicChild shouldThrow={false} />
      </SwissErrorBoundary>
    );

    expect(screen.getByTestId('healthy-child')).toBeInTheDocument();
    expect(screen.queryByTestId('swiss-error-boundary-fallback')).not.toBeInTheDocument();
  });

  it('catches rendering errors and displays Swiss brutalist fallback UI', () => {
    render(
      <SwissErrorBoundary moduleName="RADAR SUBSYSTEM">
        <ProblematicChild shouldThrow={true} message="Corrupt Signal Payload" />
      </SwissErrorBoundary>
    );

    const fallback = screen.getByTestId('swiss-error-boundary-fallback');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveClass('border-2');

    // Asserts module tag and brutalist error labels
    expect(screen.getByText(/ISOLATED FAULT BARRIER/i)).toBeInTheDocument();
    expect(screen.getByText(/RADAR SUBSYSTEM/i)).toBeInTheDocument();
    expect(screen.getByText(/Corrupt Signal Payload/i)).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-reset')).toBeInTheDocument();
  });

  it('invokes onError callback with caught error and component stack info', () => {
    const handleError = vi.fn();

    render(
      <SwissErrorBoundary moduleName="DISPATCHER" onError={handleError}>
        <ProblematicChild shouldThrow={true} message="Telemetry Pipe Broken" />
      </SwissErrorBoundary>
    );

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError.mock.calls[0][0].message).toBe('Telemetry Pipe Broken');
    expect(handleError.mock.calls[0][1]).toHaveProperty('componentStack');
  });

  it('renders custom fallback element when fallback prop is provided', () => {
    render(
      <SwissErrorBoundary
        fallback={<div data-testid="custom-fallback">CUSTOM SYSTEM FAILURE INTERFACE</div>}
      >
        <ProblematicChild shouldThrow={true} />
      </SwissErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('swiss-error-boundary-fallback')).not.toBeInTheDocument();
  });

  it('re-initializes and restores normal rendering when RECOVER ENGINE button is clicked', async () => {
    const user = userEvent.setup();

    render(<ResilientParent />);

    // Initial state: rendered fallback because hasCrash was true
    expect(screen.getByTestId('swiss-error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText(/Recoverable Feed Anomaly/i)).toBeInTheDocument();

    const resetButton = screen.getByTestId('error-boundary-reset');
    expect(resetButton).toHaveTextContent(/RECOVER ENGINE/i);

    // User triggers reset
    await user.click(resetButton);

    // After reset, state was updated to hasCrash=false, boundary cleared its error
    expect(screen.queryByTestId('swiss-error-boundary-fallback')).not.toBeInTheDocument();
    expect(screen.getByTestId('healthy-child')).toBeInTheDocument();
  });
});
