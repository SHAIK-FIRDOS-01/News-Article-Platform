import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('TICKET 1.1: Swiss Tokens & CSS Variable Foundations', () => {
  const cssPath = path.resolve(process.cwd(), 'src/styles/globals.css');
  let cssContent = '';

  beforeEach(() => {
    if (fs.existsSync(cssPath)) {
      cssContent = fs.readFileSync(cssPath, 'utf-8');
    } else {
      cssContent = '';
    }
  });

  it('verifies src/styles/globals.css exists and is non-empty', () => {
    expect(fs.existsSync(cssPath)).toBe(true);
    expect(cssContent.trim().length).toBeGreaterThan(0);
  });

  it('defines required Swiss Design System CSS custom properties in :root', () => {
    // Normalizing whitespace for robust property parsing
    expect(cssContent).toMatch(/--swiss-black:\s*#000000;/i);
    expect(cssContent).toMatch(/--swiss-white:\s*#ffffff;/i);
    expect(cssContent).toMatch(/--swiss-red:\s*#e60000;/i);
    expect(cssContent).toMatch(/--swiss-gray:\s*#f5f5f5;/i);
    expect(cssContent).toMatch(/--border-heavy:\s*2px\s+solid\s+#000000;/i);
  });

  it('enforces universal box-sizing border-box and zero border-radius reset', () => {
    // Universal box-sizing
    expect(cssContent).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{[^}]*box-sizing:\s*border-box;/s);
    // Border-radius zero reset
    expect(cssContent).toMatch(/border-radius:\s*0/);
  });

  it('configures baseline high-contrast sans-serif font on body/root', () => {
    expect(cssContent).toMatch(/font-family:[^;]*Inter[^;]*sans-serif/i);
  });

  it('satisfies Frontend Security Gate: zero @import from external unverified CDNs', () => {
    expect(cssContent).not.toMatch(/@import/i);
  });
});
