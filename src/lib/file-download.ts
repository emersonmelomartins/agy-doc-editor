const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;
const WHITESPACE_SEQUENCE = /\s+/g;
const TRAILING_DOTS_AND_SPACES = /[. ]+$/g;

function normalizeExtension(extension: string): string {
  const trimmed = extension.trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.startsWith('.') ? trimmed.slice(1) : trimmed;
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
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  window.document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
