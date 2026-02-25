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
  text: (text: string, x: number, y: number, options?: JsPdfTextOptions) => void;
  rect: (x: number, y: number, width: number, height: number) => void;
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
const HEADER_ROW_HEIGHT_MM = 8;
const DATA_ROW_HEIGHT_MM = 7;
const ROW_INDEX_COL_WIDTH_MM = 12;
const MIN_DATA_COL_WIDTH_MM = 22;
const MAX_CELL_TEXT_CHARS = 64;

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

function normalizeCellText(rawValue: string | number | null, data: SpreadsheetData['data']): string {
  return evaluateSpreadsheetCellValue(rawValue, data).replace(/\s+/g, ' ').trim();
}

function drawCell(
  pdf: JsPdfLike,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  maxChars: number,
  fontSize: number,
): void {
  pdf.rect(x, y, width, height);
  const clipped = truncateText(text, Math.min(MAX_CELL_TEXT_CHARS, maxChars));
  pdf.setFontSize(fontSize);
  pdf.text(clipped, x + 1.4, y + height / 2 + 1.6, { maxWidth: width - 2.8 });
}

type DrawPageArgs = {
  pdf: JsPdfLike;
  filename: string;
  sheetData: SpreadsheetData;
  headers: string[];
  rowStart: number;
  rowEndExclusive: number;
  colStart: number;
  colEndExclusive: number;
};

function drawSpreadsheetPage({
  pdf,
  filename,
  sheetData,
  headers,
  rowStart,
  rowEndExclusive,
  colStart,
  colEndExclusive,
}: DrawPageArgs): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const tableWidth = pageWidth - PAGE_MARGIN_MM * 2;
  const visibleColCount = Math.max(1, colEndExclusive - colStart);
  const dataColWidth = (tableWidth - ROW_INDEX_COL_WIDTH_MM) / visibleColCount;
  const charsPerDataCell = Math.max(4, Math.floor((dataColWidth - 2) / 1.9));

  let y = PAGE_MARGIN_MM;
  pdf.setFontSize(12);
  pdf.text(truncateText(filename, 80), PAGE_MARGIN_MM, y + 4.5);
  y += TITLE_HEIGHT_MM;

  const rangeText = `Linhas ${rowStart + 1}-${rowEndExclusive} | Colunas ${columnIndexToLabel(colStart)}-${columnIndexToLabel(colEndExclusive - 1)}`;
  pdf.setFontSize(9);
  pdf.text(rangeText, PAGE_MARGIN_MM, y + 3.8);
  y += SUBTITLE_HEIGHT_MM;

  let x = PAGE_MARGIN_MM;
  drawCell(pdf, '#', x, y, ROW_INDEX_COL_WIDTH_MM, HEADER_ROW_HEIGHT_MM, 6, 8);
  x += ROW_INDEX_COL_WIDTH_MM;

  for (let col = colStart; col < colEndExclusive; col += 1) {
    drawCell(pdf, headers[col] ?? columnIndexToLabel(col), x, y, dataColWidth, HEADER_ROW_HEIGHT_MM, charsPerDataCell, 8);
    x += dataColWidth;
  }

  y += HEADER_ROW_HEIGHT_MM;

  for (let row = rowStart; row < rowEndExclusive; row += 1) {
    x = PAGE_MARGIN_MM;
    drawCell(pdf, String(row + 1), x, y, ROW_INDEX_COL_WIDTH_MM, DATA_ROW_HEIGHT_MM, 6, 8);
    x += ROW_INDEX_COL_WIDTH_MM;

    for (let col = colStart; col < colEndExclusive; col += 1) {
      const rawValue = sheetData.data[row]?.[col] ?? null;
      const cellText = normalizeCellText(rawValue, sheetData.data);
      drawCell(pdf, cellText, x, y, dataColWidth, DATA_ROW_HEIGHT_MM, charsPerDataCell, 8);
      x += dataColWidth;
    }

    y += DATA_ROW_HEIGHT_MM;
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
      pdf.text(truncateText(filename, 80), PAGE_MARGIN_MM, PAGE_MARGIN_MM + 4.5);
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
    const rowsAreaTop = PAGE_MARGIN_MM + TITLE_HEIGHT_MM + SUBTITLE_HEIGHT_MM + HEADER_ROW_HEIGHT_MM;
    const rowsAreaHeight = pageHeight - PAGE_MARGIN_MM - rowsAreaTop;
    const rowsPerPage = Math.max(1, Math.floor(rowsAreaHeight / DATA_ROW_HEIGHT_MM));

    let wrotePage = false;
    for (let colStart = 0; colStart < colCount; colStart += maxColsPerPageByWidth) {
      const colEndExclusive = Math.min(colCount, colStart + maxColsPerPageByWidth);
      for (let rowStart = 0; rowStart < rowCount; rowStart += rowsPerPage) {
        const rowEndExclusive = Math.min(rowCount, rowStart + rowsPerPage);
        if (wrotePage) {
          pdf.addPage();
        }
        drawSpreadsheetPage({
          pdf,
          filename,
          sheetData,
          headers,
          rowStart,
          rowEndExclusive,
          colStart,
          colEndExclusive,
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
