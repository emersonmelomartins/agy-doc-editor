import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { StoredDocument } from '@docsi/shared-types';

export type SyncResult = {
  pushed: number;
  skipped: number;
};

export class SupabaseSyncService {
  private readonly client: SupabaseClient | null;

  constructor(url: string | undefined, anonKey: string | undefined) {
    if (!url || !anonKey) {
      this.client = null;
      return;
    }
    try {
      this.client = createClient(url, anonKey);
    } catch (error) {
      this.client = null;
      // Keep API boot resilient in misconfigured environments.
      console.warn(
        '[SupabaseSyncService] Invalid Supabase configuration. Sync disabled.',
        error instanceof Error ? error.message : error
      );
    }
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  async pushDocuments(documents: StoredDocument[]): Promise<SyncResult> {
    if (!this.client) {
      return { pushed: 0, skipped: documents.length };
    }

    const payload = documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      content: doc.content,
      layout: doc.layout,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    }));

    const { error } = await this.client.from('documents').upsert(payload, { onConflict: 'id' });
    if (error) {
      throw new Error(`Supabase sync failed: ${error.message}`);
    }

    return { pushed: payload.length, skipped: 0 };
  }
}
