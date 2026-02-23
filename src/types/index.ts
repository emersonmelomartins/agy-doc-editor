export type DocumentType = 'text' | 'spreadsheet';

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  content: string; // JSON stringified TipTap content OR spreadsheet data
  createdAt: string;
  updatedAt: string;
  templateId?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  type: DocumentType;
  content: string;
  thumbnail: string; // emoji or icon name
}

export interface SpreadsheetData {
  data: (string | number | null)[][];
  colHeaders: string[];
  rowCount: number;
  colCount: number;
}
