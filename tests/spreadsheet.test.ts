import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateSpreadsheetCellValue, parseSpreadsheetContent } from '../src/lib/spreadsheet.ts';

test('evaluateSpreadsheetCellValue computes SUM ranges', () => {
  const data = [
    [1, 2],
    [3, '=SUM(A1:B1)'],
  ];

  assert.equal(evaluateSpreadsheetCellValue('=SUM(A1:B2)', data), '9');
  assert.equal(evaluateSpreadsheetCellValue(data[1][1], data), '3');
  assert.equal(evaluateSpreadsheetCellValue('=SUM(A1:A3)', [[1]]), '1');
});

test('evaluateSpreadsheetCellValue computes arithmetic with references', () => {
  const data = [
    [10, 2],
    ['=A1-B1', '=A1*B1'],
  ];

  assert.equal(evaluateSpreadsheetCellValue(data[1][0], data), '8');
  assert.equal(evaluateSpreadsheetCellValue(data[1][1], data), '20');
});

test('evaluateSpreadsheetCellValue resolves chained formulas', () => {
  const data = [
    [5],
    ['=A1*2'],
    ['=A2+5'],
  ];

  assert.equal(evaluateSpreadsheetCellValue(data[2][0], data), '15');
});

test('evaluateSpreadsheetCellValue handles invalid formulas and raw values', () => {
  const data = [
    ['7'],
    ['=A1+3'],
    ['=1/('],
    ['=SUM(A1:INVALID)'],
    ['=A5'],
  ];

  assert.equal(evaluateSpreadsheetCellValue(data[1][0], data), '10');
  assert.equal(evaluateSpreadsheetCellValue(data[2][0], data), '#ERRO');
  assert.equal(evaluateSpreadsheetCellValue(data[3][0], data), '0');
  assert.equal(evaluateSpreadsheetCellValue(data[4][0], data), '0');
  assert.equal(evaluateSpreadsheetCellValue('texto puro', data), 'texto puro');
  assert.equal(evaluateSpreadsheetCellValue(42, data), '42');
  assert.equal(evaluateSpreadsheetCellValue(null, data), '');
});

test('evaluateSpreadsheetCellValue handles circular references safely', () => {
  const data = [
    ['=B1'],
    ['=A1'],
  ];

  assert.equal(evaluateSpreadsheetCellValue('=A1', [data[0]]), '0');
  assert.equal(evaluateSpreadsheetCellValue('=B1', [data[0]]), '0');
});

test('evaluateSpreadsheetCellValue blocks unsafe expressions and invalid referenced formulas', () => {
  const data = [
    ['=1/('],
    ['=A1+2'],
    ['abc'],
    ['=A3+2'],
    ['=A0+1'],
  ];

  assert.equal(evaluateSpreadsheetCellValue('=1+alert(1)', data), '#ERRO');
  assert.equal(evaluateSpreadsheetCellValue(data[1][0], data), '2');
  assert.equal(evaluateSpreadsheetCellValue('=1/0', data), '#ERRO');
  assert.equal(evaluateSpreadsheetCellValue(data[3][0], data), '2');
  assert.equal(evaluateSpreadsheetCellValue(data[4][0], data), '1');
});

test('parseSpreadsheetContent normalizes malformed rows and headers', () => {
  const parsed = parseSpreadsheetContent(JSON.stringify({
    data: [[1], [2, 3]],
    rowCount: 2,
    colCount: 3,
    colHeaders: ['A'],
  }));

  assert.equal(parsed.rowCount, 2);
  assert.equal(parsed.colCount, 3);
  assert.equal(parsed.data.length, 2);
  assert.equal(parsed.data[0].length, 3);
  assert.deepEqual(parsed.colHeaders, ['A', 'B', 'C']);
});

test('parseSpreadsheetContent falls back to defaults on invalid JSON', () => {
  const parsed = parseSpreadsheetContent('{invalid-json');

  assert.equal(parsed.rowCount, 50);
  assert.equal(parsed.colCount, 26);
  assert.equal(parsed.data.length, 50);
  assert.equal(parsed.data[0].length, 26);
});

test('parseSpreadsheetContent derives row and column size from data when metadata is invalid', () => {
  const parsed = parseSpreadsheetContent(JSON.stringify({
    data: [[1, 2], [3, 4, 5]],
    rowCount: 0,
    colCount: -2,
    colHeaders: ['X', 'Y', 'Z'],
  }));

  assert.equal(parsed.rowCount, 50);
  assert.equal(parsed.colCount, 26);
  assert.equal(parsed.colHeaders.length, 26);
  assert.equal(parsed.data[0][0], 1);
});

test('parseSpreadsheetContent keeps provided headers when count matches columns', () => {
  const parsed = parseSpreadsheetContent(JSON.stringify({
    data: [[1, 2]],
    rowCount: 1,
    colCount: 2,
    colHeaders: ['Col A', 'Col B'],
  }));

  assert.deepEqual(parsed.colHeaders, ['Col A', 'Col B']);
});

test('parseSpreadsheetContent supports empty content and generated headers beyond Z', () => {
  const parsedFromEmpty = parseSpreadsheetContent('');
  assert.equal(parsedFromEmpty.rowCount, 50);
  assert.equal(parsedFromEmpty.colHeaders[0], 'A');

  const parsedWithGeneratedHeaders = parseSpreadsheetContent(JSON.stringify({
    data: [new Array(28).fill(null)],
    rowCount: 1,
    colCount: 28,
    colHeaders: 'invalid',
  }));

  assert.equal(parsedWithGeneratedHeaders.colHeaders[25], 'Z');
  assert.equal(parsedWithGeneratedHeaders.colHeaders[26], 'AA');
  assert.equal(parsedWithGeneratedHeaders.colHeaders[27], 'AB');
});

test('parseSpreadsheetContent handles non-array rows inside data payload', () => {
  const parsed = parseSpreadsheetContent(JSON.stringify({
    data: [1, [2, 3]],
    rowCount: 2,
    colCount: 2,
    colHeaders: ['A', 'B'],
  }));

  assert.deepEqual(parsed.data[0], [null, null]);
  assert.deepEqual(parsed.data[1], [2, 3]);
});
