import type { Document, DocumentType } from '../types/index.ts';
import {
  createDocument,
  deleteDocument,
  duplicateDocument,
  getDocument,
  getDocuments,
  renameDocument,
  updateDocumentContent,
} from '../lib/storage.ts';

export interface DocumentsRepository {
  list(): Document[];
  findById(id: string): Document | null;
  create(name: string, type: DocumentType, content: string, templateId?: string): Document;
  updateContent(id: string, content: string): void;
  rename(id: string, name: string): void;
  remove(id: string): void;
  duplicate(id: string): Document | null;
}

export class LocalStorageDocumentsRepository implements DocumentsRepository {
  list(): Document[] {
    return getDocuments();
  }

  findById(id: string): Document | null {
    return getDocument(id);
  }

  create(name: string, type: DocumentType, content: string, templateId?: string): Document {
    return createDocument(name, type, content, templateId);
  }

  updateContent(id: string, content: string): void {
    updateDocumentContent(id, content);
  }

  rename(id: string, name: string): void {
    renameDocument(id, name);
  }

  remove(id: string): void {
    deleteDocument(id);
  }

  duplicate(id: string): Document | null {
    return duplicateDocument(id);
  }
}
