type TipTapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
};

type PdfJsWithWorkerOptions = {
  GlobalWorkerOptions: { workerSrc: string };
};

type ImportDocumentsDeps = {
  loadPdfWorkerUrl: () => Promise<string | null>;
  loadPdfJs: () => Promise<PdfJsWithWorkerOptions & { getDocument: (options: unknown) => { promise: Promise<any> } }>;
  loadMammoth: () => Promise<any>;
  loadTiptapHtml: () => Promise<{ generateJSON: (html: string, extensions: unknown[]) => TipTapNode }>;
  loadTextEditorExtensions: () => Promise<{ getTextEditorExtensions: () => unknown[] }>;
};

const defaultImportDocumentsDeps: ImportDocumentsDeps = {
  loadPdfWorkerUrl: async () => {
    const workerModule = (await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url')) as {
      default: string;
    };
    return workerModule.default;
  },
  loadPdfJs: async () => (
    await import('pdfjs-dist/legacy/build/pdf.mjs')
  ) as PdfJsWithWorkerOptions & { getDocument: (options: unknown) => { promise: Promise<any> } },
  loadMammoth: async () => import('mammoth/mammoth.browser.js'),
  loadTiptapHtml: async () => import('@tiptap/html'),
  loadTextEditorExtensions: async () => import('./text-editor-extensions.ts'),
};

let importDocumentsDeps: ImportDocumentsDeps = defaultImportDocumentsDeps;
let cachedPdfWorkerUrl: string | null | undefined;

export function setImportDocumentsDepsForTests(overrides: Partial<ImportDocumentsDeps>): void {
  importDocumentsDeps = { ...importDocumentsDeps, ...overrides };
  cachedPdfWorkerUrl = undefined;
}

export function resetImportDocumentsDepsForTests(): void {
  importDocumentsDeps = defaultImportDocumentsDeps;
  cachedPdfWorkerUrl = undefined;
}

async function resolvePdfWorkerUrl(): Promise<string | null> {
  if (cachedPdfWorkerUrl !== undefined) {
    return cachedPdfWorkerUrl;
  }

  try {
    const workerUrl = await importDocumentsDeps.loadPdfWorkerUrl();
    cachedPdfWorkerUrl = typeof workerUrl === 'string' ? workerUrl : null;
  } catch {
    cachedPdfWorkerUrl = null;
  }

  return cachedPdfWorkerUrl;
}

async function configurePdfWorker(pdfjs: PdfJsWithWorkerOptions): Promise<void> {
  const workerUrl = await resolvePdfWorkerUrl();
  if (workerUrl) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  }
}

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

/**
 * Remove or normalize inline line-height and vertical spacing so editor CSS controls layout.
 * Matches style="... line-height: ... margin: ... padding: ..." on p, h1–h6, div, span.
 */
function sanitizeHtmlSpacing(html: string): string {
  return html.replace(
    /\s(style)=["']([^"']*?)["']/gi,
    (match, _attr, styleValue) => {
      if (!styleValue) return match;
      const cleaned = styleValue
        .split(';')
        .map((part: string) => part.trim())
        .filter((part: string) => {
          const [rawKey = ''] = part.split(':');
          const key = rawKey.trim().toLowerCase();
          return (
            key !== 'line-height' &&
            key !== 'margin' &&
            key !== 'margin-top' &&
            key !== 'margin-bottom' &&
            key !== 'padding' &&
            key !== 'padding-top' &&
            key !== 'padding-bottom'
          );
        })
        .join('; ');
      if (cleaned.length === 0) return '';
      return ` ${_attr}="${cleaned}"`;
    }
  );
}

/** Mammoth often outputs tables with only td (no th). Treat first row as header for editor/export. */
function normalizeTableFirstRowAsHeader(doc: { content?: TipTapNode[] }): void {
  const nodes = doc.content;
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (node.type === 'table' && Array.isArray(node.content) && node.content.length > 0) {
      const firstRow = node.content[0];
      if (firstRow?.type === 'tableRow' && Array.isArray(firstRow.content)) {
        for (const cell of firstRow.content) {
          if (cell?.type === 'tableCell') {
            (cell as TipTapNode).type = 'tableHeader';
          }
        }
      }
    }
  }
}

/**
 * Import DOCX via mammoth (HTML) then TipTap JSON.
 * Limitations: Word TOC (sumário) is not converted as a clickable index; page breaks are not
 * imported (content is continuous; editor recalculates A4 pagination). Optional styleMap in
 * convertToHtml can preserve fonts when mammoth exposes style names.
 */
export async function importDocxFile(file: File): Promise<{ name: string; content: string }> {
  const mammoth = await importDocumentsDeps.loadMammoth();
  const { generateJSON } = await importDocumentsDeps.loadTiptapHtml();
  const { getTextEditorExtensions } = await importDocumentsDeps.loadTextEditorExtensions();
  const arrayBuffer = await file.arrayBuffer();
  const name = sanitizeImportedName(file.name);

  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        convertImage: mammoth.images.imgElement((image) =>
          image.read('base64').then((buffer) => ({
            src: `data:${image.contentType};base64,${buffer}`,
          }))
        ),
      }
    );
    let html = result.value;
    html = sanitizeHtmlSpacing(html);
    const extensions = getTextEditorExtensions();
    const doc = generateJSON(html, extensions);
    normalizeTableFirstRowAsHeader(doc);
    return {
      name,
      content: JSON.stringify(doc),
    };
  } catch (error) {
    console.warn('DOCX import (HTML path) failed, falling back to plain text:', error);
    const extracted = await mammoth.extractRawText({ arrayBuffer });
    return {
      name,
      content: plainTextToTipTapContent(extracted.value),
    };
  }
}

/** Suppress pdfjs font warnings (TT: invalid/undefined function) during PDF text extraction. */
function withPdfjsWarnSuppressed<T>(fn: () => Promise<T>): Promise<T> {
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : String(args[0]);
    if (msg.includes('TT: invalid function') || msg.includes('TT: undefined function')) return;
    origWarn.apply(console, args);
  };
  return fn().finally(() => {
    console.warn = origWarn;
  });
}

/**
 * Editable PDF import: text only, with line breaks (hasEOL).
 * Images are not extracted: getOperatorList() can hang on PDFs with complex/broken fonts.
 * Use "Fidelidade" mode if you need logos/figures as images.
 */
export async function importPdfFile(file: File): Promise<{ name: string; content: string }> {
  const name = sanitizeImportedName(file.name);
  return withPdfjsWarnSuppressed(async () => {
    try {
      const pdfjs = await importDocumentsDeps.loadPdfJs();
      await configurePdfWorker(pdfjs);
      const data = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjs.getDocument({
        data,
        disableWorker: true,
      } as any).promise;

      const pages: string[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const textItems = (textContent.items as Array<{ str?: string; hasEOL?: boolean }>).filter(
          (item): item is { str: string; hasEOL?: boolean } =>
            'str' in item && typeof (item as { str?: string }).str === 'string'
        );
        const pageText = textItems
          .map((item) => item.str + (item.hasEOL === true ? '\n' : ' '))
          .join('')
          .split('\n')
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .join('\n')
          .trim();
        pages.push(pageText);
      }

      return {
        name,
        content: plainTextToTipTapContent(pages.join('\n\n')),
      };
    } catch (error) {
      console.error('PDF import (editable) failed:', error);
      throw new Error(
        'Nao foi possivel ler o PDF. Verifique se o arquivo esta correto ou nao esta protegido.'
      );
    }
  });
}

const PDF_PAGE_IMAGE_WIDTH = 794;
const PDF_RENDER_SCALE = 2;
const PDF_RENDER_SCALE_LARGE_DOC = 1.5;
const PDF_LARGE_DOC_PAGE_THRESHOLD = 50;

/**
 * Fidelity PDF import: each page becomes one image in the document (exact visual copy).
 * Processes one page at a time to support heavy PDFs.
 */
export async function importPdfFileAsPageImages(file: File): Promise<{ name: string; content: string }> {
  const name = sanitizeImportedName(file.name);
  try {
    const pdfjs = await importDocumentsDeps.loadPdfJs();
    await configurePdfWorker(pdfjs);
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({
      data,
      disableWorker: true,
    } as any).promise;

    const numPages = pdf.numPages;
    const scale = numPages > PDF_LARGE_DOC_PAGE_THRESHOLD ? PDF_RENDER_SCALE_LARGE_DOC : PDF_RENDER_SCALE;
    const content: TipTapNode[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D indisponivel.');
      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const width = PDF_PAGE_IMAGE_WIDTH;
      const height = Math.round((PDF_PAGE_IMAGE_WIDTH * viewport.height) / viewport.width);
      content.push({
        type: 'paragraph',
        content: [
          {
            type: 'image',
            attrs: {
              src: dataUrl,
              width,
              height,
              align: 'center',
              offsetX: 0,
            },
          },
        ],
      });
    }

    const doc = { type: 'doc' as const, content };
    return {
      name,
      content: JSON.stringify(doc),
    };
  } catch (error) {
    console.error('PDF import (fidelity) failed:', error);
    throw new Error(
      'Nao foi possivel ler o PDF. Verifique se o arquivo esta correto ou nao esta protegido.'
    );
  }
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
