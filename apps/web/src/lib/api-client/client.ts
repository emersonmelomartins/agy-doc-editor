import axios from 'axios';

function getImportMetaEnv(): Record<string, string | undefined> {
  return (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
}

export function resolveApiBaseUrlFromContext(params: {
  envUrl?: string;
  hostname?: string;
  protocol?: string;
}): string {
  const { envUrl, hostname, protocol } = params;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:3333/api';
  }
  if (protocol === 'https:') {
    return 'https://agy-doc-editor.onrender.com/api';
  }

  return 'http://127.0.0.1:3333/api';
}

function resolveApiBaseUrl(): string {
  const envUrl = getImportMetaEnv().VITE_API_URL;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;
  const protocol = typeof window !== 'undefined' ? window.location.protocol : undefined;
  return resolveApiBaseUrlFromContext({ envUrl, hostname, protocol });
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 30000,
});

function resolveApiOrigin(): string {
  const base = apiClient.defaults.baseURL ?? '';
  return base.endsWith('/api') ? base.slice(0, -4) : base;
}

export async function checkApiHealth(): Promise<void> {
  const apiOrigin = resolveApiOrigin();
  if (!apiOrigin) return;
  await axios.get(`${apiOrigin}/health`, { timeout: 5000 });
}

export type ApiCapabilities = {
  pdfToDocxAvailable: boolean;
  ocrAvailable: boolean;
  pdfRasterizationAvailable: boolean;
  libreOfficeVersion?: string;
  tesseractVersion?: string;
  pdftoppmVersion?: string;
};

export async function getApiCapabilities(): Promise<ApiCapabilities> {
  const response = await apiClient.get('/capabilities');
  return response.data?.data as ApiCapabilities;
}

export async function pushSync() {
  const response = await apiClient.post('/sync/push');
  return response.data as { enabled: boolean; data: { pushed: number; skipped: number } };
}

export async function getDocuments() {
  const response = await apiClient.get('/documents');
  return response.data;
}

export async function importPdfEditable(file: File): Promise<{
  data: {
    text: string;
    source: 'pdfjs' | 'ocr' | 'hybrid';
    qualityReport: {
      score: number;
      pages: Array<{ page: number; mode: 'pdfjs' | 'ocr' | 'hybrid'; confidence: number }>;
      warnings: string[];
    };
  };
}> {
  const form = new FormData();
  form.append('file', file, file.name);
  const response = await apiClient.post('/import/pdf/editable', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function convertPdfToDocx(file: File): Promise<Blob> {
  const form = new FormData();
  form.append('file', file, file.name);
  const response = await apiClient.post('/convert/pdf-to-docx', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });
  return response.data as Blob;
}
