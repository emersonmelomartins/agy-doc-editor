import type { SpreadsheetMerge } from '@/types';

export type SpreadsheetCell = string | number | null;

export interface ParsedSpreadsheetData {
  data: SpreadsheetCell[][];
  colHeaders: string[];
  rowCount: number;
  colCount: number;
  colWidths?: number[];
  rowHeights?: number[];
  merges?: SpreadsheetMerge[];
  cellFills?: Record<string, string>;
}

const DEFAULT_COL_WIDTH = 100;
const DEFAULT_ROW_HEIGHT = 28;

const DEFAULT_ROW_COUNT = 50;
const DEFAULT_COL_COUNT = 26;
const MIN_COL_WIDTH = 40;
const MAX_COL_WIDTH = 400;
const MIN_ROW_HEIGHT = 20;
const MAX_ROW_HEIGHT = 200;

function generateHeaders(colCount: number): string[] {
  return Array.from({ length: colCount }, (_, i) => {
    let n = i;
    let label = '';

    while (n >= 0) {
      label = String.fromCharCode((n % 26) + 65) + label;
      n = Math.floor(n / 26) - 1;
    }

    return label;
  });
}

function normalizeGrid(data: unknown, rowCount: number, colCount: number): SpreadsheetCell[][] {
  const sourceRows = Array.isArray(data) ? data : [];

  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const row = Array.isArray(sourceRows[rowIndex]) ? sourceRows[rowIndex] : [];

    return Array.from({ length: colCount }, (_, colIndex) => {
      const value = row[colIndex];
      return value === undefined ? null : (value as SpreadsheetCell);
    });
  });
}

function normalizeColWidths(raw: unknown, colCount: number): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, colCount)
    .map((w) => {
      const n = Number(w);
      if (!Number.isFinite(n) || n < MIN_COL_WIDTH) return DEFAULT_COL_WIDTH;
      return Math.min(MAX_COL_WIDTH, n);
    });
}

function normalizeRowHeights(raw: unknown, rowCount: number): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, rowCount)
    .map((h) => {
      const n = Number(h);
      if (!Number.isFinite(n) || n < MIN_ROW_HEIGHT) return DEFAULT_ROW_HEIGHT;
      return Math.min(MAX_ROW_HEIGHT, n);
    });
}

function isSpreadsheetMerge(m: unknown): m is SpreadsheetMerge {
  return (
    typeof m === 'object' &&
    m !== null &&
    typeof (m as SpreadsheetMerge).startRow === 'number' &&
    typeof (m as SpreadsheetMerge).startCol === 'number' &&
    typeof (m as SpreadsheetMerge).endRow === 'number' &&
    typeof (m as SpreadsheetMerge).endCol === 'number'
  );
}

function normalizeMerges(raw: unknown, rowCount: number, colCount: number): SpreadsheetMerge[] {
  if (!Array.isArray(raw)) return [];
  const merges: SpreadsheetMerge[] = [];
  for (const item of raw) {
    if (!isSpreadsheetMerge(item)) continue;
    const startRow = Math.max(0, Math.min(item.startRow, rowCount - 1));
    const startCol = Math.max(0, Math.min(item.startCol, colCount - 1));
    const endRow = Math.max(startRow, Math.min(item.endRow, rowCount - 1));
    const endCol = Math.max(startCol, Math.min(item.endCol, colCount - 1));
    if (startRow === endRow && startCol === endCol) continue;
    merges.push({ startRow, startCol, endRow, endCol });
  }
  return merges;
}

function normalizeCellFills(raw: unknown): Record<string, string> {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: Record<string, string> = {};
  const keyRe = /^\d+,\d+$/;
  for (const [key, value] of Object.entries(raw)) {
    if (typeof key === 'string' && keyRe.test(key) && typeof value === 'string' && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

function parseCellReference(reference: string): { row: number; col: number } | null {
  const match = reference.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;

  const [, colLabel, rowLabel] = match;

  let col = 0;
  for (const char of colLabel) {
    col = col * 26 + (char.charCodeAt(0) - 64);
  }

  const row = Number(rowLabel) - 1;
  const column = col - 1;
  if (row < 0 || column < 0) return null;

  return { row, col: column };
}

function isValidExpression(expression: string): boolean {
  return /^[\d+\-*/().\s]+$/.test(expression);
}

function computeSumRange(rangeStart: string, rangeEnd: string, data: SpreadsheetCell[][], visited: Set<string>): number {
  const start = parseCellReference(rangeStart);
  const end = parseCellReference(rangeEnd);
  if (!start || !end) return 0;

  let total = 0;
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      total += getCellNumericValue(data[row]?.[col] ?? null, data, visited, `${row}:${col}`);
    }
  }

  return total;
}

function evaluateFormula(formula: string, data: SpreadsheetCell[][], visited: Set<string>): number {
  const normalized = formula.trim();

  const sumMatch = normalized.match(/^SUM\(\s*([^:]+)\s*:\s*([^)]+)\s*\)$/i);
  if (sumMatch) {
    const [, startRef, endRef] = sumMatch;
    return computeSumRange(startRef, endRef, data, visited);
  }

  const expressionWithValues = normalized.replace(/\b([A-Z]+\d+)\b/gi, (match) => {
    const ref = parseCellReference(match);
    if (!ref) return '0';
    return String(getCellNumericValue(data[ref.row]?.[ref.col] ?? null, data, visited, `${ref.row}:${ref.col}`));
  });

  if (!isValidExpression(expressionWithValues)) return Number.NaN;

  try {
    const result = Function(`"use strict"; return (${expressionWithValues});`)();
    return typeof result === 'number' && Number.isFinite(result) ? result : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

function getCellNumericValue(
  value: SpreadsheetCell,
  data: SpreadsheetCell[][],
  visited: Set<string>,
  key: string
): number {
  if (typeof value === 'number') return value;

  if (typeof value !== 'string') return 0;

  const trimmed = value.trim();

  if (!trimmed.startsWith('=')) {
    const asNumber = Number(trimmed);
    return Number.isFinite(asNumber) ? asNumber : 0;
  }

  if (visited.has(key)) return 0;
  visited.add(key);

  const result = evaluateFormula(trimmed.slice(1), data, visited);
  visited.delete(key);

  return Number.isFinite(result) ? result : 0;
}

export function evaluateSpreadsheetCellValue(value: SpreadsheetCell, data: SpreadsheetCell[][]): string {
  if (typeof value !== 'string' || !value.trim().startsWith('=')) {
    return String(value ?? '');
  }

  const computed = evaluateFormula(value.trim().slice(1), data, new Set());
  return Number.isFinite(computed) ? String(computed) : '#ERRO';
}

export function parseSpreadsheetContent(content: string): ParsedSpreadsheetData {
  try {
    const parsed = content ? JSON.parse(content) : {};

    const rowCountFromData = Array.isArray(parsed?.data) ? parsed.data.length : 0;
    const colCountFromData = Array.isArray(parsed?.data)
      ? Math.max(0, ...parsed.data.map((row: unknown) => (Array.isArray(row) ? row.length : 0)))
      : 0;

    const rowCount = Number.isInteger(parsed?.rowCount) && parsed.rowCount > 0
      ? parsed.rowCount
      : Math.max(rowCountFromData, DEFAULT_ROW_COUNT);

    const colCount = Number.isInteger(parsed?.colCount) && parsed.colCount > 0
      ? parsed.colCount
      : Math.max(colCountFromData, DEFAULT_COL_COUNT);

    const headers = Array.isArray(parsed?.colHeaders)
      ? parsed.colHeaders.filter((h: unknown): h is string => typeof h === 'string').slice(0, colCount)
      : [];

    const data = normalizeGrid(parsed?.data, rowCount, colCount);
    const colHeaders = headers.length === colCount ? headers : generateHeaders(colCount);
    const colWidths = normalizeColWidths(parsed?.colWidths, colCount);
    const rowHeights = normalizeRowHeights(parsed?.rowHeights, rowCount);
    const merges = normalizeMerges(parsed?.merges, rowCount, colCount);
    const cellFills = normalizeCellFills(parsed?.cellFills);

    return {
      data,
      rowCount,
      colCount,
      colHeaders,
      ...(colWidths.length > 0 && { colWidths }),
      ...(rowHeights.length > 0 && { rowHeights }),
      ...(merges.length > 0 && { merges }),
      ...(Object.keys(cellFills).length > 0 && { cellFills }),
    };
  } catch {
    return {
      data: normalizeGrid([], DEFAULT_ROW_COUNT, DEFAULT_COL_COUNT),
      rowCount: DEFAULT_ROW_COUNT,
      colCount: DEFAULT_COL_COUNT,
      colHeaders: generateHeaders(DEFAULT_COL_COUNT),
    };
  }
}

export { DEFAULT_COL_WIDTH, DEFAULT_ROW_HEIGHT };
