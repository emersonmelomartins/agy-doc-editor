import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDocumentPreview } from '../src/lib/document-preview.ts';

test('buildDocumentPreview creates text lines from tiptap content', () => {
  const content = JSON.stringify({
    type: 'doc',
    content: [
      { type: 'heading', content: [{ type: 'text', text: 'Titulo' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Linha um de exemplo' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Linha dois de exemplo' }] },
    ],
  });

  const preview = buildDocumentPreview({ type: 'text', content });
  assert.equal(preview.kind, 'text');
  if (preview.kind === 'text') {
    assert.equal(preview.lines.length, 3);
    assert.equal(preview.lines[0], 'Titulo');
  }
});

test('buildDocumentPreview falls back safely on invalid text json', () => {
  const preview = buildDocumentPreview({ type: 'text', content: '{invalid' });
  assert.equal(preview.kind, 'text');
  if (preview.kind === 'text') {
    assert.deepEqual(preview.lines, ['Documento vazio']);
  }
});

test('buildDocumentPreview normalizes empty text blocks and null nodes', () => {
  const content = JSON.stringify({
    type: 'doc',
    content: [
      null,
      { type: 'paragraph', content: [{ type: 'text', text: '   ' }] },
    ],
  });

  const preview = buildDocumentPreview({ type: 'text', content });
  assert.equal(preview.kind, 'text');
  if (preview.kind === 'text') {
    assert.deepEqual(preview.lines, ['Documento vazio']);
  }
});

test('buildDocumentPreview handles non-block container nodes', () => {
  const content = JSON.stringify({
    type: 'customRoot',
    content: [
      {
        type: 'customContainer',
        content: [{ type: 'text', text: 'Texto em container customizado' }],
      },
    ],
  });

  const preview = buildDocumentPreview({ type: 'text', content });
  assert.equal(preview.kind, 'text');
  if (preview.kind === 'text') {
    assert.equal(preview.lines[0], 'Texto em container customizado');
  }
});

test('buildDocumentPreview handles nodes without explicit type', () => {
  const content = JSON.stringify({
    type: 'doc',
    content: [
      {
        content: [{ type: 'text', text: 'Sem tipo explícito' }],
      },
    ],
  });

  const preview = buildDocumentPreview({ type: 'text', content });
  assert.equal(preview.kind, 'text');
  if (preview.kind === 'text') {
    assert.equal(preview.lines[0], 'Sem tipo explícito');
  }
});

test('buildDocumentPreview creates spreadsheet preview matrix', () => {
  const content = JSON.stringify({
    colHeaders: ['Produto', 'Qtd', 'Total'],
    data: [
      ['Mouse', 2, 100],
      ['Teclado', 1, 150],
    ],
  });

  const preview = buildDocumentPreview({ type: 'spreadsheet', content });
  assert.equal(preview.kind, 'spreadsheet');
  if (preview.kind === 'spreadsheet') {
    assert.deepEqual(preview.headers, ['Produto', 'Qtd', 'Total']);
    assert.deepEqual(preview.rows[0], ['Mouse', '2', '100']);
  }
});

test('buildDocumentPreview falls back for invalid spreadsheet json', () => {
  const preview = buildDocumentPreview({ type: 'spreadsheet', content: '{broken' });
  assert.equal(preview.kind, 'spreadsheet');
  if (preview.kind === 'spreadsheet') {
    assert.deepEqual(preview.headers, ['A', 'B', 'C']);
    assert.deepEqual(preview.rows, [['—', '—', '—']]);
  }
});

test('buildDocumentPreview uses default sheet headers and rows when empty', () => {
  const preview = buildDocumentPreview({ type: 'spreadsheet', content: JSON.stringify({}) });
  assert.equal(preview.kind, 'spreadsheet');
  if (preview.kind === 'spreadsheet') {
    assert.deepEqual(preview.headers, ['A', 'B', 'C']);
    assert.deepEqual(preview.rows, [['—', '—', '—']]);
  }
});

test('buildDocumentPreview normalizes empty spreadsheet cells and headers', () => {
  const preview = buildDocumentPreview({
    type: 'spreadsheet',
    content: JSON.stringify({
      colHeaders: ['Produto', '', 'Total'],
      data: [['Mouse', null, 100]],
    }),
  });

  assert.equal(preview.kind, 'spreadsheet');
  if (preview.kind === 'spreadsheet') {
    assert.deepEqual(preview.headers, ['Produto', '—', 'Total']);
    assert.deepEqual(preview.rows[0], ['Mouse', '—', '100']);
  }
});

test('buildDocumentPreview supports null spreadsheet rows', () => {
  const preview = buildDocumentPreview({
    type: 'spreadsheet',
    content: JSON.stringify({
      colHeaders: ['A', 'B', 'C'],
      data: [null],
    }),
  });

  assert.equal(preview.kind, 'spreadsheet');
  if (preview.kind === 'spreadsheet') {
    assert.deepEqual(preview.rows[0], []);
  }
});
