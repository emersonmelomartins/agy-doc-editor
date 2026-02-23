import test from 'node:test';
import assert from 'node:assert/strict';

import { calculatePageCount, getPageContentHeight } from '../src/lib/pagination.ts';

test('getPageContentHeight returns A4 content area with default margins', () => {
  assert.equal(getPageContentHeight(), 953);
});

test('calculatePageCount returns at least one page', () => {
  assert.equal(calculatePageCount(0), 1);
  assert.equal(calculatePageCount(-100), 1);
});

test('calculatePageCount rolls over exactly on overflow boundary', () => {
  const pageHeight = 1123;
  assert.equal(calculatePageCount(pageHeight), 1);
  assert.equal(calculatePageCount(pageHeight + 1), 1);
  assert.equal(calculatePageCount(pageHeight + 9), 2);
  assert.equal(calculatePageCount((pageHeight * 3) + 1), 3);
});

test('calculatePageCount supports custom page setup', () => {
  const config = { pageHeight: 1000 };
  assert.equal(getPageContentHeight(config), 830);
  assert.equal(calculatePageCount(1600, config), 2);
  assert.equal(calculatePageCount(1601, config), 2);
});

test('calculatePageCount supports explicit overflow tolerance', () => {
  const pageHeight = 1123;
  assert.equal(calculatePageCount(pageHeight + 3, { overflowTolerance: 3 }), 1);
  assert.equal(calculatePageCount(pageHeight + 4, { overflowTolerance: 3 }), 2);
});
