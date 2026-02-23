import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildExportFileName,
  downloadBlob,
  sanitizeFileBaseName,
} from '../src/utils/file-download.ts';

test('sanitizeFileBaseName removes invalid chars and keeps readable spaces', () => {
  const value = sanitizeFileBaseName('  relatorio: vendas/2026? *final*  ');
  assert.equal(value, 'relatorio vendas 2026 final');
});

test('sanitizeFileBaseName falls back when input becomes empty', () => {
  const value = sanitizeFileBaseName('   <>:"/\\|?*   ', 'arquivo');
  assert.equal(value, 'arquivo');
});

test('buildExportFileName appends extension once', () => {
  assert.equal(buildExportFileName('Relatorio Mensal', 'pdf'), 'Relatorio Mensal.pdf');
  assert.equal(buildExportFileName('Relatorio Mensal.PDF', '.pdf'), 'Relatorio Mensal.PDF');
});

test('buildExportFileName supports empty extension without trailing dot', () => {
  assert.equal(buildExportFileName('Relatorio Mensal', '   '), 'Relatorio Mensal');
});

test('downloadBlob uses anchor download attribute and revokes object URL', async () => {
  const originalWindow = (globalThis as any).window;
  const originalUrl = (globalThis as any).URL;

  let clicked = false;
  let removed = false;
  const revoked: string[] = [];

  const fakeLink = {
    href: '',
    download: '',
    rel: '',
    click: () => {
      clicked = true;
    },
    remove: () => {
      removed = true;
    },
  };

  (globalThis as any).window = {
    document: {
      createElement: (tag: string) => {
        assert.equal(tag, 'a');
        return fakeLink;
      },
      body: {
        append: (node: unknown) => {
          assert.equal(node, fakeLink);
        },
      },
    },
  };

  (globalThis as any).URL = {
    createObjectURL: (_blob: Blob) => 'blob:test-url',
    revokeObjectURL: (url: string) => {
      revoked.push(url);
    },
  };

  downloadBlob(new Blob(['conteudo']), 'relatorio.pdf');

  assert.equal(fakeLink.download, 'relatorio.pdf');
  assert.equal(fakeLink.href, 'blob:test-url');
  assert.equal(fakeLink.rel, 'noopener');
  assert.equal(clicked, true);
  assert.equal(removed, true);

  await new Promise((resolve) => setTimeout(resolve, 1));
  assert.deepEqual(revoked, ['blob:test-url']);

  (globalThis as any).window = originalWindow;
  (globalThis as any).URL = originalUrl;
});

test('downloadBlob infers extension when filename has no extension', () => {
  const originalWindow = (globalThis as any).window;
  const originalUrl = (globalThis as any).URL;

  const fakeLink = {
    href: '',
    download: '',
    rel: '',
    click: () => undefined,
    remove: () => undefined,
  };

  (globalThis as any).window = {
    document: {
      createElement: () => fakeLink,
      body: { append: () => undefined },
    },
  };

  (globalThis as any).URL = {
    createObjectURL: () => 'blob:test-url',
    revokeObjectURL: () => undefined,
  };

  const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  downloadBlob(new Blob(['conteudo'], { type: docxMime }), 'arquivo-exportado');

  assert.equal(fakeLink.download, 'arquivo-exportado.docx');

  (globalThis as any).window = originalWindow;
  (globalThis as any).URL = originalUrl;
});
