export type DocumentType = 'text' | 'spreadsheet';

/** Content for a layout snippet (capa, header, footer): same TipTap JSON format as document content */
export type LayoutSnippetContent = string;

/** Kind of layout component for filtering and selects */
export type LayoutComponentKind = 'cover' | 'header' | 'footer';

/** User-created layout component (from Components screen) */
export interface LayoutComponent {
  id: string;
  name: string;
  kind: LayoutComponentKind;
  content: string; // JSON stringified TipTap doc
  createdAt: string;
  updatedAt: string;
}

/** Document layout: can reference a component by ID or use inline content (default snippet) */
export interface DocumentLayout {
  coverComponentId?: string | null;
  cover?: LayoutSnippetContent | null;
  headerComponentId?: string | null;
  header?: LayoutSnippetContent | null;
  footerComponentId?: string | null;
  footer?: LayoutSnippetContent | null;
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  content: string; // JSON stringified TipTap content OR spreadsheet data
  createdAt: string;
  updatedAt: string;
  templateId?: string;
  layout?: DocumentLayout | null;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  type: DocumentType;
  content: string;
  thumbnail: string; // emoji or icon name
}

/** One merged region (inclusive). Value lives in (startRow, startCol). */
export interface SpreadsheetMerge {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface SpreadsheetData {
  data: (string | number | null)[][];
  colHeaders: string[];
  rowCount: number;
  colCount: number;
  /** Column widths in px (default 100). */
  colWidths?: number[];
  /** Row heights in px (default 28). */
  rowHeights?: number[];
  /** Merged cell regions. */
  merges?: SpreadsheetMerge[];
  /** Cell background color: key "row,col", value CSS color (e.g. hex). */
  cellFills?: Record<string, string>;
}
