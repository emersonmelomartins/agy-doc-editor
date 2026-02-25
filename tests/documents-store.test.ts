import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { useDocumentsStore } from '../src/store/documents-store.ts';
import { setupBrowserMocks } from './helpers/browser-mocks.ts';

let cleanup: (() => void) | undefined;

beforeEach(() => {
  const ctx = setupBrowserMocks();
  cleanup = ctx.cleanup;
  useDocumentsStore.setState({ documents: [] });
});

afterEach(() => {
  cleanup?.();
});

test('documents store creates and loads documents', () => {
  const store = useDocumentsStore.getState();
  const created = store.createNewDocument('Store Doc', 'text', '{"type":"doc","content":[]}');

  assert.ok(created.id);
  assert.equal(useDocumentsStore.getState().documents.length, 1);

  useDocumentsStore.setState({ documents: [] });
  useDocumentsStore.getState().loadDocuments();

  assert.equal(useDocumentsStore.getState().documents.length, 1);
  assert.equal(useDocumentsStore.getState().documents[0].name, 'Store Doc');
});

test('documents store updates, duplicates and deletes', () => {
  const store = useDocumentsStore.getState();
  const created = store.createNewDocument('Doc', 'text', '{"type":"doc","content":[]}');

  store.renameDocumentById(created.id, 'Doc New');
  store.updateDocumentContentById(created.id, '{"type":"doc","content":[{"type":"paragraph"}]}');
  store.updateDocumentLayoutById(created.id, { footer: '{"type":"doc","content":[]}' });

  const updated = store.findDocumentById(created.id);
  assert.equal(updated?.name, 'Doc New');
  assert.match(updated?.content ?? '', /paragraph/);
  assert.equal(updated?.layout?.footer, '{"type":"doc","content":[]}');

  const copy = store.duplicateDocumentById(created.id);
  assert.ok(copy);
  assert.equal(useDocumentsStore.getState().documents.length, 2);

  store.deleteDocumentById(created.id);
  assert.equal(useDocumentsStore.getState().documents.length, 1);
});
