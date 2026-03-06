# Docsi Web

Frontend React 19 + Vite com editor paginado e integração com API Fastify.

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm codegen`

## API client

Cliente gerado via Kubb em `src/lib/api-client/generated.ts`.

## Fluxo de importação PDF (backend-first)

Modo **Editável**:

1. valida saúde da API (`/health`);
2. consulta capacidades (`/api/capabilities`);
3. converte PDF para DOCX (`/api/convert/pdf-to-docx`);
4. importa DOCX no editor;
5. reforça texto via `/api/import/pdf/editable` quando o conteúdo importado estiver fraco.

Sem backend online/capaz, o fluxo editável fica bloqueado com erro explícito (sem fallback local silencioso).

## Variáveis de ambiente

- `VITE_API_URL` (ex.: `https://sua-api.onrender.com/api`)
