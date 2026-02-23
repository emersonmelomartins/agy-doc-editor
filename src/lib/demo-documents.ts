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
        text: `Paragrafo ${index + 1}: Este documento de demonstracao foi criado para validar paginação A4, exportação DOCX e comportamento de edição. O texto e propositalmente mais longo para ocupar varias linhas e forcar a distribuicao entre folhas, mantendo margens superiores e inferiores consistentes.`,
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
      <text x="115" y="560" font-family="Manrope,Arial,sans-serif" font-size="28" font-weight="600" fill="#F8FAFC">Manual Visual • Fluxo operacional e checkpoints</text>
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
        'Painel ilustrativo para demonstracao de manual',
        palette[0],
        palette[1]
      ),
      width,
      height: 300,
    },
  };
}

const demoTextContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1, textAlign: 'center' },
      content: [{ type: 'text', text: 'Documento de Demonstracao Completa' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'center' },
      content: [
        { type: 'text', marks: [{ type: 'italic' }], text: 'Exemplo pronto com recursos de editor e exportacao' },
      ],
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
        { type: 'text', marks: [{ type: 'textStyle', attrs: { color: '#d63f3f' } }], text: 'cor personalizada, ' },
        { type: 'text', marks: [{ type: 'highlight', attrs: { color: '#fff29a' } }], text: 'realce e ' },
        {
          type: 'text',
          marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
          text: 'link.',
        },
      ],
    },
    {
      type: 'horizontalRule',
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Listas e tarefas' }],
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
      content: [{ type: 'text', text: 'Citação, código, imagem e tabela' }],
    },
    {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Uma citação para mostrar recuo e destaque de conteúdo no editor.' },
          ],
        },
      ],
    },
    {
      type: 'codeBlock',
      content: [
        {
          type: 'text',
          text: 'function soma(a, b) {\n  return a + b;\n}\nconsole.log(soma(2, 3));',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'center' },
      content: [{ type: 'text', text: 'Imagem inline:' }],
    },
    {
      type: 'image',
      attrs: {
        src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9VE3SkAAAAAASUVORK5CYII=',
        width: 260,
        height: 120,
      },
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Coluna A' }] }] },
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
    ...Array.from({ length: 26 }, (_, i) => buildLongParagraph(i)),
    {
      type: 'paragraph',
      attrs: { textAlign: 'right' },
      content: [{ type: 'text', text: 'Fim do documento de exemplo.' }],
    },
  ],
};

const qaChecklistTextContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'QA - Checklist Completo do Editor' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Use este documento para validar edicao, paginação manual por overflow e exportacao fiel (PDF/DOCX).',
        },
      ],
    },
    {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Negrito, itálico, sublinhado e tachado' }] }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Alinhamentos: esquerda, centro, direita e justificado' }] }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Lista com marcadores, numerada e tarefas' }] }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Insercao de imagem, tabela e bloco de código' }] }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Exportacao para PDF e DOCX mantendo layout de folhas A4' }] }] },
      ],
    },
    ...Array.from({ length: 38 }, (_, i) => buildLongParagraph(i + 1)),
  ],
};

const demoSpreadsheetContent = {
  data: [
    ['Produto', 'Categoria', 'Qtd', 'Preco Unit', 'Subtotal', 'Status'],
    ['Notebook', 'Eletronicos', 4, 4200, '=C2*D2', 'OK'],
    ['Monitor', 'Eletronicos', 6, 1300, '=C3*D3', 'OK'],
    ['Teclado', 'Acessorios', 10, 240, '=C4*D4', 'OK'],
    ['Mouse', 'Acessorios', 10, 180, '=C5*D5', 'OK'],
    ['', '', '', '', '', ''],
    ['Total Geral', '', '', '', '=SUM(E2:E5)', ''],
    ['Media', '', '', '', '=(E2+E3+E4+E5)/4', ''],
    ['Meta', '', '', '', 20000, ''],
    ['Atingiu?', '', '', '', '=E7-E9', ''],
  ],
  colHeaders: ['A', 'B', 'C', 'D', 'E', 'F'],
  rowCount: 30,
  colCount: 6,
};

const richImagesManualContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1, textAlign: 'center' },
      content: [{ type: 'text', text: 'Manual Visual — Estacao de Embalagem X1' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'center' },
      content: [{ type: 'text', marks: [{ type: 'italic' }], text: 'Guia completo com imagens, checklists e operacao passo a passo' }],
    },
    {
      type: 'image',
      attrs: {
        src: buildIllustrationDataUri('Painel Principal', 'Visao geral da interface e botoes principais', '#0f766e', '#164e63'),
        width: 640,
        height: 330,
      },
    },
    {
      type: 'horizontalRule',
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '1. Preparacao inicial' }],
    },
    {
      type: 'orderedList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Conferir energia, conexao de rede e sensores ativos.' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Selecionar perfil de operador e carregar receita de producao.' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Validar temperatura e calibracao de alimentacao.' }] }] },
      ],
    },
    buildManualImageNode(0, 520),
    {
      type: 'paragraph',
      attrs: { textAlign: 'justify' },
      content: [{ type: 'text', text: 'A imagem acima representa o painel de inicio com indicadores de status. Use os blocos coloridos para identificar eventuais alertas antes de iniciar a linha.' }],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '2. Fluxo operacional' }],
    },
    buildManualImageNode(1, 620),
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Monitoramento em tempo real de fila e throughput.' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ajuste fino de velocidade sem interromper lote.' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Log de anomalias com timestamp para auditoria.' }] }] },
      ],
    },
    buildManualImageNode(2, 460),
    buildManualImageNode(3, 560),
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Parametro' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Valor alvo' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Limite critico' }] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Temperatura selagem' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '182 C' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '190 C' }] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Velocidade esteira' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '1.8 m/s' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '2.2 m/s' }] }] },
          ],
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '3. Checklist de encerramento' }],
    },
    {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Exportar relatorio do turno em PDF.' }] }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Salvar backup da configuracao atual.' }] }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Executar limpeza e validar sensores pos-operacao.' }] }] },
      ],
    },
    buildManualImageNode(4, 600),
    buildManualImageNode(5, 500),
    {
      type: 'codeBlock',
      content: [
        {
          type: 'text',
          text: 'const status = await machine.checkHealth();\nif (!status.ok) {\n  notifyTeam(status.alerts);\n  pauseLine();\n}',
        },
      ],
    },
    {
      type: 'blockquote',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Dica: sempre registrar foto da tela de alarmes antes de reiniciar qualquer modulo.' }] }],
    },
    buildManualImageNode(6, 540),
    buildManualImageNode(7, 580),
    ...Array.from({ length: 12 }, (_, i) => buildLongParagraph(i + 40)),
  ],
};

export const DEMO_DOCUMENTS: SeedDocument[] = [
  {
    name: 'Exemplo Completo - Editor de Texto (2+ paginas)',
    type: 'text',
    content: JSON.stringify(demoTextContent),
    templateId: 'demo-full-text',
  },
  {
    name: 'Exemplo Completo - Planilha com Formulas',
    type: 'spreadsheet',
    content: JSON.stringify(demoSpreadsheetContent),
    templateId: 'demo-full-sheet',
  },
  {
    name: 'QA - Checklist de Funcionalidades (2+ paginas)',
    type: 'text',
    content: JSON.stringify(qaChecklistTextContent),
    templateId: 'demo-qa-checklist',
  },
  {
    name: 'Manual Visual - Estacao X1 (muitas imagens)',
    type: 'text',
    content: JSON.stringify(richImagesManualContent),
    templateId: 'demo-rich-images-manual',
  },
];
