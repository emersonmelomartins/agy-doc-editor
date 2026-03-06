import { pushSync } from '@/lib/api-client';

export async function pushDocumentsSync(): Promise<{ enabled: boolean; data: { pushed: number; skipped: number } }> {
  return pushSync();
}
