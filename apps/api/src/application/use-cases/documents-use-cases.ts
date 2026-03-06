import type { DocumentRepository } from '@/domain/ports/document-repository';
import type { StoredDocument } from '@docsi/shared-types';
import type { CreateDocumentInput } from '@/domain/entities/document';

export class DocumentsUseCases {
  constructor(private readonly repository: DocumentRepository) {}

  listDocuments(): StoredDocument[] {
    return this.repository.list();
  }

  getDocument(id: string): StoredDocument | null {
    return this.repository.findById(id);
  }

  createDocument(input: CreateDocumentInput): StoredDocument {
    return this.repository.create(input);
  }

  updateDocument(
    id: string,
    patch: Partial<Pick<StoredDocument, 'name' | 'content' | 'layout'>>
  ): StoredDocument | null {
    return this.repository.update(id, patch);
  }

  deleteDocument(id: string): boolean {
    return this.repository.remove(id);
  }
}
