import type { Document, DocumentType } from '@/types';

export type DocumentsFilter = 'all' | DocumentType;
export type DocumentsViewMode = 'grid' | 'list';

export interface DocumentsStats {
  total: number;
  text: number;
  spreadsheet: number;
}

export function sortDocumentsByUpdatedAt(documents: Document[]): Document[] {
  return [...documents].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function filterDocuments(documents: Document[], filter: DocumentsFilter, query: string): Document[] {
  const normalizedQuery = query.trim().toLowerCase();

  return documents
    .filter((doc) => filter === 'all' || doc.type === filter)
    .filter((doc) => doc.name.toLowerCase().includes(normalizedQuery));
}

export function getDocumentsStats(documents: Document[]): DocumentsStats {
  return {
    total: documents.length,
    text: documents.filter((d) => d.type === 'text').length,
    spreadsheet: documents.filter((d) => d.type === 'spreadsheet').length,
  };
}
