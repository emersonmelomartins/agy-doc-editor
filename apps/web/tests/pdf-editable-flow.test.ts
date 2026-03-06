import test from 'node:test';
import assert from 'node:assert/strict';
import { importEditablePdfDocxFirstWithDeps } from '../src/features/documents/pdf-editable-flow-core.ts';

test('editable flow uses DOCX-first and reinforces content when extracted text is better', async () => {
  const order: string[] = [];
  const file = new File([new Blob(['pdf'])], 'sample.pdf', { type: 'application/pdf' });

  const result = await importEditablePdfDocxFirstWithDeps(file, {
    convertPdfToDocx: async () => {
      order.push('convert');
      return new Blob(['docx'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    },
    importDocumentFile: async (docxFile) => {
      order.push('import-docx');
      assert.match(docxFile.name, /sample\.docx$/);
      return { name: 'sample', content: '{"type":"doc","content":[{"type":"paragraph","content":[]}]}' };
    },
    importPdfEditable: async () => {
      order.push('extract');
      return { data: { text: 'texto rico '.repeat(20) } } as any;
    },
    plainTextToTipTapContent: (text) => {
      order.push('plain-text-transform');
      return `plain:${text.length}`;
    },
    estimateTipTapTextLength: () => 0,
  });

  assert.deepEqual(order, ['convert', 'import-docx', 'extract', 'plain-text-transform']);
  assert.equal(result.content.startsWith('plain:'), true);
});

test('editable flow keeps DOCX content when extracted text is not better', async () => {
  const file = new File([new Blob(['pdf'])], 'sample.pdf', { type: 'application/pdf' });

  const result = await importEditablePdfDocxFirstWithDeps(file, {
    convertPdfToDocx: async () => new Blob(['docx']),
    importDocumentFile: async () => ({ name: 'sample', content: 'docx-content' }),
    importPdfEditable: async () => ({ data: { text: 'curto' } } as any),
    plainTextToTipTapContent: (text) => `plain:${text.length}`,
    estimateTipTapTextLength: () => 200,
  });

  assert.equal(result.content, 'docx-content');
});

test('editable flow keeps DOCX content when text reinforcement fails', async () => {
  const file = new File([new Blob(['pdf'])], 'sample.pdf', { type: 'application/pdf' });

  const result = await importEditablePdfDocxFirstWithDeps(file, {
    convertPdfToDocx: async () => new Blob(['docx']),
    importDocumentFile: async () => ({ name: 'sample', content: 'docx-content' }),
    importPdfEditable: async () => {
      throw new Error('extract failed');
    },
    plainTextToTipTapContent: (text) => `plain:${text.length}`,
    estimateTipTapTextLength: () => 0,
  });

  assert.equal(result.content, 'docx-content');
});
