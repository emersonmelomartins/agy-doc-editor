import { buildExportFileName } from '@/utils/file-download';
import { capturePrintPages } from '@/utils/capture-print-pages';

export async function exportToPdf(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  try {
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    const pageCanvases = await capturePrintPages(element, html2canvas);

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();

    pageCanvases.forEach((pageCanvas, pageIndex) => {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      const pageImageData = pageCanvas.toDataURL('image/jpeg', 0.98);
      const sourceRatio = pageCanvas.width / Math.max(1, pageCanvas.height);
      const pageRatio = pageWidth / pageHeightMm;
      const drawWidth = sourceRatio >= pageRatio ? pageWidth : pageHeightMm * sourceRatio;
      const drawHeight = sourceRatio >= pageRatio ? pageWidth / sourceRatio : pageHeightMm;
      const offsetX = (pageWidth - drawWidth) / 2;
      const offsetY = (pageHeightMm - drawHeight) / 2;

      pdf.addImage(pageImageData, 'JPEG', offsetX, offsetY, drawWidth, drawHeight);
    });

    pdf.save(buildExportFileName(filename, 'pdf'));
  } catch (error) {
    console.error('PDF Export Error:', error);
    alert('Erro ao exportar PDF.');
  }
}
