import { buildExportFileName } from '@/lib/file-download';

export async function exportToXlsx(data: (string | number | null)[][], filename: string): Promise<void> {
  try {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Planilha1');
    XLSX.writeFile(workbook, buildExportFileName(filename, 'xlsx'));
  } catch (error) {
    console.error('XLSX Export Error:', error);
    alert('Erro ao exportar planilha Excel.');
  }
}
