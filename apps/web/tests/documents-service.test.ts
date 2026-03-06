import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  cloneDocument,
  createNewDocument,
  findDocument,
  listDocuments,
  removeDocument,
  renameDocumentById,
  resetDocumentsRepositoryForTests,
  saveDocumentContent,
  setDocumentsRepositoryForTests,
  updateDocumentLayout,
} from '../src/services/documents-service.ts';
import type { Document, DocumentLayout, DocumentType } from '../src/types/index.ts';
import type { DocumentsRepository } from '../src/services/documents-repository.ts';

class InMemoryDocumentsRepository implements DocumentsRepository {
  private readonly documents: Document[];

  constructor(seed: Document[] = []) {
    this.documents = [...seed];
  }

  list(): Document[] {
    return [...this.documents];
  }

  findById(id: string): Document | null {
    return this.documents.find((doc) => doc.id === id) ?? null;
  }

  create(name: string, type: DocumentType, content: string): Document {
    const now = new Date().toISOString();
    const doc: Document = {
      id: `doc-${this.documents.length + 1}`,
      name,
      type,
      content,
      createdAt: now,
      updatedAt: now,
    };
    this.documents.push(doc);
    return doc;
  }

  updateContent(id: string, content: string): void {
    const doc = this.findById(id);
    if (!doc) return;
    doc.content = content;
  }

  updateLayout(id: string, layout: DocumentLayout | null): void {
    const doc = this.findById(id);
    if (!doc) return;
    doc.layout = layout ?? undefined;
  }

  rename(id: string, name: string): void {
    const doc = this.findById(id);
    if (!doc) return;
    doc.name = name;
  }

  remove(id: string): void {
    const idx = this.documents.findIndex((doc) => doc.id === id);
    if (idx >= 0) this.documents.splice(idx, 1);
  }

  duplicate(id: string): Document | null {
    const source = this.findById(id);
    if (!source) return null;
    const copy: Document = {
      ...source,
      id: `${source.id}-copy`,
      name: `${source.name} (copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.documents.push(copy);
    return copy;
  }
}

afterEach(() => {
  resetDocumentsRepositoryForTests();
});

test('documents service sorts list and applies mutations through repository contract', () => {
  const repo = new InMemoryDocumentsRepository([
    {
      id: '1',
      name: 'Old',
      type: 'text',
      content: '{}',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: '2',
      name: 'New',
      type: 'text',
      content: '{}',
      createdAt: '2026-01-02T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    },
  ]);
  setDocumentsRepositoryForTests(repo);

  assert.deepEqual(listDocuments().map((doc) => doc.id), ['2', '1']);

  const created = createNewDocument('Report', 'text', '{"type":"doc"}');
  assert.equal(findDocument(created.id)?.name, 'Report');

  renameDocumentById(created.id, 'Report v2');
  saveDocumentContent(created.id, '{"type":"doc","content":[{"type":"paragraph"}]}');
  updateDocumentLayout(created.id, { header: '{"type":"doc","content":[]}' });
  assert.match(findDocument(created.id)?.content ?? '', /paragraph/);
  assert.equal(findDocument(created.id)?.layout?.header, '{"type":"doc","content":[]}');

  const copy = cloneDocument(created.id);
  assert.ok(copy);

  removeDocument(created.id);
  assert.equal(findDocument(created.id), null);
});
