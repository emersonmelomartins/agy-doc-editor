import { Template } from '@/types';

const EMPTY_SHEET = JSON.stringify({
  data: Array.from({ length: 50 }, () => Array(26).fill(null)),
  colHeaders: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
  rowCount: 50,
  colCount: 26,
});

const EMPTY_DOC = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph', content: [] }],
});

export const TEMPLATES: Template[] = [
  {
    id: 'tpl-resume',
    name: 'Currículo Profissional',
    description: 'Modelo moderno de currículo',
    type: 'text',
    thumbnail: '📄',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Seu Nome Completo' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: 'email@exemplo.com | (00) 00000-0000 | LinkedIn: linkedin.com/in/seuperfil' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Resumo Profissional' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Profissional com X anos de experiência em [área]. Habilidades em [competências principais]. Comprometido com resultados e crescimento contínuo.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Experiência Profissional' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Cargo — Empresa (2020 – Atual)' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Responsabilidade ou conquista principal' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Outra responsabilidade importante' }] }] },
        ]},
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Formação Acadêmica' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Bacharelado em [Curso]' }, { type: 'text', text: ' — Universidade (Ano)' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Habilidades' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Habilidade 1, Habilidade 2, Habilidade 3' }] }] },
        ]},
      ],
    }),
  },
  {
    id: 'tpl-letter',
    name: 'Carta Formal',
    description: 'Modelo de carta profissional',
    type: 'text',
    thumbnail: '✉️',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '[Cidade], [data]' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'A/C: [Nome do Destinatário]' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '[Cargo] — [Empresa/Instituição]' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Prezado(a) Sr.(a) [Sobrenome],' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Por meio desta, venho respeitosamente [objetivo da carta — ex: solicitar, agradecer, informar]. [Contexto e detalhes relevantes sobre o assunto.]' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: '[Segundo parágrafo com mais detalhes ou justificativa.]' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Desde já agradeço a atenção e coloco-me à disposição para esclarecimentos.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Atenciosamente,' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '[Seu Nome Completo]' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '[Cargo / Função]' }] },
      ],
    }),
  },
  {
    id: 'tpl-report',
    name: 'Relatório de Projeto',
    description: 'Estrutura completa para relatórios',
    type: 'text',
    thumbnail: '📊',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Relatório de Projeto' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: 'Data: [data] | Responsável: [nome]' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Objetivo' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Descreva o objetivo principal do projeto.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2. Escopo' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'O que está incluído e o que está fora do escopo deste projeto.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '3. Resultados Obtidos' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Resultado 1' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Resultado 2' }] }] },
        ]},
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '4. Próximos Passos' }] },
        { type: 'orderedList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ação 1 — Responsável — Prazo' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ação 2 — Responsável — Prazo' }] }] },
        ]},
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '5. Conclusão' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Síntese dos resultados e considerações finais.' }] },
      ],
    }),
  },
  {
    id: 'tpl-minutes',
    name: 'Ata de Reunião',
    description: 'Registro formal de reuniões',
    type: 'text',
    thumbnail: '📝',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Ata de Reunião' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Data: ' }, { type: 'text', text: '[data]' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Local: ' }, { type: 'text', text: '[local ou online]' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Participantes: ' }, { type: 'text', text: '[nomes]' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Pauta' }] },
        { type: 'orderedList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ponto de pauta 1' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ponto de pauta 2' }] }] },
        ]},
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Discussões e Decisões' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Tópico 1:' }, { type: 'text', text: ' [Resumo da discussão e decisão tomada.]' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Ações Definidas' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '[Ação] — [Responsável] — [Prazo]' }] }] },
        ]},
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Próxima reunião: [data e hora]' }] },
      ],
    }),
  },
  {
    id: 'tpl-budget',
    name: 'Planilha de Orçamento',
    description: 'Controle de receitas e despesas',
    type: 'spreadsheet',
    thumbnail: '💰',
    content: JSON.stringify({
      data: [
        ['ORÇAMENTO MENSAL', '', '', '', ''],
        ['', '', '', '', ''],
        ['RECEITAS', '', 'Valor (R$)', '', ''],
        ['Salário', '', 0, '', ''],
        ['Outras Receitas', '', 0, '', ''],
        ['TOTAL RECEITAS', '', '=SUM(C4:C5)', '', ''],
        ['', '', '', '', ''],
        ['DESPESAS', '', 'Valor (R$)', '', ''],
        ['Aluguel/Financiamento', '', 0, '', ''],
        ['Alimentação', '', 0, '', ''],
        ['Transporte', '', 0, '', ''],
        ['Saúde', '', 0, '', ''],
        ['Educação', '', 0, '', ''],
        ['Lazer', '', 0, '', ''],
        ['Outros', '', 0, '', ''],
        ['TOTAL DESPESAS', '', '=SUM(C9:C15)', '', ''],
        ['', '', '', '', ''],
        ['SALDO', '', '=C6-C16', '', ''],
      ],
      colHeaders: ['A','B','C','D','E'],
      rowCount: 20,
      colCount: 5,
    }),
  },
  {
    id: 'tpl-inventory',
    name: 'Controle de Estoque',
    description: 'Gestão de produtos e quantidades',
    type: 'spreadsheet',
    thumbnail: '📦',
    content: JSON.stringify({
      data: [
        ['Código', 'Produto', 'Categoria', 'Quantidade', 'Unidade', 'Preço Unit. (R$)', 'Valor Total (R$)', 'Status'],
        ['001', 'Produto A', 'Categoria 1', 10, 'un', 25.00, '=D2*F2', 'OK'],
        ['002', 'Produto B', 'Categoria 2', 5, 'kg', 15.50, '=D3*F3', 'OK'],
        ['003', 'Produto C', 'Categoria 1', 0, 'un', 8.00, '=D4*F4', 'Esgotado'],
        ['004', 'Produto D', 'Categoria 3', 3, 'un', 120.00, '=D5*F5', 'Baixo'],
      ],
      colHeaders: ['A','B','C','D','E','F','G','H'],
      rowCount: 30,
      colCount: 8,
    }),
  },
];

export const EMPTY_TEMPLATES = {
  text: EMPTY_DOC,
  spreadsheet: EMPTY_SHEET,
};
