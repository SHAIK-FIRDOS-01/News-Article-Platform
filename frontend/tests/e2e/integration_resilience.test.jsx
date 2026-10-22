import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fs from 'fs';
import path from 'path';

import { App } from '../../src/App.jsx';
import { SwissErrorBoundary } from '../../src/components/ui/SwissErrorBoundary.jsx';
import { NetworkBanner } from '../../src/components/ui/NetworkBanner.jsx';
import { useArticleInteractions } from '../../src/hooks/useArticleInteractions.js';
import * as apiModule from '../../src/lib/api.js';

describe('TICKET INT-8: Comprehensive End-to-End Integration & Security Verification', () => {
  let originalOnLine;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    window.history.pushState(null, '', '/');
  });

  afterEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
  });

  describe('1. Network Resilience & Real-Time Sync Verification', () => {
    it('displays stark Swiss offline banner on network severance and dismisses upon restoration', async () => {
      render(<NetworkBanner />);

      // Initially online: no banner
      expect(screen.queryByTestId('network-banner')).not.toBeInTheDocument();

      // Trigger browser offline event
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        window.dispatchEvent(new Event('offline'));
      });

      // Offline banner is immediately visible with Swiss styling
      const banner = await screen.findByTestId('network-banner');
      expect(banner).toBeInTheDocument();
      expect(screen.getByText(/SYSTEM STATUS: OFFLINE \/\/ DISPLAYING CACHED HEADLINES/i)).toBeInTheDocument();
      expect(banner).toHaveClass('border-b-2');
      expect(banner).toHaveClass('border-red-600');

      // Trigger browser online event
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        window.dispatchEvent(new Event('online'));
      });

      // Offline banner is dismissed
      await waitFor(() => {
        expect(screen.queryByTestId('network-banner')).not.toBeInTheDocument();
      });
    });
  });

  describe('2. Optimistic Interaction & Guaranteed Snapshot Rollback Verification', () => {
    function OptimisticTestConsumer() {
      const initialArticle = {
        id: 99,
        title: 'Quantum Cryptography Protocol',
        is_bookmarked: false,
        is_read: false,
      };
      const { articles, toggleBookmark, errorToast } = useArticleInteractions({
        initialArticles: [initialArticle],
      });

      const current = articles[0] || initialArticle;

      return (
        <div>
          <div data-testid="article-title">{current.title}</div>
          <div data-testid="bookmark-state">{current.is_bookmarked ? 'SAVED' : 'UNSAVED'}</div>
          {errorToast && <div data-testid="error-toast">{errorToast}</div>}
          <button
            type="button"
            data-testid="toggle-button"
            onClick={() => toggleBookmark(current).catch(() => {})}
          >
            TOGGLE
          </button>
        </div>
      );
    }

    it('optimistically updates UI instantly, rolls back to snapshot on API failure, and shows Swiss toast', async () => {
      const user = userEvent.setup();

      // Mock API call to simulate network failure
      vi.spyOn(apiModule, 'api').mockRejectedValueOnce(new Error('Backend unreachable'));

      render(<OptimisticTestConsumer />);

      expect(screen.getByTestId('bookmark-state')).toHaveTextContent('UNSAVED');

      // Click toggle
      const btn = screen.getByTestId('toggle-button');
      await user.click(btn);

      // Optimistically flipped to SAVED immediately
      expect(screen.getByTestId('bookmark-state')).toHaveTextContent('SAVED');

      // After API rejection, rolls back to snapshot UNSAVED and displays Swiss error toast
      await waitFor(() => {
        expect(screen.getByTestId('bookmark-state')).toHaveTextContent('UNSAVED');
        expect(screen.getByTestId('error-toast')).toHaveTextContent(/ACTION ABORTED \/\/ UNABLE TO REACH SERVER/i);
      });
    });
  });

  describe('3. Isolated Swiss Error Boundary & Fault Containment Verification', () => {
    function BrokenSubsystem() {
      throw new Error('Fatal Component Memory Fault');
    }

    it('contains rendering exceptions in isolated subtrees without crashing surrounding DOM', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <div data-testid="root-shell">
          <header data-testid="stable-header">STABLE MASTHEAD ACTIVE</header>
          <SwissErrorBoundary moduleName="CRITICAL_RADAR">
            <BrokenSubsystem />
          </SwissErrorBoundary>
          <footer data-testid="stable-footer">STABLE FOOTER ACTIVE</footer>
        </div>
      );

      // Sibling elements remain completely healthy and rendered
      expect(screen.getByTestId('stable-header')).toBeInTheDocument();
      expect(screen.getByTestId('stable-footer')).toBeInTheDocument();

      // Isolated crash boundary renders brutalist Swiss error UI
      const fallback = screen.getByTestId('swiss-error-boundary-fallback');
      expect(fallback).toBeInTheDocument();
      expect(screen.getByText(/CRITICAL_RADAR/i)).toBeInTheDocument();
      expect(screen.getByText(/Fatal Component Memory Fault/i)).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('4. Architectural & Static Security Invariants Sweep', () => {
    function getAllFiles(dir, extensions) {
      let results = [];
      if (!fs.existsSync(dir)) return results;
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

    const rootDir = path.resolve(__dirname, '../../');
    const srcDir = path.resolve(rootDir, 'src');
    const appDir = path.resolve(rootDir, 'app');

    it('INVARIANT 1: Zero TypeScript in frontend (pure .js and .jsx only)', () => {
      const tsFiles = getAllFiles(srcDir, ['.ts', '.tsx']);
      expect(
        tsFiles.length,
        `Architectural violation: TypeScript files found in src/: ${tsFiles.join(', ')}`
      ).toBe(0);
    });

    it('INVARIANT 2: Zero external state libraries in package.json (Ponytail Ultra Simplicity)', () => {
      const pkgPath = path.resolve(rootDir, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      const forbiddenLibraries = [
        'redux',
        'react-redux',
        '@reduxjs/toolkit',
        'zustand',
        'mobx',
        'mobx-react',
        '@tanstack/react-query',
        'react-query',
        'jotai',
        'recoil',
        'xstate',
      ];

      for (const lib of forbiddenLibraries) {
        expect(
          allDeps[lib],
          `Architectural violation: Forbidden state management dependency '${lib}' found in package.json`
        ).toBeUndefined();
      }
    });

    it('INVARIANT 3: Zero dangerouslySetInnerHTML in frontend source files', () => {
      const sourceFiles = getAllFiles(srcDir, ['.js', '.jsx']);
      for (const filePath of sourceFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(
          content.includes('dangerouslySetInnerHTML'),
          `Security violation: dangerouslySetInnerHTML detected in ${filePath}`
        ).toBe(false);
      }
    });

    it('INVARIANT 4: Zero client-side token storage in localStorage or sessionStorage', () => {
      const sourceFiles = getAllFiles(srcDir, ['.js', '.jsx']);
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

    it('INVARIANT 5: All outbound external links strictly enforce rel="noopener noreferrer"', () => {
      const jsxFiles = getAllFiles(srcDir, ['.jsx']);
      for (const filePath of jsxFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const anchorMatches = content.match(/<a[^>]*target=["']_blank["'][^>]*>/g) || [];
        for (const anchor of anchorMatches) {
          expect(
            anchor.includes('rel="noopener noreferrer"'),
            `Security violation: target="_blank" missing rel="noopener noreferrer" in ${filePath}`
          ).toBe(true);
        }
      }
    });
  });
});
