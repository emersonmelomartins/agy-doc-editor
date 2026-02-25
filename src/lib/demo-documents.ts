import type { DocumentType } from '../types/index.ts';

type SeedDocument = {
  name: string;
  type: DocumentType;
  content: string;
  templateId?: string;
};

function buildLongParagraph(index: number) {
  return {
    type: 'paragraph',
    attrs: { textAlign: 'justify' },
    content: [
      {
        type: 'text',
        text: `Paragrafo ${index + 1}: Este documento de demonstracao foi criado para validar paginação A4, exportação DOCX/PDF e comportamento de edição. O texto e propositalmente mais longo para ocupar varias linhas e forcar a distribuicao entre folhas, mantendo margens superiores e inferiores consistentes.`,
      },
    ],
  };
}

function buildIllustrationDataUri(title: string, subtitle: string, start: string, end: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="700" fill="url(#bg)" />
      <circle cx="190" cy="170" r="120" fill="rgba(255,255,255,0.18)" />
      <circle cx="1020" cy="520" r="150" fill="rgba(255,255,255,0.12)" />
      <rect x="80" y="500" width="1040" height="110" rx="18" fill="rgba(9,16,25,0.26)" />
      <text x="100" y="220" font-family="Manrope,Arial,sans-serif" font-size="76" font-weight="800" fill="#F8FAFC">${title}</text>
      <text x="100" y="280" font-family="Manrope,Arial,sans-serif" font-size="36" font-weight="600" fill="#D6E4F0">${subtitle}</text>
      <text x="115" y="560" font-family="Manrope,Arial,sans-serif" font-size="28" font-weight="600" fill="#F8FAFC">Manual de Demonstracao • Paginacao e imagens para teste</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildManualImageNode(index: number, width: number = 560) {
  const palettes = [
    ['#0ea5a4', '#0f766e'],
    ['#0891b2', '#1d4ed8'],
    ['#f97316', '#ea580c'],
    ['#ec4899', '#be185d'],
    ['#14b8a6', '#0f766e'],
    ['#6366f1', '#4338ca'],
    ['#22c55e', '#166534'],
    ['#f59e0b', '#b45309'],
  ] as const;
  const palette = palettes[index % palettes.length];
  return {
    type: 'image',
    attrs: {
      src: buildIllustrationDataUri(
        `Etapa ${index + 1}`,
        'Imagem para teste de exportacao PDF/DOCX',
        palette[0],
        palette[1]
      ),
      width,
      height: 300,
    },
  };
}

const manualCompletoContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1, textAlign: 'center' },
      content: [{ type: 'text', text: 'Manual de Demonstracao — Todas as Funcionalidades' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'center' },
      content: [
        { type: 'text', marks: [{ type: 'italic' }], text: 'Use este documento para testar edicao, paginacao A4 e exportacao PDF/DOCX com imagens.' },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '1. Formatação de texto' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', marks: [{ type: 'bold' }], text: 'Negrito, ' },
        { type: 'text', marks: [{ type: 'italic' }], text: 'italico, ' },
        { type: 'text', marks: [{ type: 'underline' }], text: 'sublinhado, ' },
        { type: 'text', marks: [{ type: 'strike' }], text: 'tachado, ' },
        { type: 'text', marks: [{ type: 'superscript' }], text: 'sobrescrito, ' },
        { type: 'text', marks: [{ type: 'subscript' }], text: 'subscrito, ' },
        { type: 'text', marks: [{ type: 'textStyle', attrs: { color: '#d63f3f' } }], text: 'cor, ' },
        { type: 'text', marks: [{ type: 'highlight', attrs: { color: '#fff29a' } }], text: 'realce e ' },
        { type: 'text', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }], text: 'link.' },
      ],
    },
    { type: 'horizontalRule' },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '2. Listas e tarefas' }],
    },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item com marcador 1' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item com marcador 2' }] }] },
      ],
    },
    {
      type: 'orderedList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Passo 1 numerado' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Passo 2 numerado' }] }] },
      ],
    },
    {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tarefa concluida' }] }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tarefa pendente' }] }] },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '3. Citacao e codigo' }],
    },
    {
      type: 'blockquote',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Uma citacao para mostrar recuo e destaque no editor e na exportacao.' }] },
      ],
    },
    {
      type: 'codeBlock',
      content: [
        { type: 'text', text: 'function soma(a, b) {\n  return a + b;\n}\nconsole.log(soma(2, 3));' },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '4. Imagens (teste de exportacao PDF/DOCX)' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'center' },
      content: [{ type: 'text', text: 'Imagem inline (PNG):' }],
    },
    buildManualImageNode(0, 520),
    buildManualImageNode(1, 620),
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '5. Tabela' }],
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Coluna A',  }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Coluna B' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Coluna C' }] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Linha 1 A' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Linha 1 B' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Linha 1 C' }] }] },
          ],
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '6. Paginacao (paragrafos longos)' }],
    },
    ...Array.from({ length: 28 }, (_, i) => buildLongParagraph(i)),
    buildManualImageNode(2, 460),
    {
      type: 'paragraph',
      attrs: { textAlign: 'justify' },
      content: [{ type: 'text', text: 'Imagem acima no meio do conteudo para validar que a paginacao e a exportacao mantem layout e imagens em multiplas folhas.' }],
    },
    ...Array.from({ length: 7 }, (_, i) => buildLongParagraph(i + 28)),
    {
      type: 'paragraph',
      attrs: { textAlign: 'right' },
      content: [{ type: 'text', text: 'Fim do manual de demonstracao.' }],
    },
  ],
};

/** Returns the demo manual content as JSON string for use as a creation template. */
export function getDemoManualContent(): string {
  return JSON.stringify(manualCompletoContent);
}

/** Empty: demo documents are no longer auto-seeded; use the template "Manual de Demonstração" instead. */
export const DEMO_DOCUMENTS: SeedDocument[] = [];
