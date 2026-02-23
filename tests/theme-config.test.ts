import test from 'node:test';
import assert from 'node:assert/strict';

import { applyThemeTokens, themePresets } from '../src/config/theme.ts';
import { setupBrowserMocks } from './helpers/browser-mocks.ts';

test('theme presets expose light and dark tokens', () => {
  assert.equal(themePresets.dark['--bg'], '#091019');
  assert.equal(themePresets.light['--bg'], '#f5f8fc');
  assert.equal(themePresets.dark['--primary'], '#14b8a6');
});

test('applyThemeTokens sets css variables on document root', () => {
  const ctx = setupBrowserMocks();
  try {
    applyThemeTokens('light');
    assert.equal(ctx.cssVars.get('--text-primary'), '#0f2233');
    assert.equal(ctx.cssVars.get('--bg-card'), '#ffffff');
  } finally {
    ctx.cleanup();
  }
});

test('applyThemeTokens is safe when document is unavailable', () => {
  const runtimeGlobal = globalThis as typeof globalThis & { document?: Document };
  const originalDocument = runtimeGlobal.document;
  Reflect.deleteProperty(runtimeGlobal, 'document');

  assert.doesNotThrow(() => applyThemeTokens('dark'));

  runtimeGlobal.document = originalDocument;
});
