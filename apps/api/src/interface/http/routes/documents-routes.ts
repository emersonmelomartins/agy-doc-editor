import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import type { DocumentsUseCases } from '@/application/use-cases/documents-use-cases';

const createDocumentSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['text', 'spreadsheet']),
  content: z.string().min(1),
  layout: z
    .object({
      header: z.string().nullable().optional(),
      footer: z.string().nullable().optional(),
      cover: z.string().nullable().optional(),
      hideHeaderOnCover: z.boolean().optional(),
      hideFooterOnCover: z.boolean().optional(),
    })
    .nullable()
    .optional(),
});

const updateDocumentSchema = z.object({
  name: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  layout: z
    .object({
      header: z.string().nullable().optional(),
      footer: z.string().nullable().optional(),
      cover: z.string().nullable().optional(),
      hideHeaderOnCover: z.boolean().optional(),
      hideFooterOnCover: z.boolean().optional(),
    })
    .nullable()
    .optional(),
});

export const documentsRoutes = (useCases: DocumentsUseCases): FastifyPluginAsync => {
  const routes: FastifyPluginAsync = async (app) => {
    app.get('/documents', async () => ({ data: useCases.listDocuments() }));

    app.get('/documents/:id', async (request, reply) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const document = useCases.getDocument(params.id);
      if (!document) {
        return reply.status(404).send({ message: 'Document not found' });
      }
      return { data: document };
    });

    app.post('/documents', async (request, reply) => {
      const body = createDocumentSchema.parse(request.body);
      const created = useCases.createDocument(body);
      return reply.status(201).send({ data: created });
    });

    app.patch('/documents/:id', async (request, reply) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = updateDocumentSchema.parse(request.body);
      const updated = useCases.updateDocument(params.id, body);
      if (!updated) {
        return reply.status(404).send({ message: 'Document not found' });
      }
      return { data: updated };
    });

    app.delete('/documents/:id', async (request, reply) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const deleted = useCases.deleteDocument(params.id);
      if (!deleted) {
        return reply.status(404).send({ message: 'Document not found' });
      }
      return reply.status(204).send();
    });
  };

  return routes;
};
