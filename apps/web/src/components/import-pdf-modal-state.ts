export type ImportModalCapabilities = {
  pdfToDocxAvailable: boolean;
  ocrAvailable: boolean;
  pdfRasterizationAvailable: boolean;
  libreOfficeVersion?: string;
  tesseractVersion?: string;
  pdftoppmVersion?: string;
};

export function getImportPdfOptionsState(params: {
  isImporting: boolean;
  apiStatus: 'checking' | 'online' | 'offline';
  capabilities: ImportModalCapabilities | null;
}) {
  const isBackendOffline = params.apiStatus === 'offline';
  const editableAvailable = params.apiStatus === 'online' && Boolean(params.capabilities?.pdfToDocxAvailable);
  return {
    isBackendOffline,
    editableAvailable,
    disableFidelity: params.isImporting || isBackendOffline,
    disableEditable: params.isImporting || !editableAvailable,
  };
}
