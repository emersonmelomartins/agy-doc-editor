import type { Document, DocumentType } from '../types/index.ts';
import { v4 as uuidv4 } from 'uuid';
import { DEMO_DOCUMENTS } from './demo-documents.ts';

const STORAGE_KEY = 'doceditor_documents';
const SEED_VERSION_KEY = 'doceditor_seed_version';
const SEED_VERSION = 'v2';

export function ensureDemoDocumentsSeeded(): void {
  if (typeof window === 'undefined') return;

  const raw = localStorage.getItem(STORAGE_KEY);
  let docs: Document[] = [];
  try {
    docs = raw ? JSON.parse(raw) : [];
  } catch {
    docs = [];
  }

  const storedVersion = localStorage.getItem(SEED_VERSION_KEY);
  const versionChanged = storedVersion !== SEED_VERSION;

  if (versionChanged) {
    docs = docs.filter((doc) => !doc.templateId);
  }

  const existingTemplateIds = new Set(docs.map((doc) => doc.templateId).filter(Boolean));
  const now = new Date().toISOString();
  const missingDemoDocs = DEMO_DOCUMENTS
    .filter((seed, idx) => {
      const templateId = seed.templateId ?? `seed-${idx + 1}`;
      return !existingTemplateIds.has(templateId);
    })
    .map((seed, idx) => ({
      id: uuidv4(),
      name: seed.name,
      type: seed.type,
      content: seed.content,
      createdAt: now,
      updatedAt: now,
      templateId: seed.templateId ?? `seed-${idx + 1}`,
    }));

  if (!missingDemoDocs.length && !versionChanged) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify([...docs, ...missingDemoDocs]));
  localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
}

export function getDocuments(): Document[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getDocument(id: string): Document | null {
  const docs = getDocuments();
  return docs.find((d) => d.id === id) || null;
}

export function saveDocument(doc: Document): void {
  const docs = getDocuments();
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    docs[idx] = doc;
  } else {
    docs.push(doc);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function createDocument(
  name: string,
  type: DocumentType,
  content: string = '',
  templateId?: string
): Document {
  const doc: Document = {
    id: uuidv4(),
    name,
    type,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateId,
  };
  saveDocument(doc);
  return doc;
}

export function updateDocumentContent(id: string, content: string): void {
  const doc = getDocument(id);
  if (doc) {
    doc.content = content;
    doc.updatedAt = new Date().toISOString();
    saveDocument(doc);
  }
}

export function renameDocument(id: string, name: string): void {
  const doc = getDocument(id);
  if (doc) {
    doc.name = name;
    doc.updatedAt = new Date().toISOString();
    saveDocument(doc);
  }
}

export function duplicateDocument(id: string): Document | null {
  const doc = getDocument(id);
  if (!doc) return null;
  const copy: Document = {
    ...doc,
    id: uuidv4(),
    name: `${doc.name} (Cópia)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveDocument(copy);
  return copy;
}

export function deleteDocument(id: string): void {
  const docs = getDocuments().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}
