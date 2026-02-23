import { Document, DocumentType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'doceditor_documents';

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
