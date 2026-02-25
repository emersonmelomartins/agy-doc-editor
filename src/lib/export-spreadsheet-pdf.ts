import type { SpreadsheetData } from '@/types';
import { evaluateSpreadsheetCellValue } from '@/lib/spreadsheet';
import { buildExportFileName } from '@/utils/file-download';

type JsPdfTextOptions = {
  maxWidth?: number;
};

type JsPdfLike = {
  internal: {
    pageSize: {
      getWidth: () => number;
      getHeight: () => number;
    };
  };
  addPage: () => void;
  setFontSize: (size: number) => void;
  text: (text: string | string[], x: number, y: number, options?: JsPdfTextOptions) => void;
  rect: (x: number, y: number, width: number, height: number) => void;
  splitTextToSize: (text: string, maxWidth: number) => string[] | string;
  save: (filename: string) => void;
};

type JsPdfConstructor = new (options: {
  orientation: 'landscape';
  unit: 'mm';
  format: 'a4';
}) => JsPdfLike;

const PAGE_MARGIN_MM = 10;
const TITLE_HEIGHT_MM = 8;
const SUBTITLE_HEIGHT_MM = 6;
const HEADER_MIN_ROW_HEIGHT_MM = 8;
const DATA_MIN_ROW_HEIGHT_MM = 7;
const ROW_INDEX_COL_WIDTH_MM = 12;
const MIN_DATA_COL_WIDTH_MM = 22;
const CELL_PADDING_X_MM = 1.2;
const CELL_PADDING_Y_MM = 1.4;
const CELL_LINE_HEIGHT_MM = 3.4;
const CELL_TEXT_BASELINE_ADJUST_MM = 0.8;
const CELL_FONT_SIZE_PT = 8;
const TITLE_MAX_LENGTH = 120;

type PreparedRowChunk = {
  rowNumber: number;
  rowLabel: string;
  height: number;
  cells: string[][];
};

function columnIndexToLabel(index: number): string {
  let n = index;
  let label = '';
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const safeMax = Math.max(4, maxLength);
  return `${text.slice(0, safeMax - 3)}...`;
}

function sanitizeInlineText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function wrapTextByCharLimit(text: string, maxCharsPerLine: number): string[] {
  const normalized = sanitizeInlineText(text);
  if (!normalized) return [''];

  const lines: string[] = [];
  let remaining = normalized;
  while (remaining.length > maxCharsPerLine) {
    let breakAt = remaining.lastIndexOf(' ', maxCharsPerLine);
    if (breakAt <= 0) breakAt = maxCharsPerLine;

    const line = remaining.slice(0, breakAt).trim();
    if (line) lines.push(line);
    remaining = remaining.slice(breakAt).trimStart();
  }

  if (remaining) lines.push(remaining);
  return lines.length > 0 ? lines : [''];
}

function splitTextToCellLines(
  pdf: JsPdfLike,
  text: string,
  maxTextWidthMm: number,
  fallbackMaxCharsPerLine: number
): string[] {
  const normalized = text.replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];

  for (const paragraph of normalized) {
    const plainParagraph = sanitizeInlineText(paragraph);
    if (!plainParagraph) {
      lines.push('');
      continue;
    }

    try {
      const wrapped = pdf.splitTextToSize(plainParagraph, maxTextWidthMm);
      const wrappedLines = Array.isArray(wrapped) ? wrapped.map(String) : [String(wrapped)];
      lines.push(...(wrappedLines.length > 0 ? wrappedLines : ['']));
    } catch {
      lines.push(...wrapTextByCharLimit(plainParagraph, fallbackMaxCharsPerLine));
    }
  }

  return lines.length > 0 ? lines : [''];
}

function getRowHeightForLineCount(lineCount: number, minimumHeight: number): number {
  return Math.max(minimumHeight, CELL_PADDING_Y_MM * 2 + lineCount * CELL_LINE_HEIGHT_MM);
}

function sliceCellLines(lines: string[], lineStart: number, lineCount: number): string[] {
  const chunk = lines.slice(lineStart, lineStart + lineCount);
  return chunk.length > 0 ? chunk : [''];
}

function paginateRowChunks(chunks: PreparedRowChunk[], maxRowsAreaHeight: number): Array<{ start: number; end: number }> {
  if (chunks.length === 0) return [];

  const pages: Array<{ start: number; end: number }> = [];
  let currentIndex = 0;

  while (currentIndex < chunks.length) {
    const pageStart = currentIndex;
    let usedHeight = 0;

    while (currentIndex < chunks.length) {
      const nextHeight = chunks[currentIndex].height;
      if (usedHeight + nextHeight > maxRowsAreaHeight && currentIndex > pageStart) {
        break;
      }
      usedHeight += nextHeight;
      currentIndex += 1;
    }

    if (currentIndex === pageStart) {
      currentIndex += 1;
    }
    pages.push({ start: pageStart, end: currentIndex });
  }

  return pages;
}

function normalizeCellText(rawValue: string | number | null, data: SpreadsheetData['data']): string {
  const evaluated = evaluateSpreadsheetCellValue(rawValue, data);
  const normalized = evaluated
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => sanitizeInlineText(line))
    .join('\n')
    .trim();
  return normalized;
}

type BuildRowChunksArgs = {
  pdf: JsPdfLike;
  sheetData: SpreadsheetData;
  rowCount: number;
  colStart: number;
  colEndExclusive: number;
  dataColWidth: number;
  rowsAreaHeight: number;
};

function buildRowChunksForColumns({
  pdf,
  sheetData,
  rowCount,
  colStart,
  colEndExclusive,
  dataColWidth,
  rowsAreaHeight,
}: BuildRowChunksArgs): PreparedRowChunk[] {
  const maxTextWidthMm = Math.max(4, dataColWidth - CELL_PADDING_X_MM * 2);
  const fallbackMaxCharsPerLine = Math.max(4, Math.floor(maxTextWidthMm / 1.8));
  const maxLinesPerChunk = Math.max(1, Math.floor((rowsAreaHeight - CELL_PADDING_Y_MM * 2) / CELL_LINE_HEIGHT_MM));
  const rowChunks: PreparedRowChunk[] = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const cellLinesByColumn: string[][] = [];
    let rowMaxLineCount = 1;

    for (let colIndex = colStart; colIndex < colEndExclusive; colIndex += 1) {
      const rawValue = sheetData.data[rowIndex]?.[colIndex] ?? null;
      const normalized = normalizeCellText(rawValue, sheetData.data);
      const wrappedLines = splitTextToCellLines(pdf, normalized, maxTextWidthMm, fallbackMaxCharsPerLine);
      rowMaxLineCount = Math.max(rowMaxLineCount, wrappedLines.length);
      cellLinesByColumn.push(wrappedLines);
    }

    for (let lineStart = 0; lineStart < rowMaxLineCount; lineStart += maxLinesPerChunk) {
      const lineCount = Math.min(maxLinesPerChunk, rowMaxLineCount - lineStart);
      const chunkCells = cellLinesByColumn.map((lines) => sliceCellLines(lines, lineStart, lineCount));
      rowChunks.push({
        rowNumber: rowIndex + 1,
        rowLabel: lineStart === 0 ? String(rowIndex + 1) : '',
        height: getRowHeightForLineCount(lineCount, DATA_MIN_ROW_HEIGHT_MM),
        cells: chunkCells,
      });
    }
  }

  return rowChunks;
}

function drawCell(
  pdf: JsPdfLike,
  lines: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  fontSizePt: number
): void {
  pdf.rect(x, y, width, height);
  pdf.setFontSize(fontSizePt);

  const maxLinesInCell = Math.max(1, Math.floor((height - CELL_PADDING_Y_MM * 2) / CELL_LINE_HEIGHT_MM));
  const linesToDraw = lines.slice(0, maxLinesInCell);

  for (let lineIndex = 0; lineIndex < linesToDraw.length; lineIndex += 1) {
    const line = linesToDraw[lineIndex];
    const baselineY =
      y + CELL_PADDING_Y_MM + (lineIndex + 1) * CELL_LINE_HEIGHT_MM - CELL_TEXT_BASELINE_ADJUST_MM;
    pdf.text(line, x + CELL_PADDING_X_MM, baselineY, { maxWidth: width - CELL_PADDING_X_MM * 2 });
  }
}

function drawHeaderRow(
  pdf: JsPdfLike,
  headers: string[],
  colStart: number,
  colEndExclusive: number,
  xStart: number,
  y: number,
  dataColWidth: number
): number {
  const maxTextWidthMm = Math.max(4, dataColWidth - CELL_PADDING_X_MM * 2);
  const fallbackMaxCharsPerLine = Math.max(4, Math.floor(maxTextWidthMm / 1.8));

  const headerLinesByColumn: string[][] = [];
  let maxHeaderLines = 1;
  for (let col = colStart; col < colEndExclusive; col += 1) {
    const headerText = headers[col] ?? columnIndexToLabel(col);
    const wrapped = splitTextToCellLines(pdf, headerText, maxTextWidthMm, fallbackMaxCharsPerLine);
    maxHeaderLines = Math.max(maxHeaderLines, wrapped.length);
    headerLinesByColumn.push(wrapped);
  }

  const headerHeight = getRowHeightForLineCount(maxHeaderLines, HEADER_MIN_ROW_HEIGHT_MM);
  let x = xStart;
  drawCell(pdf, ['#'], x, y, ROW_INDEX_COL_WIDTH_MM, headerHeight, CELL_FONT_SIZE_PT);
  x += ROW_INDEX_COL_WIDTH_MM;

  for (let index = 0; index < headerLinesByColumn.length; index += 1) {
    drawCell(pdf, headerLinesByColumn[index], x, y, dataColWidth, headerHeight, CELL_FONT_SIZE_PT);
    x += dataColWidth;
  }

  return headerHeight;
}

function getUsedBounds(sheetData: SpreadsheetData): { maxRow: number; maxCol: number } {
  let maxRow = -1;
  let maxCol = -1;

  for (let rowIndex = 0; rowIndex < sheetData.data.length; rowIndex += 1) {
    const row = sheetData.data[rowIndex] ?? [];
    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const rawValue = row[colIndex];
      const hasContent =
        typeof rawValue === 'number' ||
        (typeof rawValue === 'string' && rawValue.trim().length > 0);

      if (!hasContent) continue;

      maxRow = Math.max(maxRow, rowIndex);
      maxCol = Math.max(maxCol, colIndex);
    }
  }

  return { maxRow, maxCol };
}

type DrawPageArgs = {
  pdf: JsPdfLike;
  filename: string;
  colStart: number;
  colEndExclusive: number;
  headers: string[];
  rowChunks: PreparedRowChunk[];
  dataColWidth: number;
};

function drawSpreadsheetPage({
  pdf,
  filename,
  colStart,
  colEndExclusive,
  headers,
  rowChunks,
  dataColWidth,
}: DrawPageArgs): void {
  let y = PAGE_MARGIN_MM;
  pdf.setFontSize(12);
  pdf.text(truncateText(filename, TITLE_MAX_LENGTH), PAGE_MARGIN_MM, y + 4.5);
  y += TITLE_HEIGHT_MM;

  const firstRow = rowChunks[0]?.rowNumber ?? 1;
  const lastRow = rowChunks[rowChunks.length - 1]?.rowNumber ?? firstRow;
  const rangeText =
    `Linhas ${firstRow}-${lastRow} | ` +
    `Colunas ${columnIndexToLabel(colStart)}-${columnIndexToLabel(colEndExclusive - 1)}`;
  pdf.setFontSize(9);
  pdf.text(truncateText(rangeText, TITLE_MAX_LENGTH), PAGE_MARGIN_MM, y + 3.8);
  y += SUBTITLE_HEIGHT_MM;

  const headerHeight = drawHeaderRow(pdf, headers, colStart, colEndExclusive, PAGE_MARGIN_MM, y, dataColWidth);
  y += headerHeight;

  for (const rowChunk of rowChunks) {
    let x = PAGE_MARGIN_MM;
    drawCell(pdf, [rowChunk.rowLabel], x, y, ROW_INDEX_COL_WIDTH_MM, rowChunk.height, CELL_FONT_SIZE_PT);
    x += ROW_INDEX_COL_WIDTH_MM;

    for (const cellLines of rowChunk.cells) {
      drawCell(pdf, cellLines, x, y, dataColWidth, rowChunk.height, CELL_FONT_SIZE_PT);
      x += dataColWidth;
    }

    y += rowChunk.height;
  }
}

export async function exportSpreadsheetToPdf(sheetData: SpreadsheetData, filename: string): Promise<void> {
  try {
    const jsPdfModule = await import('jspdf');
    const JsPdf = jsPdfModule.default as unknown as JsPdfConstructor;
    const pdf = new JsPdf({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const { maxRow, maxCol } = getUsedBounds(sheetData);
    if (maxRow < 0 || maxCol < 0) {
      pdf.setFontSize(12);
      pdf.text(truncateText(filename, TITLE_MAX_LENGTH), PAGE_MARGIN_MM, PAGE_MARGIN_MM + 4.5);
      pdf.setFontSize(10);
      pdf.text('Planilha vazia', PAGE_MARGIN_MM, PAGE_MARGIN_MM + 14);
      pdf.save(buildExportFileName(filename, 'pdf'));
      return;
    }

    const rowCount = maxRow + 1;
    const colCount = maxCol + 1;

    const headers = Array.from({ length: colCount }, (_, index) => {
      const provided = sheetData.colHeaders[index];
      return typeof provided === 'string' && provided.trim().length > 0
        ? provided.trim()
        : columnIndexToLabel(index);
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const tableWidth = pageWidth - PAGE_MARGIN_MM * 2;
    const maxColsPerPageByWidth = Math.max(
      1,
      Math.floor((tableWidth - ROW_INDEX_COL_WIDTH_MM) / MIN_DATA_COL_WIDTH_MM),
    );

    let wrotePage = false;
    for (let colStart = 0; colStart < colCount; colStart += maxColsPerPageByWidth) {
      const colEndExclusive = Math.min(colCount, colStart + maxColsPerPageByWidth);
      const visibleColCount = Math.max(1, colEndExclusive - colStart);
      const dataColWidth = (tableWidth - ROW_INDEX_COL_WIDTH_MM) / visibleColCount;

      const headerHeight = (() => {
        const maxTextWidthMm = Math.max(4, dataColWidth - CELL_PADDING_X_MM * 2);
        const fallbackMaxCharsPerLine = Math.max(4, Math.floor(maxTextWidthMm / 1.8));
        let maxHeaderLines = 1;
        for (let col = colStart; col < colEndExclusive; col += 1) {
          const headerText = headers[col] ?? columnIndexToLabel(col);
          const wrapped = splitTextToCellLines(pdf, headerText, maxTextWidthMm, fallbackMaxCharsPerLine);
          maxHeaderLines = Math.max(maxHeaderLines, wrapped.length);
        }
        return getRowHeightForLineCount(maxHeaderLines, HEADER_MIN_ROW_HEIGHT_MM);
      })();

      const rowsAreaTop = PAGE_MARGIN_MM + TITLE_HEIGHT_MM + SUBTITLE_HEIGHT_MM + headerHeight;
      const rowsAreaHeight = pageHeight - PAGE_MARGIN_MM - rowsAreaTop;
      if (rowsAreaHeight <= 0) continue;

      const rowChunks = buildRowChunksForColumns({
        pdf,
        sheetData,
        rowCount,
        colStart,
        colEndExclusive,
        dataColWidth,
        rowsAreaHeight,
      });

      const rowChunkPages = paginateRowChunks(rowChunks, rowsAreaHeight);
      for (const pageRange of rowChunkPages) {
        const pageRowChunks = rowChunks.slice(pageRange.start, pageRange.end);
        if (wrotePage) {
          pdf.addPage();
        }

        drawSpreadsheetPage({
          pdf,
          filename,
          colStart,
          colEndExclusive,
          headers,
          rowChunks: pageRowChunks,
          dataColWidth,
        });
        wrotePage = true;
      }
    }

    pdf.save(buildExportFileName(filename, 'pdf'));
  } catch (error) {
    console.error('Spreadsheet PDF Export Error:', error);
    alert('Erro ao exportar planilha em PDF.');
  }
}
