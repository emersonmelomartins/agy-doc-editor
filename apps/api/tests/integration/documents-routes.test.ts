import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildApp } from '@/app';

let app: Awaited<ReturnType<typeof buildApp>>;
let dbDir = '';

beforeAll(async () => {
  dbDir = await mkdtemp(join(tmpdir(), 'docsi-api-test-'));
  app = await buildApp({ databasePath: join(dbDir, 'test.db') });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await rm(dbDir, { recursive: true, force: true });
});

describe('documents routes', () => {
  it('creates and lists a document', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/documents',
      payload: {
        name: 'Integration Doc',
        type: 'text',
        content: '{"type":"doc"}',
      },
    });

    expect(created.statusCode).toBe(201);

    const listed = await app.inject({ method: 'GET', url: '/api/documents' });
    expect(listed.statusCode).toBe(200);

    const payload = listed.json() as { data: Array<{ name: string }> };
    expect(payload.data.some((item) => item.name === 'Integration Doc')).toBe(true);
  });

  it('returns health check', async () => {
    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: 'ok' });
  });
});
