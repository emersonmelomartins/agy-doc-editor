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

  const updated = getDocument(created.id);
  assert.equal(updated?.name, 'Doc Renamed');
  assert.match(updated?.content ?? '', /paragraph/);

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

test('ensureDemoDocumentsSeeded inserts demo docs once and avoids duplicates', () => {
  ensureDemoDocumentsSeeded();
  const firstSeed = getDocuments();
  assert.equal(firstSeed.length, DEMO_DOCUMENTS.length);

  ensureDemoDocumentsSeeded();
  const secondSeed = getDocuments();
  assert.equal(secondSeed.length, DEMO_DOCUMENTS.length);
});

test('ensureDemoDocumentsSeeded recovers from malformed storage and sets seed version', () => {
  localStorage.setItem('doceditor_documents', '{invalid-json');
  ensureDemoDocumentsSeeded();

  const docs = getDocuments();
  assert.equal(docs.length, DEMO_DOCUMENTS.length);
  assert.equal(localStorage.getItem('doceditor_seed_version'), 'v1');
});

test('ensureDemoDocumentsSeeded appends only missing templates', () => {
  const now = new Date().toISOString();
  localStorage.setItem('doceditor_documents', JSON.stringify([{
    id: 'existing-1',
    name: DEMO_DOCUMENTS[0].name,
    type: DEMO_DOCUMENTS[0].type,
    content: DEMO_DOCUMENTS[0].content,
    createdAt: now,
    updatedAt: now,
    templateId: DEMO_DOCUMENTS[0].templateId,
  }]));

  ensureDemoDocumentsSeeded();
  const docs = getDocuments();
  assert.equal(docs.length, DEMO_DOCUMENTS.length);
  assert.equal(
    docs.filter((doc) => doc.templateId === DEMO_DOCUMENTS[0].templateId).length,
    1
  );
});

test('ensureDemoDocumentsSeeded is a no-op when window is unavailable', () => {
  const runtimeGlobal = globalThis as typeof globalThis & { window?: Window };
  const originalWindow = runtimeGlobal.window;
  Reflect.deleteProperty(runtimeGlobal, 'window');

  assert.doesNotThrow(() => ensureDemoDocumentsSeeded());

  runtimeGlobal.window = originalWindow;
});

test('ensureDemoDocumentsSeeded creates fallback template ids when missing', () => {
  const first = DEMO_DOCUMENTS[0];
  const originalTemplateId = first.templateId;
  (first as { templateId?: string }).templateId = undefined;

  try {
    ensureDemoDocumentsSeeded();
    const docs = getDocuments();
    assert.ok(docs.some((doc) => doc.templateId === 'seed-1'));
  } finally {
    (first as { templateId?: string }).templateId = originalTemplateId;
  }
});
