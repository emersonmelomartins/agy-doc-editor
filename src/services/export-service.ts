import type { Document, SpreadsheetData } from '@/types';
import { buildExportFileName, downloadBlob } from '@/lib/file-download';

export type ExportFormat = 'docx' | 'xlsx' | 'pdf' | 'json';

export async function exportDocument(document: Document, format: ExportFormat): Promise<void> {
  if (format === 'docx' && document.type === 'text') {
    const { exportToDocx } = await import('@/lib/export-docx');
    await exportToDocx(document.content, document.name);
    return;
  }

  if (format === 'xlsx' && document.type === 'spreadsheet') {
    const { exportToXlsx } = await import('@/lib/export-xlsx');
    const sheetData = JSON.parse(document.content) as SpreadsheetData;
    await exportToXlsx(sheetData.data, document.name);
    return;
  }

  if (format === 'pdf') {
    const { exportToPdf } = await import('@/lib/export-pdf');
    await exportToPdf('print-content', document.name);
    return;
  }

  if (format === 'json') {
    const blob = new Blob([document.content], { type: 'application/json' });
    const filename = buildExportFileName(document.name, 'json');
    downloadBlob(blob, filename);
  }
}
