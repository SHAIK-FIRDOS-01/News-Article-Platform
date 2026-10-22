import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fs from 'fs';
import path from 'path';
import { App } from '../../src/App.jsx';
import * as apiModule from '../../src/lib/api.js';

describe('TICKET 6.3: End-to-End Walkthrough & Security Audit Sweep', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.pushState(null, '', '/');
  });

  describe('Automated End-to-End User Journey', () => {
    it(
      'executes complete journey: Register -> OTP -> Login -> Feed -> Category -> Read -> Bookmark -> Share',
      async () => {
        const user = userEvent.setup();

      // Mock API responses for full journey
      vi.spyOn(apiModule, 'api').mockImplementation(async (endpoint, options = {}) => {
        if (endpoint === '/api/v1/auth/register') {
          return { status: 'pending_verification', email: 'operator@signalreport.io' };
        }
        if (endpoint === '/api/v1/auth/verify-code') {
          return { status: 'verified' };
        }
        if (endpoint === '/api/v1/auth/login') {
          return { status: 'authenticated', user: { email: 'operator@signalreport.io' } };
        }
        if (endpoint.startsWith('/api/v1/news/feed')) {
          return {
            articles: [
              {
                id: 'lead-001',
                title: 'AUTONOMOUS COGNITIVE AGENTS TRANSFORM ENTERPRISE DISPATCH',
                description: 'Autonomous systems accelerate mission-critical verification.',
                url: 'https://signalreport.io/lead-story',
                image_url: 'https://images.unsplash.com/lead.jpg',
                source: 'ZÜRICH BUREAU',
                published_at: '1H AGO',
                category: 'TECHNOLOGY',
                is_bookmarked: false,
                is_read: false,
                share_token: 'token-lead-001',
              },
            ],
            has_more: false,
          };
        }
        if (endpoint === '/api/v1/news/bookmarks' && options.method === 'POST') {
          return { status: 'bookmarked' };
        }
        if (endpoint === '/api/v1/news/bookmarks') {
          return { bookmarks: [] };
        }
        if (endpoint === '/api/v1/news/reads' && options.method === 'POST') {
          return { status: 'marked_read' };
        }
        if (endpoint === '/api/v1/news/share/token-lead-001') {
          return {
            id: 'lead-001',
            title: 'AUTONOMOUS COGNITIVE AGENTS TRANSFORM ENTERPRISE DISPATCH',
            description: 'Autonomous systems accelerate mission-critical verification.',
            content: 'In-depth analysis of autonomous agent workflows...',
            url: 'https://signalreport.io/lead-story',
            image_url: 'https://images.unsplash.com/lead.jpg',
            source: 'ZÜRICH BUREAU',
            published_at: '1H AGO',
            category: 'TECHNOLOGY',
          };
        }
        return {};
      });

      render(<App />);

      // Step 1: Switch to Register and submit new account
      const registerSwitch = screen.getByText(/REGISTER/i);
      await user.click(registerSwitch);

      const regEmail = screen.getByLabelText(/01 \/ EMAIL/i);
      const regPassword = screen.getByLabelText(/02 \/ PASSWORD/i);
      const regSubmit = screen.getByRole('button', { name: /CREATE ACCOUNT/i });

      await user.type(regEmail, 'operator@signalreport.io');
      await user.type(regPassword, 'SecretPassphrase123!');
      await user.click(regSubmit);

      // Step 2: Directly navigates to Login to obtain cookie session
      await waitFor(() => {
        expect(screen.getByText(/ANALYST SIGN IN/i)).toBeInTheDocument();
      });

      const loginEmail = screen.getByLabelText(/01 \/ EMAIL ADDRESS/i);
      const loginPassword = screen.getByLabelText(/02 \/ PASSWORD/i);
      const loginSubmit = screen.getByRole('button', { name: /SIGN IN/i });

      await user.type(loginEmail, 'operator@signalreport.io');
      await user.type(loginPassword, 'SecretPassphrase123!');
      await user.click(loginSubmit);

      // Step 4: Dashboard loaded
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /SIGNAL REPORT/i })).toBeInTheDocument();
        expect(screen.getByText('AUTONOMOUS COGNITIVE AGENTS TRANSFORM ENTERPRISE DISPATCH')).toBeInTheDocument();
      });

      // Step 5: Filter by TECHNOLOGY
      const techFilter = screen.getByRole('button', { name: /TECHNOLOGY/i });
      await user.click(techFilter);
      expect(techFilter).toHaveClass('bg-swiss-black');

      // Wait for feed reload
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /MARK AS READ|MARK READ/i })).toBeInTheDocument();
      });

      // Step 6: Mark hero article as read
      const markReadBtn = screen.getByRole('button', { name: /MARK AS READ|MARK READ/i });
      await user.click(markReadBtn);
      await waitFor(() => {
        expect(screen.getByText(/✓ READ/i)).toBeInTheDocument();
      });

      // Step 7: Bookmark article & open Bookmarks Drawer
      const bookmarkBtn = screen.getByRole('button', { name: /BOOKMARK ARTICLE|\+ BOOKMARK/i });
      await user.click(bookmarkBtn);
      await waitFor(() => {
        expect(screen.getByText(/✓ BOOKMARKED/i)).toBeInTheDocument();
      });

      const openBookmarksBtn = screen.getByRole('button', { name: /SAVED BOOKMARKS/i });
      await user.click(openBookmarksBtn);
      await waitFor(() => {
        expect(screen.getByText(/SAVED DISPATCHES \/\/ ARCHIVE/i)).toBeInTheDocument();
      });

      // Close drawer
      const closeDrawerBtn = screen.getByRole('button', { name: /CLOSE/i });
      await user.click(closeDrawerBtn);

      // Step 8: Access public share view
      const shareBtn = screen.getByRole('button', { name: /SHARE ARTICLE|SHARE/i });
      await user.click(shareBtn);

      await waitFor(() => {
        expect(screen.getByText(/PUBLIC ARTICLE BRIEF|PUBLIC DISPATCH DOSSIER/i)).toBeInTheDocument();
      });
    }, 15000);
  });

  describe('Frontend Security Gates Audit Sweep', () => {
    function getAllFiles(dir, extensions) {
      let results = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getAllFiles(fullPath, extensions));
        } else if (extensions.some((ext) => file.endsWith(ext))) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const srcDir = path.resolve(__dirname, '../../src');
    const sourceFiles = getAllFiles(srcDir, ['.js', '.jsx']);

    it('asserts zero dangerouslySetInnerHTML across all src/ files', () => {
      for (const filePath of sourceFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(
          content.includes('dangerouslySetInnerHTML'),
          `Security violation: dangerouslySetInnerHTML found in ${filePath}`
        ).toBe(false);
      }
    });

    it('asserts zero client-side token storage (localStorage / sessionStorage) in src/', () => {
      for (const filePath of sourceFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(
          content.includes('localStorage'),
          `Security violation: localStorage detected in ${filePath}`
        ).toBe(false);
        expect(
          content.includes('sessionStorage'),
          `Security violation: sessionStorage detected in ${filePath}`
        ).toBe(false);
      }
    });

    it('asserts all outbound external links enforce rel="noopener noreferrer"', () => {
      for (const filePath of sourceFiles) {
        if (!filePath.endsWith('.jsx')) continue;
        const content = fs.readFileSync(filePath, 'utf-8');

        // Look for <a tags with target="_blank"
        const anchorMatches = content.match(/<a[^>]*target=["']_blank["'][^>]*>/g) || [];
        for (const anchor of anchorMatches) {
          expect(
            anchor.includes('rel="noopener noreferrer"'),
            `Security violation: target="_blank" without rel="noopener noreferrer" in ${filePath}`
          ).toBe(true);
        }
      }
    });
  });
});
