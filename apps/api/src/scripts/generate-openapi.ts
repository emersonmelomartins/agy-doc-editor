import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildApp } from '@/app';

const app = await buildApp({ databasePath: ':memory:' });
await app.ready();

const spec = app.swagger();
const outputPath = resolve(process.cwd(), 'openapi.json');
await writeFile(outputPath, JSON.stringify(spec, null, 2), 'utf8');

await app.close();
console.log(`OpenAPI generated at ${outputPath}`);
