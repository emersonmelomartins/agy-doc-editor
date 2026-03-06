# Docsi API

Fastify API com arquitetura limpa para documentos, sincronização e conversão local.

## Stack

- Fastify
- SQLite (principal)
- Supabase (sync)
- LibreOffice + PDF.js + Tesseract

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm openapi`

## Variáveis de ambiente

- `PORT`
- `HOST`
- `SQLITE_PATH`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Conversão local

A conversão de PDF para DOCX usa `soffice --headless`. O binário deve existir no host/container.
