import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { apiClient, checkApiHealth, getApiCapabilities, resolveApiBaseUrlFromContext } from '../src/lib/api-client/client.ts';

test('resolveApiBaseUrlFromContext prioritizes env url', () => {
  const resolved = resolveApiBaseUrlFromContext({
    envUrl: 'https://api.example.com/api',
    hostname: 'localhost',
    protocol: 'http:',
  });
  assert.equal(resolved, 'https://api.example.com/api');
});

test('resolveApiBaseUrlFromContext resolves localhost and https defaults', () => {
  assert.equal(
    resolveApiBaseUrlFromContext({ hostname: 'localhost', protocol: 'http:' }),
    'http://127.0.0.1:3333/api',
  );
  assert.equal(
    resolveApiBaseUrlFromContext({ hostname: 'docsi.app', protocol: 'https:' }),
    'https://agy-doc-editor.onrender.com/api',
  );
});

test('checkApiHealth calls /health on API origin', async () => {
  const originalAxiosGet = axios.get;
  let calledUrl = '';

  (axios as unknown as { get: typeof axios.get }).get = (async (url: string) => {
    calledUrl = url;
    return { data: { status: 'ok' } } as any;
  }) as typeof axios.get;

  await checkApiHealth();
  assert.equal(calledUrl, 'http://127.0.0.1:3333/health');

  (axios as unknown as { get: typeof axios.get }).get = originalAxiosGet;
});

test('getApiCapabilities reads /capabilities payload', async () => {
  const originalGet = apiClient.get;

  (apiClient as unknown as { get: typeof apiClient.get }).get = (async (url: string) => {
    assert.equal(url, '/capabilities');
    return {
      data: {
        data: {
          pdfToDocxAvailable: true,
          ocrAvailable: true,
          pdfRasterizationAvailable: true,
        },
      },
    } as any;
  }) as typeof apiClient.get;

  const caps = await getApiCapabilities();
  assert.equal(caps.pdfToDocxAvailable, true);
  assert.equal(caps.ocrAvailable, true);
  assert.equal(caps.pdfRasterizationAvailable, true);

  (apiClient as unknown as { get: typeof apiClient.get }).get = originalGet;
});
