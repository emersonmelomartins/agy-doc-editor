import type { SpreadsheetData } from '@/types';
import { buildExportFileName } from '@/utils/file-download';

function colToLetter(c: number): string {
  let s = '';
  let n = c;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function cellAddress(r: number, c: number): string {
  return `${colToLetter(c)}${r + 1}`;
}

/** Normalize CSS color to hex without # for xlsx-js-style (e.g. "FFFF0000" or "FF0000"). */
function toRgbHex(color: string): string {
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 6) return hex.toUpperCase();
    if (hex.length === 3) {
      return (hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]).toUpperCase();
    }
  }
  const rgb = trimmed.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgb) {
    const r = Number.parseInt(rgb[1], 10).toString(16).padStart(2, '0');
    const g = Number.parseInt(rgb[2], 10).toString(16).padStart(2, '0');
    const b = Number.parseInt(rgb[3], 10).toString(16).padStart(2, '0');
    return (r + g + b).toUpperCase();
  }
  return trimmed.replace(/^#/, '').toUpperCase().slice(0, 6);
}

export async function exportToXlsx(sheetData: SpreadsheetData, filename: string): Promise<void> {
  try {
    const XLSX = await import('xlsx-js-style');
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData.data);
    if (sheetData.merges && sheetData.merges.length > 0) {
      worksheet['!merges'] = sheetData.merges.map((m) => ({
        s: { r: m.startRow, c: m.startCol },
        e: { r: m.endRow, c: m.endCol },
      }));
    }
    if (sheetData.cellFills && Object.keys(sheetData.cellFills).length > 0) {
      const fillStyle = (rgb: string) => ({
        fill: { patternType: 'solid' as const, fgColor: { rgb } },
      });
      for (const [key, color] of Object.entries(sheetData.cellFills)) {
        const match = /^(\d+),(\d+)$/.exec(key);
        if (!match) continue;
        const r = Number.parseInt(match[1], 10);
        const c = Number.parseInt(match[2], 10);
        const address = cellAddress(r, c);
        const cell = worksheet[address];
        const style = fillStyle(toRgbHex(color));
        if (cell) {
          cell.s = { ...(cell.s as object ?? {}), ...style };
        } else {
          worksheet[address] = { t: 's', v: '', s: style };
        }
      }
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Planilha1');
    XLSX.writeFile(workbook, buildExportFileName(filename, 'xlsx'));
  } catch (error) {
    console.error('XLSX Export Error:', error);
    alert('Erro ao exportar planilha Excel.');
  }
}
