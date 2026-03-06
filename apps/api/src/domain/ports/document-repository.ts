import type { StoredDocument } from '@docsi/shared-types';
import type { CreateDocumentInput } from '@/domain/entities/document';

export interface DocumentRepository {
  list(): StoredDocument[];
  findById(id: string): StoredDocument | null;
  create(input: CreateDocumentInput): StoredDocument;
  update(id: string, patch: Partial<Pick<StoredDocument, 'name' | 'content' | 'layout'>>): StoredDocument | null;
  remove(id: string): boolean;
}
