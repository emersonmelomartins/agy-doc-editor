const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;
const WHITESPACE_SEQUENCE = /\s+/g;
const TRAILING_DOTS_AND_SPACES = /[. ]+$/g;

function normalizeExtension(extension: string): string {
  const trimmed = extension.trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.startsWith('.') ? trimmed.slice(1) : trimmed;
}

function inferExtensionFromMime(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('officedocument.wordprocessingml.document')) return 'docx';
  if (normalized.includes('pdf')) return 'pdf';
  if (normalized.includes('json')) return 'json';
  if (normalized.includes('spreadsheetml.sheet')) return 'xlsx';
  if (normalized.includes('csv')) return 'csv';
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  if (normalized.includes('gif')) return 'gif';
  return '';
}

function ensureDownloadFileName(filename: string, blob: Blob): string {
  const sanitizedBaseName = sanitizeFileBaseName(filename, 'documento');
  const hasExtension = /\.[a-z0-9]+$/i.test(sanitizedBaseName);
  if (hasExtension) return sanitizedBaseName;

  const inferredExtension = inferExtensionFromMime(blob.type);
  if (!inferredExtension) return sanitizedBaseName;
  return `${sanitizedBaseName}.${inferredExtension}`;
}

export function sanitizeFileBaseName(rawName: string, fallback = 'documento'): string {
  const normalized = rawName
    .trim()
    .replace(INVALID_FILENAME_CHARS, ' ')
    .replace(WHITESPACE_SEQUENCE, ' ')
    .replace(TRAILING_DOTS_AND_SPACES, '')
    .trim();

  return normalized || fallback;
}

export function buildExportFileName(rawName: string, extension: string, fallback = 'documento'): string {
  const normalizedExtension = normalizeExtension(extension);
  const sanitizedBaseName = sanitizeFileBaseName(rawName, fallback);
  const lowerBaseName = sanitizedBaseName.toLowerCase();

  if (normalizedExtension && lowerBaseName.endsWith(`.${normalizedExtension}`)) {
    return sanitizedBaseName;
  }

  if (!normalizedExtension) return sanitizedBaseName;
  return `${sanitizedBaseName}.${normalizedExtension}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const resolvedName = ensureDownloadFileName(filename, blob);
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = resolvedName;
  link.rel = 'noopener';
  window.document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
