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

test('buildDocumentPreview includes image blocks and list items in text preview', () => {
  const content = JSON.stringify({
    type: 'doc',
    content: [
      { type: 'image', attrs: { src: 'data:image/png;base64,AAAA' } },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item importante' }] }],
          },
        ],
      },
    ],
  });

  const preview = buildDocumentPreview({ type: 'text', content });
  assert.equal(preview.kind, 'text');
  if (preview.kind === 'text') {
    const imageBlock = preview.blocks.find((block) => block.kind === 'image');
    assert.ok(imageBlock);
    assert.equal(imageBlock.kind, 'image');
    assert.match(preview.lines[0], /Item importante/);
  }
});

test('buildDocumentPreview handles top-level text nodes and empty image sources', () => {
  const content = JSON.stringify({
    type: 'doc',
    content: [
      { type: 'text', text: 'Texto solto' },
      { type: 'image', attrs: { src: '   ' } },
    ],
  });

  const preview = buildDocumentPreview({ type: 'text', content });
  assert.equal(preview.kind, 'text');
  if (preview.kind === 'text') {
    assert.equal(preview.lines[0], 'Texto solto');
    assert.equal(preview.blocks.some((block) => block.kind === 'image'), false);
  }
});

test('buildDocumentPreview keeps defaults when blocks are empty after normalization', () => {
  const content = JSON.stringify({
    type: 'doc',
    content: [{ type: 'bulletList' }],
  });

  const preview = buildDocumentPreview({ type: 'text', content });
  assert.equal(preview.kind, 'text');
  if (preview.kind === 'text') {
    assert.deepEqual(preview.lines, ['Documento vazio']);
    assert.deepEqual(preview.blocks, [{ kind: 'paragraph', text: 'Documento vazio' }]);
  }
});

test('buildDocumentPreview skips redundant empty blocks after meaningful content', () => {
  const content = JSON.stringify({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Primeira linha' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '   ' }] },
    ],
  });

  const preview = buildDocumentPreview({ type: 'text', content });
  assert.equal(preview.kind, 'text');
  if (preview.kind === 'text') {
    assert.equal(preview.blocks.length, 1);
    assert.equal(preview.blocks[0].kind, 'paragraph');
  }
});

test('buildDocumentPreview handles missing content, null list items and non-string image src', () => {
  const withoutContent = buildDocumentPreview({ type: 'text', content: JSON.stringify({ type: 'doc' }) });
  assert.equal(withoutContent.kind, 'text');
  if (withoutContent.kind === 'text') {
    assert.deepEqual(withoutContent.lines, ['Documento vazio']);
  }

  const withNullListItem = buildDocumentPreview({
    type: 'text',
    content: JSON.stringify({
      type: 'doc',
      content: [{ type: 'bulletList', content: [null] }],
    }),
  });
  assert.equal(withNullListItem.kind, 'text');
  if (withNullListItem.kind === 'text') {
    assert.deepEqual(withNullListItem.lines, ['Documento vazio']);
  }

  const withWeirdNodes = buildDocumentPreview({
    type: 'text',
    content: JSON.stringify({
      type: 'doc',
      content: [{ type: 'text' }, { type: 'image', attrs: { src: 123 } }],
    }),
  });
  assert.equal(withWeirdNodes.kind, 'text');
  if (withWeirdNodes.kind === 'text') {
    assert.deepEqual(withWeirdNodes.lines, ['Documento vazio']);
  }
});

test('buildDocumentPreview handles null children inside heading content', () => {
  const preview = buildDocumentPreview({
    type: 'text',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'heading',
          content: [null, { type: 'text', text: 'Titulo com filho nulo' }],
        },
      ],
    }),
  });

  assert.equal(preview.kind, 'text');
  if (preview.kind === 'text') {
    assert.equal(preview.lines[0], 'Titulo com filho nulo');
  }
});

test('buildDocumentPreview extracts text from nested nodes without explicit type', () => {
  const preview = buildDocumentPreview({
    type: 'text',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              content: [{ type: 'text', text: 'Texto dentro de no sem tipo' }],
            },
          ],
        },
      ],
    }),
  });

  assert.equal(preview.kind, 'text');
  if (preview.kind === 'text') {
    assert.equal(preview.lines[0], 'Texto dentro de no sem tipo');
  }
});
