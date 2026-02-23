import type { Document, SpreadsheetData } from '@/types';

export interface TextDocumentPreview {
  kind: 'text';
  lines: string[];
  blocks: Array<
    | { kind: 'heading'; text: string }
    | { kind: 'paragraph'; text: string }
    | { kind: 'image'; src: string }
  >;
}

export interface SpreadsheetDocumentPreview {
  kind: 'spreadsheet';
  headers: string[];
  rows: string[][];
}

export type DocumentPreview = TextDocumentPreview | SpreadsheetDocumentPreview;

type TipTapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
};

const EMPTY_TEXT_LINE = 'Documento vazio';
const EMPTY_SHEET_CELL = '—';

function normalizeLine(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact || EMPTY_TEXT_LINE;
}

function collectText(node: TipTapNode | undefined, chunks: string[]): void {
  if (!node) return;

  if (node.type === 'text' && typeof node.text === 'string') {
    chunks.push(node.text);
    return;
  }

  const blockTypes = new Set(['paragraph', 'heading', 'blockquote', 'codeBlock', 'listItem']);
  if (node.content?.length) {
    for (const child of node.content) {
      collectText(child, chunks);
    }
  }
  if (blockTypes.has(node.type ?? '')) {
    chunks.push('\n');
  }
}

function extractNodeText(node: TipTapNode | undefined): string {
  if (!node) return '';
  const chunks: string[] = [];
  collectText(node, chunks);
  return chunks.join('').replace(/\n{2,}/g, '\n').trim();
}

function toTextBlock(node: TipTapNode): TextDocumentPreview['blocks'][number] | null {
  if (node.type === 'text') {
    const text = normalizeLine(node.text ?? '');
    return { kind: 'paragraph', text };
  }

  if (node.type === 'image') {
    const src = typeof node.attrs?.src === 'string' ? node.attrs.src.trim() : '';
    if (!src) return null;
    return { kind: 'image', src };
  }

  if (node.type === 'heading') {
    const text = normalizeLine(extractNodeText(node));
    return { kind: 'heading', text };
  }

  const paragraphTypes = new Set(['paragraph', 'blockquote', 'codeBlock', 'listItem']);
  if (paragraphTypes.has(node.type ?? '')) {
    const text = normalizeLine(extractNodeText(node));
    return { kind: 'paragraph', text };
  }

  return null;
}

function collectPreviewBlocks(nodes: TipTapNode[] | undefined): TextDocumentPreview['blocks'] {
  const blocks: TextDocumentPreview['blocks'] = [];
  const pushBlock = (block: TextDocumentPreview['blocks'][number] | null) => {
    if (!block) return;
    if (block.kind !== 'image' && block.text === EMPTY_TEXT_LINE && blocks.length > 0) return;
    blocks.push(block);
  };

  for (const node of nodes ?? []) {
    if (!node) continue;

    if (node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'taskList') {
      for (const item of node.content ?? []) {
        const text = normalizeLine(extractNodeText(item));
        if (text !== EMPTY_TEXT_LINE) pushBlock({ kind: 'paragraph', text: `• ${text}` });
      }
      continue;
    }

    const block = toTextBlock(node);
    if (block) {
      pushBlock(block);
      continue;
    }

    if (node.content?.length) {
      for (const nested of collectPreviewBlocks(node.content)) {
        pushBlock(nested);
      }
    }
  }

  return blocks.slice(0, 6);
}

function getTextPreview(content: string): TextDocumentPreview {
  try {
    const parsed = JSON.parse(content) as TipTapNode;
    const blocks = collectPreviewBlocks(parsed.content);
    const textLines = blocks
      .filter((block): block is Extract<TextDocumentPreview['blocks'][number], { text: string }> => block.kind !== 'image')
      .map((block) => normalizeLine(block.text))
      .slice(0, 3);

    return {
      kind: 'text',
      lines: textLines.length ? textLines : [EMPTY_TEXT_LINE],
      blocks: blocks.length ? blocks : [{ kind: 'paragraph', text: EMPTY_TEXT_LINE }],
    };
  } catch {
    return { kind: 'text', lines: [EMPTY_TEXT_LINE], blocks: [{ kind: 'paragraph', text: EMPTY_TEXT_LINE }] };
  }
}

function getSpreadsheetPreview(content: string): SpreadsheetDocumentPreview {
  try {
    const parsed = JSON.parse(content) as SpreadsheetData;
    const headers = (parsed.colHeaders ?? []).slice(0, 3).map((header) => String(header || EMPTY_SHEET_CELL));
    const rows = (parsed.data ?? [])
      .slice(0, 3)
      .map((row) => (row ?? []).slice(0, 3).map((cell) => String(cell ?? EMPTY_SHEET_CELL)));

    return {
      kind: 'spreadsheet',
      headers: headers.length ? headers : ['A', 'B', 'C'],
      rows: rows.length ? rows : [[EMPTY_SHEET_CELL, EMPTY_SHEET_CELL, EMPTY_SHEET_CELL]],
    };
  } catch {
    return {
      kind: 'spreadsheet',
      headers: ['A', 'B', 'C'],
      rows: [[EMPTY_SHEET_CELL, EMPTY_SHEET_CELL, EMPTY_SHEET_CELL]],
    };
  }
}

export function buildDocumentPreview(doc: Pick<Document, 'type' | 'content'>): DocumentPreview {
  if (doc.type === 'spreadsheet') {
    return getSpreadsheetPreview(doc.content);
  }
  return getTextPreview(doc.content);
}
