import test from 'node:test';
import assert from 'node:assert/strict';
import { Document as DocxDocument, Packer, Paragraph } from 'docx';
import { jsPDF } from 'jspdf';

import {
  importDocxFile,
  importDocumentFile,
  importPdfFile,
  plainTextToTipTapContent,
} from '../src/lib/import-documents.ts';

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
  const fullText = parsed.content.map((node: any) => node.content?.[0]?.text ?? '').join('\n');

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
});

test('importPdfFile imports pages and keeps page breaks as blank lines', async () => {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  pdf.text('Pagina 1', 40, 60);
  pdf.addPage();
  pdf.text('Pagina 2', 40, 60);
  const pdfArrayBuffer = pdf.output('arraybuffer');
  const file = new File([pdfArrayBuffer], 'Relatorio.pdf', { type: 'application/pdf' });

  const imported = await importPdfFile(file);
  const parsed = JSON.parse(imported.content);
  const textByParagraph = parsed.content.map((node: any) => node.content?.[0]?.text ?? '');

  assert.equal(imported.name, 'Relatorio');
  assert.ok(textByParagraph.some((text: string) => text.includes('Pagina 1')));
  assert.ok(textByParagraph.some((text: string) => text.includes('Pagina 2')));
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
  assert.match(imported.content, /Documento em DOCX/);
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
