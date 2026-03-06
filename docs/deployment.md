# Deployment

## Produção recomendada

- Web: Vercel (projeto `apps/web`).
- API: Render **Web Service com Docker** (não usar runtime Node puro).
- Sync opcional: Supabase.

## API no Render (Docker)

Configuração recomendada:

- `Environment`: Docker
- `Dockerfile Path`: `apps/api/Dockerfile`
- `Health Check Path`: `/health`
- `Auto Deploy`: habilitado na branch de release

O Dockerfile da API já instala os motores necessários:

- `libreoffice`
- `poppler-utils`
- `tesseract-ocr`

## Web na Vercel

- `Root Directory`: `apps/web`
- `Install Command`: `npm install` (ou `pnpm install` com lock compatível)
- `Build Command`: `npm run build`
- `Output Directory`: `dist`

## Smoke checklist pós-deploy

1. `GET /health` na API retorna `200`.
2. `GET /api/capabilities` retorna disponibilidade dos motores.
3. Upload do PDF baseline no front em modo Editável conclui sem fallback local silencioso.
4. `POST /api/convert/pdf-to-docx` retorna DOCX binário não vazio.
5. DOCX exportado abre em Word/LibreOffice.

## Rollback

- API (Render): redeploy do último deploy estável.
- Web (Vercel): Promote do deployment anterior.

## Deploy local/intranet

Use Docker Compose para rodar web+api+sqlite em ambiente fechado:

- `cd infra`
- `docker compose up --build`
