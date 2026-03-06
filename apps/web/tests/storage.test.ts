import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  createDocument,
  deleteDocument,
  duplicateDocument,
  ensureDemoDocumentsSeeded,
  getDocument,
  getDocuments,
  renameDocument,
  updateDocumentLayout,
  updateDocumentContent,
} from '../src/lib/storage.ts';
import { DEMO_DOCUMENTS } from '../src/lib/demo-documents.ts';
import { setupBrowserMocks } from './helpers/browser-mocks.ts';

let cleanup: (() => void) | undefined;

beforeEach(() => {
  const ctx = setupBrowserMocks();
  cleanup = ctx.cleanup;
});

afterEach(() => {
  cleanup?.();
});

test('storage supports create, read, update and delete lifecycle', () => {
  const created = createDocument('Doc 1', 'text', '{"type":"doc","content":[]}');

  assert.ok(created.id);
  assert.equal(getDocuments().length, 1);
  assert.equal(getDocument(created.id)?.name, 'Doc 1');

  renameDocument(created.id, 'Doc Renamed');
  updateDocumentContent(created.id, '{"type":"doc","content":[{"type":"paragraph"}]}');
  updateDocumentLayout(created.id, { header: '{"type":"doc","content":[]}' });
  updateDocumentLayout(created.id, null);

  const updated = getDocument(created.id);
  assert.equal(updated?.name, 'Doc Renamed');
  assert.match(updated?.content ?? '', /paragraph/);
  assert.equal(updated?.layout, undefined);

  deleteDocument(created.id);
  assert.equal(getDocuments().length, 0);
});

test('storage duplicates an existing document', () => {
  const original = createDocument('Base', 'spreadsheet', '{"data":[[1]]}');
  const copy = duplicateDocument(original.id);

  assert.ok(copy);
  assert.notEqual(copy?.id, original.id);
  assert.equal(copy?.name, 'Base (Cópia)');
  assert.equal(getDocuments().length, 2);
});

test('storage handles malformed JSON and missing document operations safely', () => {
  localStorage.setItem('doceditor_documents', '{invalid-json');
  assert.deepEqual(getDocuments(), []);
  assert.equal(getDocument('missing-id'), null);
  assert.equal(duplicateDocument('missing-id'), null);

  renameDocument('missing-id', 'Noop');
  updateDocumentContent('missing-id', '{"type":"doc","content":[]}');
  deleteDocument('missing-id');

  assert.deepEqual(getDocuments(), []);
});

test('storage returns empty list when window is unavailable', () => {
  const runtimeGlobal = globalThis as typeof globalThis & { window?: Window };
  const originalWindow = runtimeGlobal.window;
  Reflect.deleteProperty(runtimeGlobal, 'window');

  assert.deepEqual(getDocuments(), []);

  runtimeGlobal.window = originalWindow;
});

test('ensureDemoDocumentsSeeded does not add demo documents when storage is empty', () => {
  ensureDemoDocumentsSeeded();
  const firstSeed = getDocuments();
  assert.equal(firstSeed.length, 0);

  ensureDemoDocumentsSeeded();
  const secondSeed = getDocuments();
  assert.equal(secondSeed.length, 0);
});

test('ensureDemoDocumentsSeeded recovers from malformed storage and sets seed version', () => {
  localStorage.setItem('doceditor_documents', '{invalid-json');
  ensureDemoDocumentsSeeded();

  const docs = getDocuments();
  assert.equal(docs.length, 0);
  assert.equal(localStorage.getItem('doceditor_seed_version'), 'v2');
});

test('ensureDemoDocumentsSeeded does not add documents to existing storage', () => {
  const created = createDocument('My Doc', 'text', '{"type":"doc","content":[]}');
  const countBefore = getDocuments().length;
  ensureDemoDocumentsSeeded();
  const docs = getDocuments();
  assert.equal(docs.length, countBefore);
  assert.equal(getDocument(created.id)?.name, 'My Doc');
});

test('ensureDemoDocumentsSeeded adds missing seeded templates and cleans old seeded docs on version change', () => {
  const now = new Date().toISOString();
  const seededTemplate = {
    name: 'Template Seed',
    type: 'text' as const,
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Seed"}]}]}',
    templateId: 'seed-template',
  };
  const seededWithoutId = {
    name: 'Template Sem ID',
    type: 'text' as const,
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"SemID"}]}]}',
  };
  DEMO_DOCUMENTS.push(seededTemplate, seededWithoutId);

  localStorage.setItem(
    'doceditor_documents',
    JSON.stringify([
      {
        id: 'legacy-seed',
        name: 'Seed legado',
        type: 'text',
        content: '{}',
        createdAt: now,
        updatedAt: now,
        templateId: 'legacy-template',
      },
      {
        id: 'regular-doc',
        name: 'Documento regular',
        type: 'text',
        content: '{}',
        createdAt: now,
        updatedAt: now,
      },
    ])
  );
  localStorage.setItem('doceditor_seed_version', 'v1');

  try {
    ensureDemoDocumentsSeeded();
    const docsAfterSeed = getDocuments();
    assert.equal(docsAfterSeed.some((doc) => doc.id === 'legacy-seed'), false);
    assert.equal(docsAfterSeed.some((doc) => doc.id === 'regular-doc'), true);
    assert.equal(docsAfterSeed.some((doc) => doc.templateId === 'seed-template'), true);
    assert.equal(docsAfterSeed.some((doc) => doc.templateId === 'seed-2'), true);
    assert.equal(localStorage.getItem('doceditor_seed_version'), 'v2');

    ensureDemoDocumentsSeeded();
    const docsAfterSecondRun = getDocuments();
    const seedCount = docsAfterSecondRun.filter(
      (doc) => doc.templateId === 'seed-template' || doc.templateId === 'seed-2'
    ).length;
    assert.equal(seedCount, 2);
  } finally {
    const seedIndex = DEMO_DOCUMENTS.findIndex((doc) => doc.templateId === 'seed-template');
    if (seedIndex >= 0) {
      DEMO_DOCUMENTS.splice(seedIndex, 1);
    }
    const fallbackSeedIndex = DEMO_DOCUMENTS.findIndex((doc) => doc.name === 'Template Sem ID');
    if (fallbackSeedIndex >= 0) {
      DEMO_DOCUMENTS.splice(fallbackSeedIndex, 1);
    }
  }
});

test('ensureDemoDocumentsSeeded is a no-op when window is unavailable', () => {
  const runtimeGlobal = globalThis as typeof globalThis & { window?: Window };
  const originalWindow = runtimeGlobal.window;
  Reflect.deleteProperty(runtimeGlobal, 'window');

  assert.doesNotThrow(() => ensureDemoDocumentsSeeded());

  runtimeGlobal.window = originalWindow;
});
