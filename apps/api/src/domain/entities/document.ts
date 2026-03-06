import type { DocumentLayout, DocumentType, StoredDocument } from '@docsi/shared-types';

export type CreateDocumentInput = {
  name: string;
  type: DocumentType;
  content: string;
  layout?: DocumentLayout | null;
};

export function createDocumentEntity(
  id: string,
  input: CreateDocumentInput,
  now: string
): StoredDocument {
  return {
    id,
    name: input.name,
    type: input.type,
    content: input.content,
    layout: input.layout ?? null,
    createdAt: now,
    updatedAt: now,
  };
}
