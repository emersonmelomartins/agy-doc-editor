import test from 'node:test';
import assert from 'node:assert/strict';

import { filterDocuments, getDocumentsStats, sortDocumentsByUpdatedAt } from '../src/features/documents/model.ts';
import type { Document } from '../src/types/index.ts';

const docs: Document[] = [
  {
    id: '1',
    name: 'Relatorio Financeiro',
    type: 'text',
    content: '{}',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
  },
  {
    id: '2',
    name: 'Planilha Vendas',
    type: 'spreadsheet',
    content: '{}',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  },
  {
    id: '3',
    name: 'Ata Reuniao',
    type: 'text',
    content: '{}',
    createdAt: '2026-01-03T10:00:00.000Z',
    updatedAt: '2026-01-03T10:00:00.000Z',
  },
];

test('sortDocumentsByUpdatedAt sorts descending by updatedAt', () => {
  const sorted = sortDocumentsByUpdatedAt(docs);
  assert.deepEqual(sorted.map((d) => d.id), ['3', '2', '1']);
});

test('filterDocuments applies type and query filters', () => {
  const filteredText = filterDocuments(docs, 'text', 'ata');
  assert.equal(filteredText.length, 1);
  assert.equal(filteredText[0].id, '3');

  const filteredAll = filterDocuments(docs, 'all', 'planilha');
  assert.equal(filteredAll.length, 1);
  assert.equal(filteredAll[0].id, '2');
});

test('getDocumentsStats returns aggregate counts', () => {
  const stats = getDocumentsStats(docs);
  assert.deepEqual(stats, { total: 3, text: 2, spreadsheet: 1 });
});
