import type { FastifyPluginAsync } from 'fastify';
import type { DocumentsUseCases } from '@/application/use-cases/documents-use-cases';
import type { SupabaseSyncService } from '@/infrastructure/supabase/supabase-sync-service';

export const syncRoutes = (
  useCases: DocumentsUseCases,
  syncService: SupabaseSyncService
): FastifyPluginAsync => {
  const routes: FastifyPluginAsync = async (app) => {
    app.post('/sync/push', async () => {
      const documents = useCases.listDocuments();
      const result = await syncService.pushDocuments(documents);
      return { data: result, enabled: syncService.isEnabled() };
    });
  };

  return routes;
};
