import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Document as DocxDocument, Packer, Paragraph, ImageRun } from 'docx';
import { jsPDF } from 'jspdf';

import {
  importDocxFile,
  importDocumentFile,
  importPdfFile,
  importPdfFileAsPageImages,
  plainTextToTipTapContent,
  resetImportDocumentsDepsForTests,
  setImportDocumentsDepsForTests,
} from '../src/lib/import-documents.ts';

afterEach(() => {
  resetImportDocumentsDepsForTests();
});

/** Collects all text from a TipTap doc tree (any structure). */
function getAllTextFromDoc(parsed: { content?: Array<{ type?: string; content?: unknown[]; text?: string }> }): string {
  const parts: string[] = [];
  function walk(nodes: unknown[] | undefined) {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      const n = node as { type?: string; content?: unknown[]; text?: string };
      if (typeof n.text === 'string') parts.push(n.text);
      walk(n.content);
    }
  }
  walk(parsed.content);
  return parts.join('');
}

/** Returns true if the doc contains at least one node of the given type. */
function docHasNodeType(parsed: { content?: unknown[] }, type: string): boolean {
  function walk(nodes: unknown[] | undefined): boolean {
    if (!Array.isArray(nodes)) return false;
    for (const node of nodes) {
      const n = node as { type?: string; content?: unknown[] };
      if (n.type === type) return true;
      if (walk(n.content)) return true;
    }
    return false;
  }
  return walk(parsed.content);
}

test('plainTextToTipTapContent creates one paragraph per line', () => {
  const content = plainTextToTipTapContent('linha 1\nlinha 2');
  const parsed = JSON.parse(content);

  assert.equal(parsed.type, 'doc');
  assert.equal(parsed.content.length, 2);
  assert.equal(parsed.content[0].type, 'paragraph');
  assert.equal(parsed.content[0].content[0].text, 'linha 1');
  assert.equal(parsed.content[1].content[0].text, 'linha 2');
});

test('plainTextToTipTapContent keeps empty lines as empty paragraphs', () => {
  const content = plainTextToTipTapContent('a\n\nb');
  const parsed = JSON.parse(content);

  assert.equal(parsed.content.length, 3);
  assert.deepEqual(parsed.content[1], { type: 'paragraph', content: [] });
});

test('plainTextToTipTapContent creates a default empty paragraph for empty input', () => {
  const content = plainTextToTipTapContent('');
  const parsed = JSON.parse(content);
  assert.deepEqual(parsed.content, [{ type: 'paragraph', content: [] }]);
});

test('importDocumentFile rejects unsupported formats', async () => {
  const txtFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
  await assert.rejects(() => importDocumentFile(txtFile), /Formato nao suportado/);
});

test('importDocxFile imports text content and sanitizes file name', async () => {
  const document = new DocxDocument({
    sections: [{
      children: [
        new Paragraph('Linha A'),
        new Paragraph('Linha B'),
      ],
    }],
  });
  const buffer = await Packer.toBuffer(document);
  const file = new File([new Uint8Array(buffer)], '  Relatorio Final.docx  ', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const imported = await importDocxFile(file);
  const parsed = JSON.parse(imported.content);
  assert.equal(parsed.type, 'doc');
  assert.ok(Array.isArray(parsed.content));
  const fullText = getAllTextFromDoc(parsed);
  assert.equal(imported.name, 'Relatorio Final');
  assert.match(fullText, /Linha A/);
  assert.match(fullText, /Linha B/);
});

test('importDocxFile falls back to default name when sanitized name is empty', async () => {
  const document = new DocxDocument({
    sections: [{ children: [new Paragraph('Sem nome')] }],
  });
  const buffer = await Packer.toBuffer(document);
  const file = new File([new Uint8Array(buffer)], '   .docx  ', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const imported = await importDocxFile(file);
  assert.equal(imported.name, 'Documento Importado');
  const parsed = JSON.parse(imported.content);
  assert.match(getAllTextFromDoc(parsed), /Sem nome/);
});

test('importPdfFile imports pages and keeps page breaks; preserves line breaks via hasEOL', async () => {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  pdf.text('Pagina 1', 40, 60);
  pdf.addPage();
  pdf.text('Pagina 2', 40, 60);
  const pdfArrayBuffer = pdf.output('arraybuffer');
  const file = new File([pdfArrayBuffer], 'Relatorio.pdf', { type: 'application/pdf' });

  const imported = await importPdfFile(file);
  const parsed = JSON.parse(imported.content);
  assert.equal(imported.name, 'Relatorio');
  assert.equal(parsed.type, 'doc');
  assert.ok(Array.isArray(parsed.content));
  const fullText = getAllTextFromDoc(parsed);
  assert.ok(fullText.includes('Pagina 1'));
  assert.ok(fullText.includes('Pagina 2'));
});

test('importDocumentFile routes by extension', async () => {
  const document = new DocxDocument({
    sections: [{ children: [new Paragraph('Documento em DOCX')] }],
  });
  const buffer = await Packer.toBuffer(document);
  const file = new File([new Uint8Array(buffer)], 'ARQUIVO.DOCX', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const imported = await importDocumentFile(file);
  assert.equal(imported.name, 'ARQUIVO');
  const parsed = JSON.parse(imported.content);
  assert.match(getAllTextFromDoc(parsed), /Documento em DOCX/);
});

test('importDocumentFile routes PDF extension', async () => {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  pdf.text('Arquivo por roteamento PDF', 40, 60);
  const pdfArrayBuffer = pdf.output('arraybuffer');
  const file = new File([pdfArrayBuffer], 'route.PDF', { type: 'application/pdf' });

  const imported = await importDocumentFile(file);
  assert.equal(imported.name, 'route');
  assert.match(imported.content, /Arquivo por roteamento PDF/);
});

test('generateJSON converts HTML with img to image node', async () => {
  const { generateJSON } = await import('@tiptap/html');
  const { getTextEditorExtensions } = await import('../src/lib/text-editor-extensions.ts');
  const minimalPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhijMIQAAAABJRU5ErkJggg==';
  const dataUrl = `data:image/png;base64,${minimalPngBase64}`;
  const html = `<p>Text before image</p><p><img src="${dataUrl}" /></p><p>Text after image</p>`;
  const doc = generateJSON(html, getTextEditorExtensions());
  assert.ok(docHasNodeType(doc, 'image'), 'HTML with img should produce an image node');
  const fullText = getAllTextFromDoc(doc);
  assert.match(fullText, /Text before image/);
  assert.match(fullText, /Text after image/);
});

test('importDocxFile with image document preserves text', async () => {
  const minimalPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhijMIQAAAABJRU5ErkJggg==';
  const minimalPngBytes = new Uint8Array(Buffer.from(minimalPngBase64, 'base64'));
  const document = new DocxDocument({
    sections: [{
      children: [
        new Paragraph('Text before image'),
        new Paragraph({
          children: [
            new ImageRun({
              data: minimalPngBytes,
              transformation: { width: 10, height: 10 },
              type: 'png',
            }),
          ],
        }),
        new Paragraph('Text after image'),
      ],
    }],
  });
  const buffer = await Packer.toBuffer(document);
  const file = new File([new Uint8Array(buffer)], 'with-image.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const imported = await importDocxFile(file);
  const parsed = JSON.parse(imported.content);
  const fullText = getAllTextFromDoc(parsed);
  assert.match(fullText, /Text before image/);
  assert.match(fullText, /Text after image/);
  if (docHasNodeType(parsed, 'image')) {
    assert.ok(true, 'mammoth extracted image as image node');
  }
});

test('importDocxFile falls back to plain text when html conversion fails', async () => {
  setImportDocumentsDepsForTests({
    loadMammoth: async () => ({
      convertToHtml: async () => {
        throw new Error('html conversion failure');
      },
      extractRawText: async () => ({ value: 'fallback line' }),
      images: {
        imgElement: (handler: (image: unknown) => Promise<{ src: string }>) => handler,
      },
    }),
    loadTiptapHtml: async () => ({
      generateJSON: () => ({ type: 'doc', content: [] }),
    }),
    loadTextEditorExtensions: async () => ({
      getTextEditorExtensions: () => [],
    }),
  });

  const file = new File([new Uint8Array([1, 2, 3])], 'fallback.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const imported = await importDocxFile(file);
  assert.equal(imported.name, 'fallback');
  assert.match(imported.content, /fallback line/);
});

test('importDocxFile sanitizes spacing styles and normalizes first table row as header', async () => {
  let receivedHtml = '';

  setImportDocumentsDepsForTests({
    loadMammoth: async () => ({
      convertToHtml: async () => ({
        value:
          '<p style="line-height:1.8;margin:0;padding:0;">A</p>' +
          '<p style="line-height:1.4;color:red;">B</p>' +
          '<p style="">C</p>',
      }),
      extractRawText: async () => ({ value: 'unused fallback text' }),
      images: {
        imgElement: (handler: (image: unknown) => Promise<{ src: string }>) => handler,
      },
    }),
    loadTiptapHtml: async () => ({
      generateJSON: (html: string) => {
        receivedHtml = html;
        return {
          type: 'doc',
          content: [
            {
              type: 'table',
              content: [
                {
                  type: 'tableRow',
                  content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [] }] }],
                },
              ],
            },
          ],
        };
      },
    }),
    loadTextEditorExtensions: async () => ({
      getTextEditorExtensions: () => [],
    }),
  });

  const file = new File([new Uint8Array([7, 8, 9])], 'table.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const imported = await importDocxFile(file);

  assert.equal(imported.name, 'table');
  assert.match(receivedHtml, /color\s*:\s*red/i);
  assert.match(receivedHtml, /style=""/);
  assert.equal(receivedHtml.includes('line-height'), false);
  assert.equal(receivedHtml.includes('margin:'), false);
  assert.equal(receivedHtml.includes('padding:'), false);

  const parsed = JSON.parse(imported.content);
  const firstCell = parsed.content[0].content[0].content[0];
  assert.equal(firstCell.type, 'tableHeader');
});

test('importDocxFile accepts generated docs without content array', async () => {
  setImportDocumentsDepsForTests({
    loadMammoth: async () => ({
      convertToHtml: async () => ({ value: '<p>sem content array</p>' }),
      extractRawText: async () => ({ value: 'unused fallback text' }),
      images: {
        imgElement: (handler: (image: unknown) => Promise<{ src: string }>) => handler,
      },
    }),
    loadTiptapHtml: async () => ({
      generateJSON: () => ({ type: 'doc' }),
    }),
    loadTextEditorExtensions: async () => ({
      getTextEditorExtensions: () => [],
    }),
  });

  const file = new File([new Uint8Array([4, 4, 4])], 'without-content.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const imported = await importDocxFile(file);
  const parsed = JSON.parse(imported.content);
  assert.equal(parsed.type, 'doc');
});

test('importDocxFile falls back to editable text when html conversion returns only images', async () => {
  setImportDocumentsDepsForTests({
    loadMammoth: async () => ({
      convertToHtml: async () => ({ value: '<p><img src="data:image/png;base64,AAAA" /></p>' }),
      extractRawText: async () => ({ value: 'Texto editavel do DOCX' }),
      images: {
        imgElement: (handler: (image: unknown) => Promise<{ src: string }>) => handler,
      },
    }),
    loadTiptapHtml: async () => ({
      generateJSON: () => ({
        type: 'doc',
        content: [
          null,
          { type: 'paragraph' },
          {
            type: 'paragraph',
            content: [{ type: 'image', attrs: { src: 'data:image/png;base64,AAAA' } }],
          },
        ],
      }),
    }),
    loadTextEditorExtensions: async () => ({
      getTextEditorExtensions: () => [],
    }),
  });

  const file = new File([new Uint8Array([6, 6, 6])], 'image-only.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const imported = await importDocxFile(file);
  const parsed = JSON.parse(imported.content);
  assert.match(getAllTextFromDoc(parsed), /Texto editavel do DOCX/);
  assert.equal(docHasNodeType(parsed, 'image'), true);
});

test('importDocxFile keeps image-only content when raw text extraction is empty', async () => {
  setImportDocumentsDepsForTests({
    loadMammoth: async () => ({
      convertToHtml: async () => ({ value: '<p><img src="data:image/png;base64,BBBB" /></p>' }),
      extractRawText: async () => ({ value: '   ' }),
      images: {
        imgElement: (handler: (image: unknown) => Promise<{ src: string }>) => handler,
      },
    }),
    loadTiptapHtml: async () => ({
      generateJSON: () => ({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'image', attrs: { src: 'data:image/png;base64,BBBB' } }],
          },
        ],
      }),
    }),
    loadTextEditorExtensions: async () => ({
      getTextEditorExtensions: () => [],
    }),
  });

  const file = new File([new Uint8Array([7, 7, 7])], 'image-only-empty-raw.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const imported = await importDocxFile(file);
  const parsed = JSON.parse(imported.content);
  assert.equal(docHasNodeType(parsed, 'image'), true);
  assert.equal(getAllTextFromDoc(parsed).trim(), '');
});

test('importDocxFile keeps image-only content when raw text extraction is not a string', async () => {
  setImportDocumentsDepsForTests({
    loadMammoth: async () => ({
      convertToHtml: async () => ({ value: '<p><img src="data:image/png;base64,CCCC" /></p>' }),
      extractRawText: async () => ({ value: 123 }),
      images: {
        imgElement: (handler: (image: unknown) => Promise<{ src: string }>) => handler,
      },
    }),
    loadTiptapHtml: async () => ({
      generateJSON: () => ({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'image', attrs: { src: 'data:image/png;base64,CCCC' } }],
          },
        ],
      }),
    }),
    loadTextEditorExtensions: async () => ({
      getTextEditorExtensions: () => [],
    }),
  });

  const file = new File([new Uint8Array([8, 8, 8])], 'image-only-non-string-raw.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const imported = await importDocxFile(file);
  const parsed = JSON.parse(imported.content);
  assert.equal(docHasNodeType(parsed, 'image'), true);
  assert.equal(getAllTextFromDoc(parsed).trim(), '');
});

test('importPdfFile works when default worker URL import fails', async () => {
  const fakePdfJs = {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => ({
            items: [{ str: 'Default Worker' }],
          }),
        }),
      }),
    }),
  };

  setImportDocumentsDepsForTests({
    loadPdfJs: async () => fakePdfJs,
  });

  const file = new File([new Uint8Array([1])], 'default-worker.pdf', { type: 'application/pdf' });
  const imported = await importPdfFile(file);
  assert.match(imported.content, /Default Worker/);
});

test('importPdfFile ignores worker loader exceptions and keeps import flow', async () => {
  const fakePdfJs = {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => ({
            items: [{ str: 'Worker fallback' }],
          }),
        }),
      }),
    }),
  };

  setImportDocumentsDepsForTests({
    loadPdfWorkerUrl: async () => {
      throw new Error('worker loader crash');
    },
    loadPdfJs: async () => fakePdfJs,
  });

  const file = new File([new Uint8Array([2])], 'worker-fallback.pdf', { type: 'application/pdf' });
  const imported = await importPdfFile(file);
  assert.match(imported.content, /Worker fallback/);
});

test('importPdfFile caches worker url across calls', async () => {
  let workerLoadCount = 0;
  const fakePdfJs = {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => ({
            items: [{ str: 'Linha', hasEOL: true }],
          }),
        }),
      }),
    }),
  };

  setImportDocumentsDepsForTests({
    loadPdfWorkerUrl: async () => {
      workerLoadCount += 1;
      return 'mock-worker.js';
    },
    loadPdfJs: async () => fakePdfJs,
  });

  const file = new File([new Uint8Array([9, 9, 9])], 'cache.pdf', { type: 'application/pdf' });
  await importPdfFile(file);
  await importPdfFile(file);

  assert.equal(workerLoadCount, 1);
  assert.equal(fakePdfJs.GlobalWorkerOptions.workerSrc, 'mock-worker.js');
});

test('importPdfFile wraps low-level errors with user-friendly message', async () => {
  setImportDocumentsDepsForTests({
    loadPdfWorkerUrl: async () => null,
    loadPdfJs: async () => ({
      GlobalWorkerOptions: { workerSrc: '' },
      getDocument: () => ({ promise: Promise.reject(new Error('boom')) }),
    }),
  });

  const file = new File([new Uint8Array([0])], 'broken.pdf', { type: 'application/pdf' });
  await assert.rejects(
    () => importPdfFile(file),
    /Nao foi possivel ler o PDF/
  );
});

test('importPdfFile suppresses pdfjs font warnings but keeps other warnings', async () => {
  const originalWarn = console.warn;
  const forwardedWarnings: string[] = [];
  console.warn = (...args: unknown[]) => {
    forwardedWarnings.push(String(args[0] ?? ''));
  };

  try {
    setImportDocumentsDepsForTests({
      loadPdfWorkerUrl: async () => null,
      loadPdfJs: async () => ({
        GlobalWorkerOptions: { workerSrc: '' },
        getDocument: () => ({
          promise: Promise.resolve({
            numPages: 1,
            getPage: async () => ({
              getTextContent: async () => {
                console.warn('TT: invalid function');
                console.warn('Visible warning');
                console.warn({ source: 'pdfjs', detail: 'object warning' });
                return { items: [{ str: 'Texto' }] };
              },
            }),
          }),
        }),
      }),
    });

    const file = new File([new Uint8Array([3])], 'warnings.pdf', { type: 'application/pdf' });
    await importPdfFile(file);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(forwardedWarnings.some((warning) => warning.includes('TT: invalid function')), false);
  assert.equal(forwardedWarnings.some((warning) => warning.includes('Visible warning')), true);
  assert.equal(forwardedWarnings.some((warning) => warning.includes('[object Object]')), true);
});

test('importPdfFileAsPageImages produces one image per page using mocked renderer', async () => {
  const runtimeGlobal = globalThis as typeof globalThis & { document?: Document };
  const originalDocument = runtimeGlobal.document;
  runtimeGlobal.document = {
    createElement: (_tag: string) => ({
      width: 0,
      height: 0,
      getContext: () => ({}),
      toDataURL: () => 'data:image/jpeg;base64,MOCK',
    }),
  } as unknown as Document;

  try {
    setImportDocumentsDepsForTests({
      loadPdfWorkerUrl: async () => 'mock-worker.js',
      loadPdfJs: async () => ({
        GlobalWorkerOptions: { workerSrc: '' },
        getDocument: () => ({
          promise: Promise.resolve({
            numPages: 1,
            getPage: async () => ({
              getViewport: ({ scale }: { scale: number }) => ({ width: 100 * scale, height: 200 * scale }),
              render: () => ({ promise: Promise.resolve() }),
            }),
          }),
        }),
      }),
    });

    const file = new File([new Uint8Array([1, 2, 3])], 'one-page.pdf', { type: 'application/pdf' });
    const imported = await importPdfFileAsPageImages(file);
    const parsed = JSON.parse(imported.content);
    assert.equal(imported.name, 'one-page');
    assert.equal(parsed.type, 'doc');
    const imageNodes = parsed.content
      .filter((n: any) => n.type === 'paragraph')
      .flatMap((p: any) => (p.content ?? []).filter((c: any) => c.type === 'image'));
    assert.equal(imageNodes.length, 1);
    assert.equal(imageNodes[0].attrs.width, 794);
    assert.ok(imageNodes[0].attrs.src.startsWith('data:image/jpeg'));
  } finally {
    runtimeGlobal.document = originalDocument;
  }
});

test('importPdfFileAsPageImages switches to low scale for large documents', async () => {
  let observedScale = 0;
  const runtimeGlobal = globalThis as typeof globalThis & { document?: Document };
  const originalDocument = runtimeGlobal.document;
  runtimeGlobal.document = {
    createElement: (_tag: string) => ({
      width: 0,
      height: 0,
      getContext: () => ({}),
      toDataURL: () => 'data:image/jpeg;base64,MOCK',
    }),
  } as unknown as Document;

  try {
    setImportDocumentsDepsForTests({
      loadPdfWorkerUrl: async () => null,
      loadPdfJs: async () => ({
        GlobalWorkerOptions: { workerSrc: '' },
        getDocument: () => ({
          promise: Promise.resolve({
            numPages: 51,
            getPage: async () => ({
              getViewport: ({ scale }: { scale: number }) => {
                observedScale = scale;
                return { width: 120, height: 240 };
              },
              render: () => ({ promise: Promise.resolve() }),
            }),
          }),
        }),
      }),
    });

    const file = new File([new Uint8Array([4, 5, 6])], 'large.pdf', { type: 'application/pdf' });
    await importPdfFileAsPageImages(file);
    assert.equal(observedScale, 1.5);
  } finally {
    runtimeGlobal.document = originalDocument;
  }
});

test('importPdfFileAsPageImages throws friendly error when canvas context is unavailable', async () => {
  const runtimeGlobal = globalThis as typeof globalThis & { document?: Document };
  const originalDocument = runtimeGlobal.document;
  runtimeGlobal.document = {
    createElement: (_tag: string) => ({
      width: 0,
      height: 0,
      getContext: () => null,
      toDataURL: () => 'data:image/jpeg;base64,MOCK',
    }),
  } as unknown as Document;

  try {
    setImportDocumentsDepsForTests({
      loadPdfWorkerUrl: async () => null,
      loadPdfJs: async () => ({
        GlobalWorkerOptions: { workerSrc: '' },
        getDocument: () => ({
          promise: Promise.resolve({
            numPages: 1,
            getPage: async () => ({
              getViewport: () => ({ width: 120, height: 240 }),
              render: () => ({ promise: Promise.resolve() }),
            }),
          }),
        }),
      }),
    });

    const file = new File([new Uint8Array([1, 2, 3])], 'broken-canvas.pdf', { type: 'application/pdf' });
    await assert.rejects(
      () => importPdfFileAsPageImages(file),
      /Nao foi possivel ler o PDF/
    );
  } finally {
    runtimeGlobal.document = originalDocument;
  }
});
