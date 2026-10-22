import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '../../src/components/auth/RegisterForm.jsx';
import * as apiModule from '../../src/lib/api.js';

describe('TICKET 3.2: User Registration Form with Disposable Email Check (RegisterForm)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders registration form fields and submit button', () => {
    render(<RegisterForm onRegisterSuccess={vi.fn()} />);

    expect(screen.getByLabelText(/EMAIL/i)).toBeInTheDocument();
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    expect(passwordInput).toBeInTheDocument();
    // Security Gate: type="password"
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /REGISTER|CREATE ACCOUNT/i })).toBeInTheDocument();
  });

  it('blocks disposable email domains on client side and displays error', async () => {
    const user = userEvent.setup();
    const handleSuccess = vi.fn();
    const apiSpy = vi.spyOn(apiModule, 'api');

    render(<RegisterForm onRegisterSuccess={handleSuccess} />);

    const emailInput = screen.getByLabelText(/EMAIL/i);
    const submitBtn = screen.getByRole('button', { name: /REGISTER|CREATE ACCOUNT/i });

    await user.type(emailInput, 'operator@mailinator.com');
    await user.click(submitBtn);

    expect(await screen.findByText(/DISPOSABLE/i)).toBeInTheDocument();
    expect(apiSpy).not.toHaveBeenCalled();
    expect(handleSuccess).not.toHaveBeenCalled();
  });

  it('enforces password minimum length of 8 characters', async () => {
    const user = userEvent.setup();
    const handleSuccess = vi.fn();
    const apiSpy = vi.spyOn(apiModule, 'api');

    render(<RegisterForm onRegisterSuccess={handleSuccess} />);

    const emailInput = screen.getByLabelText(/EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const submitBtn = screen.getByRole('button', { name: /REGISTER|CREATE ACCOUNT/i });

    await user.type(emailInput, 'operator@dispatch.ch');
    await user.type(passwordInput, '1234');
    await user.click(submitBtn);

    expect(await screen.findByText(/AT LEAST 8 CHARACTERS/i)).toBeInTheDocument();
    expect(apiSpy).not.toHaveBeenCalled();
  });

  it('submits valid registration and calls onRegisterSuccess with email', async () => {
    const user = userEvent.setup();
    const handleSuccess = vi.fn();
    const apiSpy = vi.spyOn(apiModule, 'api').mockResolvedValueOnce({
      status: 'pending_verification',
      email: 'operator@dispatch.ch',
    });

    render(<RegisterForm onRegisterSuccess={handleSuccess} />);

    const emailInput = screen.getByLabelText(/EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const submitBtn = screen.getByRole('button', { name: /REGISTER|CREATE ACCOUNT/i });

    await user.type(emailInput, 'operator@dispatch.ch');
    await user.type(passwordInput, 'secure-passphrase-123');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith('/api/v1/auth/register', {
        method: 'POST',
        body: {
          email: 'operator@dispatch.ch',
          password: 'secure-passphrase-123',
        },
      });
      expect(handleSuccess).toHaveBeenCalledWith('operator@dispatch.ch');
    });
  });

  it('renders API error message when registration request fails', async () => {
    const user = userEvent.setup();
    const handleSuccess = vi.fn();
    vi.spyOn(apiModule, 'api').mockRejectedValueOnce({
      detail: 'OPERATOR IDENTITY ALREADY REGISTERED',
    });

    render(<RegisterForm onRegisterSuccess={handleSuccess} />);

    const emailInput = screen.getByLabelText(/EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const submitBtn = screen.getByRole('button', { name: /REGISTER|CREATE ACCOUNT/i });

    await user.type(emailInput, 'existing@dispatch.ch');
    await user.type(passwordInput, 'secure-passphrase-123');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/OPERATOR IDENTITY ALREADY REGISTERED/i)).toBeInTheDocument();
      expect(handleSuccess).not.toHaveBeenCalled();
    });
  });
});
