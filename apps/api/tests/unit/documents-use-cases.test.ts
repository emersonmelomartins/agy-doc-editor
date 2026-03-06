import { describe, expect, it } from 'vitest';
import { DocumentsUseCases } from '@/application/use-cases/documents-use-cases';
import type { DocumentRepository } from '@/domain/ports/document-repository';

const repository: DocumentRepository = {
  list: () => [],
  findById: () => null,
  create: (input) => ({
    id: '1',
    name: input.name,
    type: input.type,
    content: input.content,
    layout: input.layout ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  update: () => null,
  remove: () => true,
};

describe('DocumentsUseCases', () => {
  it('creates a new document', () => {
    const useCases = new DocumentsUseCases(repository);
    const created = useCases.createDocument({
      name: 'Doc',
      type: 'text',
      content: '{"type":"doc"}',
    });

    expect(created.name).toBe('Doc');
    expect(created.type).toBe('text');
  });
});
