# Arquitetura - Docora Studio

Este documento descreve a arquitetura atual da aplicação e como evoluir o projeto com baixo acoplamento.

## Objetivos de Arquitetura

- Código legível e modular.
- Fácil manutenção e evolução.
- Separação clara entre UI, regras de negócio e infraestrutura.
- Alta testabilidade.

## Stack e Responsabilidades

- `React + TanStack Router`: renderização e navegação.
- `Zustand`: estado global e orquestração de documentos/tema.
- `Tiptap`: editor de texto rico.
- `src/services`: fluxos de caso de uso da aplicação.
- `src/features`: regras de negócio puras.
- `src/lib`: infraestrutura (storage, export/import, paginação, utilitários).

## Mapa de Camadas

1. `pages/` e `components/`
- Interface e interação com usuário.
- Sem regra de negócio pesada.

2. `store/`
- Estado global (`documents-store`, `theme-store`).
- Chama serviços para persistência/exportação.

3. `services/`
- Casos de uso (`documents-service`, `export-service`).
- Coordena domínio + infraestrutura.

4. `features/`
- Regras puras de documentos e filtros.
- Fácil de testar sem React.

5. `lib/`
- Adapters de IO (`storage`, `import-documents`, `export-*`).
- Lógica de paginação (`pagination.ts`) e conversão de conteúdo.

## Estrutura de Diretórios

```text
src/
  components/
    editor/
      text-editor-toolbar.tsx
      toolbar-icon-button.tsx
    ui/
      button.tsx
  config/
    branding.ts
    theme.ts
  features/
    documents/model.ts
  lib/
    storage.ts
    pagination.ts
    export-docx.ts
    export-pdf.ts
    export-xlsx.ts
    import-documents.ts
    file-download.ts
  pages/
    home-page.tsx
    editor-page.tsx
  services/
    documents-repository.ts
    documents-service.ts
    export-service.ts
  store/
    documents-store.ts
    theme-store.ts
  router.tsx
  main.tsx
tests/
```

## Persistência e Repositório

- Contrato: `src/services/documents-repository.ts`
- Implementação padrão: `LocalStorageDocumentsRepository`
- Consumo: `documents-service` + stores

Esse desenho permite trocar para backend HTTP no futuro sem quebrar as páginas.

## Paginação de Documento A4

A paginação visual do editor é baseada em regras de folha:

- Altura A4 fixa por página renderizada.
- Margens superiores/inferiores preservadas.
- Quebra automática quando o conteúdo excede a área útil.
- Não gerar páginas finais vazias sem conteúdo.

A lógica fica isolada em `src/lib/pagination.ts` e testes dedicados em `tests/pagination.test.ts`.

## Exportação

- `DOCX`: `src/lib/export-docx.ts`
- `PDF`: `src/lib/export-pdf.ts`
- `XLSX`: `src/lib/export-xlsx.ts`
- Nome/normalização de arquivo: `src/lib/file-download.ts`

Orquestração única: `src/services/export-service.ts`.

## Estratégia de Testes

- Runner nativo do Node (`node --test`)
- Cobertura com `c8 --100`
- Foco em testes de domínio e infraestrutura pura (`src/**/*.ts`)

Principais suítes:

- `tests/pagination.test.ts`
- `tests/import-documents.test.ts`
- `tests/documents-service.test.ts`
- `tests/file-download.test.ts`
- `tests/spreadsheet.test.ts`

## Extensibilidade

Para adicionar funcionalidades:

1. Criar regra nova em `features/` ou `lib/`.
2. Expor caso de uso em `services/`.
3. Conectar ao `store/`.
4. Renderizar na `page`/`component`.
5. Adicionar testes na camada afetada.

Esse fluxo mantém o projeto escalável e previsível.
