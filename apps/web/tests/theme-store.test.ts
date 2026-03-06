import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { useThemeStore } from '../src/store/theme-store.ts';
import { setupBrowserMocks } from './helpers/browser-mocks.ts';

let cleanup: (() => void) | undefined;
let cssVars: Map<string, string> | undefined;

beforeEach(() => {
  const ctx = setupBrowserMocks();
  cleanup = ctx.cleanup;
  cssVars = ctx.cssVars;
  useThemeStore.setState({ theme: 'dark', initialized: false });
});

afterEach(() => {
  cleanup?.();
});

test('theme store initializes from localStorage', () => {
  localStorage.setItem('theme', 'light');
  useThemeStore.getState().initTheme();

  assert.equal(useThemeStore.getState().theme, 'light');
  assert.equal(document.documentElement.getAttribute('data-theme'), 'light');
  assert.equal(cssVars?.get('--bg'), '#f5f8fc');
});

test('theme store toggles and persists theme', () => {
  useThemeStore.getState().initTheme();
  useThemeStore.getState().toggleTheme();

  assert.equal(useThemeStore.getState().theme, 'light');
  assert.equal(localStorage.getItem('theme'), 'light');
  assert.equal(document.documentElement.getAttribute('data-theme'), 'light');
  assert.equal(cssVars?.get('--text-primary'), '#0f2233');
});

test('theme store defaults to dark and ignores repeated init calls', () => {
  useThemeStore.getState().initTheme();
  assert.equal(useThemeStore.getState().theme, 'dark');
  assert.equal(useThemeStore.getState().initialized, true);

  localStorage.setItem('theme', 'light');
  useThemeStore.getState().initTheme();

  assert.equal(useThemeStore.getState().theme, 'dark');
  assert.equal(document.documentElement.getAttribute('data-theme'), 'dark');
});

test('theme store skips initialization when window is unavailable', () => {
  const runtimeGlobal = globalThis as typeof globalThis & { window?: Window };
  const originalWindow = runtimeGlobal.window;
  Reflect.deleteProperty(runtimeGlobal, 'window');

  useThemeStore.getState().initTheme();

  assert.equal(useThemeStore.getState().initialized, false);
  assert.equal(useThemeStore.getState().theme, 'dark');

  runtimeGlobal.window = originalWindow;
});

test('theme store toggles from light back to dark', () => {
  useThemeStore.setState({ theme: 'light', initialized: true });
  useThemeStore.getState().toggleTheme();

  assert.equal(useThemeStore.getState().theme, 'dark');
  assert.equal(localStorage.getItem('theme'), 'dark');
  assert.equal(document.documentElement.getAttribute('data-theme'), 'dark');
});
