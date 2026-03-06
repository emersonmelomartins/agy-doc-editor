import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3333/api',
  timeout: 30000,
});

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
    qualityReport: {
      score: number;
      pages: Array<{ page: number; mode: string; confidence: number }>;
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
