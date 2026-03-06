import type { Document } from '@/types';
import { buildExportFileName, downloadBlob } from '@/utils/file-download';
import { exportToDocx } from '@/lib/export-docx';
import { exportToPdf } from '@/lib/export-pdf';
import { exportToXlsx } from '@/lib/export-xlsx';
import { exportSpreadsheetToPdf } from '@/lib/export-spreadsheet-pdf';
import { parseSpreadsheetContent } from '@/lib/spreadsheet';

export type ExportFormat = 'docx' | 'xlsx' | 'pdf' | 'json';

export async function exportDocument(document: Document, format: ExportFormat): Promise<void> {
  if (format === 'docx' && document.type === 'text') {
    await exportToDocx(document.content, document.name);
    return;
  }

  if (format === 'xlsx' && document.type === 'spreadsheet') {
    const sheetData = parseSpreadsheetContent(document.content);
    await exportToXlsx(sheetData, document.name);
    return;
  }

  if (format === 'pdf') {
    if (document.type === 'spreadsheet') {
      const sheetData = parseSpreadsheetContent(document.content);
      await exportSpreadsheetToPdf(sheetData, document.name);
      return;
    }

    await exportToPdf('print-content', document.name);
    return;
  }

  if (format === 'json') {
    const blob = new Blob([document.content], { type: 'application/json' });
    const filename = buildExportFileName(document.name, 'json');
    downloadBlob(blob, filename);
  }
}
