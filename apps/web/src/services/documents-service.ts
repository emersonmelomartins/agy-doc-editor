import type { Document, DocumentLayout, DocumentType } from '../types/index.ts';
import { sortDocumentsByUpdatedAt } from '../features/documents/model.ts';
import type { DocumentsRepository } from './documents-repository.ts';
import { LocalStorageDocumentsRepository } from './documents-repository.ts';

let documentsRepository: DocumentsRepository = new LocalStorageDocumentsRepository();

export function setDocumentsRepositoryForTests(nextRepository: DocumentsRepository): void {
  documentsRepository = nextRepository;
}

export function resetDocumentsRepositoryForTests(): void {
  documentsRepository = new LocalStorageDocumentsRepository();
}

export function listDocuments(): Document[] {
  return sortDocumentsByUpdatedAt(documentsRepository.list());
}

export function findDocument(id: string): Document | null {
  return documentsRepository.findById(id);
}

export function createNewDocument(
  name: string,
  type: DocumentType,
  content: string,
  templateId?: string
): Document {
  return documentsRepository.create(name, type, content, templateId);
}

export function saveDocumentContent(id: string, content: string): void {
  documentsRepository.updateContent(id, content);
}

export function updateDocumentLayout(id: string, layout: DocumentLayout | null): void {
  documentsRepository.updateLayout(id, layout);
}

export function renameDocumentById(id: string, name: string): void {
  documentsRepository.rename(id, name);
}

export function removeDocument(id: string): void {
  documentsRepository.remove(id);
}

export function cloneDocument(id: string): Document | null {
  return documentsRepository.duplicate(id);
}
