# Deployment

## Free tier

- Web: Vercel ou Netlify (free)
- API: Render (free)
- Sync/Auth opcional: Supabase (free)

## Limites esperados

- Cold start no Render
- Quotas de storage e requests no Supabase
- Limites de build/deploy na hospedagem web

## Deploy local/intranet

Use Docker Compose para rodar web+api+sqlite em ambiente fechado.

- `cd infra`
- `docker compose up --build`

## Checklist

1. Setar variáveis de ambiente
2. Provisionar tabela `documents` no Supabase se sync estiver ativo
3. Instalar LibreOffice/Tesseract no ambiente da API
4. Rodar `pnpm build` e `pnpm start`
