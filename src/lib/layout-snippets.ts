import type { LayoutSnippetContent } from '@/types';

/** Default cover: one page with space for logo + title + subtitle */
export const DEFAULT_COVER: LayoutSnippetContent = JSON.stringify({
  type: 'doc',
  content: [
    { type: 'paragraph', content: [] },
    { type: 'paragraph', content: [] },
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Título do Documento' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', marks: [{ type: 'italic' }], text: 'Subtítulo ou descrição' }],
    },
    { type: 'paragraph', content: [] },
  ],
});

/** Default header: single line (e.g. document title or "Confidencial") */
export const DEFAULT_HEADER: LayoutSnippetContent = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Cabeçalho' }],
    },
  ],
});

/** Default footer: simple text (placeholder for "Page X of Y" can be added later) */
export const DEFAULT_FOOTER: LayoutSnippetContent = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Rodapé' }],
    },
  ],
});

export const DEFAULT_LAYOUT_SNIPPETS = {
  cover: DEFAULT_COVER,
  header: DEFAULT_HEADER,
  footer: DEFAULT_FOOTER,
} as const;
