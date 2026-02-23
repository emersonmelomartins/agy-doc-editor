type TipTapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
};

function buildParagraph(text: string): TipTapNode {
  if (!text.trim()) {
    return { type: 'paragraph', content: [] };
  }

  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  };
}

export function plainTextToTipTapContent(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const content = lines.map((line) => buildParagraph(line));

  return JSON.stringify({
    type: 'doc',
    content,
  });
}

function sanitizeImportedName(fileName: string): string {
  const trimmed = fileName.trim();
  return trimmed.replace(/\.(docx|pdf)$/i, '').trim() || 'Documento Importado';
}

export async function importDocxFile(file: File): Promise<{ name: string; content: string }> {
  const mammoth = await import('mammoth/mammoth.browser.js');
  const arrayBuffer = await file.arrayBuffer();
  const extracted = await mammoth.extractRawText({ arrayBuffer });

  return {
    name: sanitizeImportedName(file.name),
    content: plainTextToTipTapContent(extracted.value),
  };
}

export async function importPdfFile(file: File): Promise<{ name: string; content: string }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({
    data,
    disableWorker: true,
  } as any).promise;

  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    /* c8 ignore next 3 */
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pages.push(pageText);
  }

  return {
    name: sanitizeImportedName(file.name),
    content: plainTextToTipTapContent(pages.join('\n\n')),
  };
}

export async function importDocumentFile(file: File): Promise<{ name: string; content: string }> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.docx')) {
    return importDocxFile(file);
  }

  if (lowerName.endsWith('.pdf')) {
    return importPdfFile(file);
  }

  throw new Error('Formato nao suportado. Use .docx ou .pdf');
}
