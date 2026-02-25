import type { Document, SpreadsheetData } from '@/types';
import { buildExportFileName, downloadBlob } from '@/utils/file-download';
import { exportToDocx } from '@/lib/export-docx';
import { exportToPdf } from '@/lib/export-pdf';
import { exportToXlsx } from '@/lib/export-xlsx';

export type ExportFormat = 'docx' | 'xlsx' | 'pdf' | 'json';

export async function exportDocument(document: Document, format: ExportFormat): Promise<void> {
  if (format === 'docx' && document.type === 'text') {
    await exportToDocx(document.content, document.name);
    return;
  }

  if (format === 'xlsx' && document.type === 'spreadsheet') {
    const sheetData = JSON.parse(document.content) as SpreadsheetData;
    await exportToXlsx(sheetData, document.name);
    return;
  }

  if (format === 'pdf') {
    await exportToPdf('print-content', document.name);
    return;
  }

  if (format === 'json') {
    const blob = new Blob([document.content], { type: 'application/json' });
    const filename = buildExportFileName(document.name, 'json');
    downloadBlob(blob, filename);
  }
}
