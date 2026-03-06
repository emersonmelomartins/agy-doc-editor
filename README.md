# Docsi Monorepo

Monorepo com Turborepo + pnpm para editor de documentos com foco em compatibilidade Word-like, paginação A4 e conversão local de arquivos.

## Stack

- Monorepo: Turborepo + pnpm
- Frontend (`apps/web`): React 19, Vite, TanStack Router, Zustand, shadcn/ui, TailwindCSS, Axios, Kubb
- Backend (`apps/api`): Fastify, SQLite, Supabase Sync, OpenAPI
- Conversão local: LibreOffice, PDF.js, Tesseract

## Estrutura

- `apps/web` aplicação web
- `apps/api` API e motor de importação/conversão
- `packages/shared-types` tipos compartilhados
- `packages/tsconfig` config TypeScript compartilhada
- `packages/eslint-config` base ESLint
- `packages/ui` espaço para componentes reutilizáveis

## Comandos

- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm codegen`

## Variáveis de ambiente

### API

- `PORT` (default `3333`)
- `HOST` (default `0.0.0.0`)
- `SQLITE_PATH` (default `./docsi.db`)
- `SUPABASE_URL` (opcional)
- `SUPABASE_ANON_KEY` (opcional)

### Web

- `VITE_API_URL` (default `http://127.0.0.1:3333/api`)

## Conversão local sem terceiros

A aplicação não depende de SaaS de conversão. O backend executa os motores localmente.

- PDF -> DOCX (alta fidelidade): LibreOffice headless
- PDF -> texto editável: PDF.js
- OCR local quando necessário: Tesseract

Consulte `docs/conversion-engines.md` para instalação.
