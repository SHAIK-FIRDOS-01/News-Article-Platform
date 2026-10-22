import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../../src/components/auth/LoginForm.jsx';
import * as apiModule from '../../src/lib/api.js';

describe('TICKET 3.4: Poster Login Form & 429 Lockout Display (LoginForm)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders login form inputs and submit button', () => {
    render(<LoginForm onLoginSuccess={vi.fn()} />);

    expect(screen.getByLabelText(/EMAIL/i)).toBeInTheDocument();
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /SIGN IN|LOG IN/i })).toBeInTheDocument();
  });

  it('submits credentials and calls onLoginSuccess on 200 OK', async () => {
    const user = userEvent.setup();
    const handleSuccess = vi.fn();
    const apiSpy = vi.spyOn(apiModule, 'api').mockResolvedValueOnce({
      status: 'authenticated',
      user: { email: 'operator@dispatch.ch' },
    });

    render(<LoginForm onLoginSuccess={handleSuccess} />);

    const emailInput = screen.getByLabelText(/EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const submitBtn = screen.getByRole('button', { name: /SIGN IN|LOG IN/i });

    await user.type(emailInput, 'operator@dispatch.ch');
    await user.type(passwordInput, 'valid-passphrase');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith('/api/v1/auth/login', {
        method: 'POST',
        body: {
          email: 'operator@dispatch.ch',
          password: 'valid-passphrase',
        },
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('displays error banner when authentication credentials fail', async () => {
    const user = userEvent.setup();
    const handleSuccess = vi.fn();
    vi.spyOn(apiModule, 'api').mockRejectedValueOnce({
      status: 401,
      detail: 'INVALID OPERATOR CREDENTIALS',
    });

    render(<LoginForm onLoginSuccess={handleSuccess} />);

    const emailInput = screen.getByLabelText(/EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const submitBtn = screen.getByRole('button', { name: /SIGN IN|LOG IN/i });

    await user.type(emailInput, 'operator@dispatch.ch');
    await user.type(passwordInput, 'wrong-password');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/INVALID OPERATOR CREDENTIALS/i)).toBeInTheDocument();
      expect(handleSuccess).not.toHaveBeenCalled();
    });
  });

  it('handles 429 Too Many Requests by entering lockout state with countdown and disabling submit', async () => {
    const user = userEvent.setup();
    const handleSuccess = vi.fn();
    const rateLimitError = new Error('Too Many Requests');
    rateLimitError.status = 429;
    rateLimitError.retryAfter = 900; // 15 minutes
    rateLimitError.detail = 'RATE LIMIT EXCEEDED';

    vi.spyOn(apiModule, 'api').mockRejectedValueOnce(rateLimitError);

    render(<LoginForm onLoginSuccess={handleSuccess} />);

    const emailInput = screen.getByLabelText(/EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const submitBtn = screen.getByRole('button', { name: /SIGN IN|LOG IN/i });

    await user.type(emailInput, 'operator@dispatch.ch');
    await user.type(passwordInput, 'some-passphrase');
    await user.click(submitBtn);

    await waitFor(() => {
      // Expect countdown text like "LOCKED: 15:00 REMAINING" or "14:59"
      expect(screen.getByText(/LOCKED.*REMAINING/i)).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();
    });
  });
});
