import { create } from 'zustand';
import type { Document, DocumentType } from '../types/index.ts';
import {
  cloneDocument,
  createNewDocument as createDocumentService,
  findDocument,
  listDocuments,
  removeDocument,
  renameDocumentById as renameDocumentService,
  saveDocumentContent,
} from '../services/documents-service.ts';

interface DocumentsState {
  documents: Document[];
  loadDocuments: () => void;
  createNewDocument: (name: string, type: DocumentType, content: string, templateId?: string) => Document;
  updateDocumentContentById: (id: string, content: string) => void;
  renameDocumentById: (id: string, name: string) => void;
  deleteDocumentById: (id: string) => void;
  duplicateDocumentById: (id: string) => Document | null;
  findDocumentById: (id: string) => Document | null;
}

function refreshDocuments(set: (payload: { documents: Document[] }) => void): void {
  set({ documents: listDocuments() });
}

export const useDocumentsStore = create<DocumentsState>((set) => ({
  documents: [],

  loadDocuments: () => {
    refreshDocuments(set);
  },

  createNewDocument: (name, type, content, templateId) => {
    const doc = createDocumentService(name, type, content, templateId);
    refreshDocuments(set);
    return doc;
  },

  updateDocumentContentById: (id, content) => {
    saveDocumentContent(id, content);
    refreshDocuments(set);
  },

  renameDocumentById: (id, name) => {
    renameDocumentService(id, name);
    refreshDocuments(set);
  },

  deleteDocumentById: (id) => {
    removeDocument(id);
    refreshDocuments(set);
  },

  duplicateDocumentById: (id) => {
    const copy = cloneDocument(id);
    refreshDocuments(set);
    return copy;
  },

  findDocumentById: (id) => {
    return findDocument(id);
  },
}));
