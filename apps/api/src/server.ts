import { buildApp } from '@/app';

const port = Number(process.env.PORT ?? 3333);
const host = process.env.HOST ?? '0.0.0.0';

const app = await buildApp({
  databasePath: process.env.SQLITE_PATH ?? './docsi.db',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
});

await app.listen({ port, host });
