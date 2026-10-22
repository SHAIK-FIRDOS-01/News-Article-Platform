import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('TICKET 1.2: Minimal Tailwind Theme Mapping', () => {
  const configPath = path.resolve(process.cwd(), 'tailwind.config.js');

  it('verifies tailwind.config.js exists', () => {
    expect(fs.existsSync(configPath)).toBe(true);
  });

  it('verifies tailwind.config.js exports valid theme extension', async () => {
    // Dynamic import to test ES module / CommonJS config resolution
    const tailwindConfigModule = await import(configPath);
    const config = tailwindConfigModule.default || tailwindConfigModule;

    expect(config).toBeDefined();
    expect(config.theme).toBeDefined();

    // Verify colors
    const colors = config.theme.extend?.colors || config.theme.colors;
    expect(colors).toBeDefined();
    expect(colors['swiss-black']).toBeDefined();
    expect(colors['swiss-white']).toBeDefined();
    expect(colors['swiss-red']).toBeDefined();
    expect(colors['swiss-gray']).toBeDefined();

    // Verify border-heavy
    const borderWidth = config.theme.extend?.borderWidth || config.theme.borderWidth;
    expect(borderWidth).toBeDefined();
    expect(borderWidth['heavy']).toBe('2px');

    // Verify universal zero border-radius enforcement
    const borderRadius = config.theme.borderRadius || config.theme.extend?.borderRadius;
    expect(borderRadius).toBeDefined();
    expect(borderRadius['none']).toBe('0');
    expect(borderRadius['DEFAULT']).toBe('0');

    // Verify tracking utilities
    const letterSpacing = config.theme.extend?.letterSpacing || config.theme.letterSpacing;
    expect(letterSpacing).toBeDefined();
    expect(letterSpacing['tighter']).toBeDefined();
    expect(letterSpacing['widest']).toBeDefined();

    // Verify content configuration
    expect(config.content).toContain('./index.html');
    expect(config.content).toContain('./src/**/*.{js,jsx}');
  });
});
