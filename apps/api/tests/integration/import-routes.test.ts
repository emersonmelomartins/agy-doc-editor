import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { buildApp } from '@/app';

let app: Awaited<ReturnType<typeof buildApp>>;
let dbDir = '';

const fixturePath = resolve(process.cwd(), '../../tests/fixtures/pdf/executive-summary.pdf');

function createMultipartBody(fileName: string, contentType: string, fileContent: Buffer) {
  const boundary = `----docsi-test-${Math.random().toString(16).slice(2)}`;
  const head = Buffer.from(
    `--${boundary}\r\n`
      + `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`
      + `Content-Type: ${contentType}\r\n\r\n`,
    'utf-8'
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
  return {
    boundary,
    body: Buffer.concat([head, fileContent, tail]),
  };
}

function hasBinary(command: string): boolean {
  return spawnSync('which', [command], { stdio: 'ignore' }).status === 0;
}

beforeAll(async () => {
  dbDir = await mkdtemp(join(tmpdir(), 'docsi-api-import-test-'));
  app = await buildApp({ databasePath: join(dbDir, 'test.db') });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await rm(dbDir, { recursive: true, force: true });
});

describe('import routes', () => {
  it('returns capabilities contract', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/capabilities' });
    expect(response.statusCode).toBe(200);
    const payload = response.json() as {
      data: {
        pdfToDocxAvailable: boolean;
        ocrAvailable: boolean;
        pdfRasterizationAvailable: boolean;
      };
    };

    expect(typeof payload.data.pdfToDocxAvailable).toBe('boolean');
    expect(typeof payload.data.ocrAvailable).toBe('boolean');
    expect(typeof payload.data.pdfRasterizationAvailable).toBe('boolean');
  });

  it('returns 400 when file is missing for editable import', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/import/pdf/editable' });
    expect(response.statusCode).toBe(400);
  });

  it('imports editable text from fixture PDF with quality metadata', async () => {
    const fixture = await readFile(fixturePath);
    const multipart = createMultipartBody('executive-summary.pdf', 'application/pdf', fixture);

    const response = await app.inject({
      method: 'POST',
      url: '/api/import/pdf/editable',
      payload: multipart.body,
      headers: {
        'content-type': `multipart/form-data; boundary=${multipart.boundary}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as {
      data: {
        text: string;
        source: 'pdfjs' | 'ocr' | 'hybrid';
        qualityReport: {
          score: number;
          pages: Array<{ page: number; mode: 'pdfjs' | 'ocr' | 'hybrid'; confidence: number }>;
          warnings: string[];
        };
      };
    };

    expect(typeof payload.data.text).toBe('string');
    expect(payload.data.text.length).toBeGreaterThan(0);
    expect(['pdfjs', 'ocr', 'hybrid']).toContain(payload.data.source);
    expect(typeof payload.data.qualityReport.score).toBe('number');
    expect(Array.isArray(payload.data.qualityReport.pages)).toBe(true);
    expect(Array.isArray(payload.data.qualityReport.warnings)).toBe(true);
  }, 30_000);

  it('returns 500 for invalid pdf content on editable import', async () => {
    const invalid = Buffer.from('not-a-real-pdf', 'utf-8');
    const multipart = createMultipartBody('invalid.pdf', 'application/pdf', invalid);

    const response = await app.inject({
      method: 'POST',
      url: '/api/import/pdf/editable',
      payload: multipart.body,
      headers: {
        'content-type': `multipart/form-data; boundary=${multipart.boundary}`,
      },
    });

    expect(response.statusCode).toBe(500);
  });

  it('returns 400 when file is missing for pdf-to-docx conversion', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/convert/pdf-to-docx' });
    expect(response.statusCode).toBe(400);
  });

  it('returns DOCX or explicit conversion error for pdf-to-docx', async () => {
    const fixture = await readFile(fixturePath);
    const multipart = createMultipartBody('executive-summary.pdf', 'application/pdf', fixture);

    const response = await app.inject({
      method: 'POST',
      url: '/api/convert/pdf-to-docx',
      payload: multipart.body,
      headers: {
        'content-type': `multipart/form-data; boundary=${multipart.boundary}`,
      },
    });

    if (response.statusCode === 200) {
      expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const body = response.body;
      expect(body.length).toBeGreaterThan(512);
      expect(body.charCodeAt(0)).toBe(80); // 'P' from zip PK
      expect(body.charCodeAt(1)).toBe(75); // 'K'
      return;
    }

    expect(response.statusCode).toBe(503);
    const payload = response.json() as { code?: string };
    expect(['LIBREOFFICE_NOT_INSTALLED', 'PDF_CONVERTER_NOT_AVAILABLE']).toContain(payload.code);
  }, 30_000);
});

describe.skipIf(!(hasBinary('soffice') && hasBinary('pdftoppm')))('engine conversion (requires libreoffice + poppler)', () => {
  it('converts fixture PDF to non-empty DOCX and extracts non-trivial editable text', async () => {
    const fixture = await readFile(fixturePath);
    const multipartConvert = createMultipartBody('executive-summary.pdf', 'application/pdf', fixture);

    const convertResponse = await app.inject({
      method: 'POST',
      url: '/api/convert/pdf-to-docx',
      payload: multipartConvert.body,
      headers: {
        'content-type': `multipart/form-data; boundary=${multipartConvert.boundary}`,
      },
    });

    expect(convertResponse.statusCode).toBe(200);
    const docxBuffer = Buffer.from(convertResponse.body, 'binary');
    expect(docxBuffer.length).toBeGreaterThan(2048);
    expect(docxBuffer.includes(Buffer.from('word/document.xml'))).toBe(true);

    const multipartEditable = createMultipartBody('executive-summary.pdf', 'application/pdf', fixture);
    const editableResponse = await app.inject({
      method: 'POST',
      url: '/api/import/pdf/editable',
      payload: multipartEditable.body,
      headers: {
        'content-type': `multipart/form-data; boundary=${multipartEditable.boundary}`,
      },
    });

    expect(editableResponse.statusCode).toBe(200);
    const payload = editableResponse.json() as { data: { text: string } };
    expect(payload.data.text.length).toBeGreaterThan(120);
    expect(payload.data.text.replace(/\s+/g, ' ').trim()).not.toMatch(/^0?1\s+0?2$/);
  }, 60_000);
});
