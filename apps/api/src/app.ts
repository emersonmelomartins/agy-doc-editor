import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { DocumentsUseCases } from '@/application/use-cases/documents-use-cases';
import { createSqliteDatabase, SqliteDocumentRepository } from '@/infrastructure/sqlite/sqlite-document-repository';
import { SupabaseSyncService } from '@/infrastructure/supabase/supabase-sync-service';
import { documentsRoutes } from '@/interface/http/routes/documents-routes';
import { syncRoutes } from '@/interface/http/routes/sync-routes';
import { importRoutes } from '@/interface/http/routes/import-routes';
import { ConversionEngineService } from '@/infrastructure/conversion/conversion-engine-service';

export type BuildAppOptions = {
  databasePath: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({ logger: true });

  const db = createSqliteDatabase(options.databasePath);
  const repository = new SqliteDocumentRepository(db);
  const useCases = new DocumentsUseCases(repository);
  const syncService = new SupabaseSyncService(options.supabaseUrl, options.supabaseAnonKey);
  const conversionService = new ConversionEngineService();

  await app.register(cors, { origin: true });
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 1,
    },
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Docsi API',
        version: '1.0.0',
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.get('/health', async () => ({ status: 'ok' }));
  await app.register(documentsRoutes(useCases), { prefix: '/api' });
  await app.register(syncRoutes(useCases, syncService), { prefix: '/api' });
  await app.register(importRoutes(conversionService), { prefix: '/api' });

  app.setErrorHandler((error, _request, reply) => {
    const asRecord = error as { code?: string; message?: string };
    const message = asRecord.message ?? '';
    const code = asRecord.code;
    if (code === 'ENOENT' && message.includes('soffice')) {
      return reply.status(503).send({
        code: 'LIBREOFFICE_NOT_INSTALLED',
        message: 'LibreOffice (soffice) nao esta instalado no servidor. Instale para habilitar PDF->DOCX.',
      });
    }
    return reply.status(500).send({
      code: 'INTERNAL_SERVER_ERROR',
      message: message || 'Unexpected server error.',
    });
  });

  return app;
}
