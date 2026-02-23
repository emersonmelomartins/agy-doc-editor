import { buildExportFileName } from '@/lib/file-download';

export async function exportToPdf(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  const originalBackground = element.style.background;
  const originalBoxShadow = element.style.boxShadow;
  const originalPageGap = element.style.getPropertyValue('--page-gap');

  try {
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    element.style.background = '#ffffff';
    element.style.boxShadow = 'none';

    // Remove visual gap between pages only during export.
    if (element.dataset.pagedDocument === 'true') {
      element.style.setProperty('--page-gap', '0px');
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    let pageCount = 0;

    // First page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    pageCount++;

    // Additional pages
    while (heightLeft > 0) {
      position = -(pageHeight * pageCount);
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      pageCount++;
    }

    pdf.save(buildExportFileName(filename, 'pdf'));
  } catch (error) {
    console.error('PDF Export Error:', error);
    alert('Erro ao exportar PDF.');
  } finally {
    element.style.background = originalBackground;
    element.style.boxShadow = originalBoxShadow;
    if (element.dataset.pagedDocument === 'true') {
      if (originalPageGap) {
        element.style.setProperty('--page-gap', originalPageGap);
      } else {
        element.style.removeProperty('--page-gap');
      }
    }
  }
}
