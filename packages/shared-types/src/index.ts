export type DocumentType = 'text' | 'spreadsheet';

export type ImportQualityPage = {
  page: number;
  mode: 'pdfjs' | 'ocr' | 'hybrid';
  confidence: number;
};

export type ImportQualityReport = {
  score: number;
  pages: ImportQualityPage[];
  warnings: string[];
};

export type ImportSource = 'pdfjs' | 'ocr' | 'hybrid';

export type DocumentLayout = {
  header?: string | null;
  footer?: string | null;
  cover?: string | null;
  hideHeaderOnCover?: boolean;
  hideFooterOnCover?: boolean;
};

export type StoredDocument = {
  id: string;
  name: string;
  type: DocumentType;
  content: string;
  layout?: DocumentLayout | null;
  createdAt: string;
  updatedAt: string;
};
