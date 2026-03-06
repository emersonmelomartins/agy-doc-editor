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

## Endpoints de conversão/importação

- `GET /health`
- `GET /api/capabilities`
- `POST /api/import/pdf/editable`
- `POST /api/convert/pdf-to-docx`
- `POST /api/ocr/image`

## Contratos principais

### `GET /api/capabilities`

Retorna:

- `pdfToDocxAvailable`
- `ocrAvailable`
- `pdfRasterizationAvailable`
- versões detectadas (`libreOfficeVersion`, `tesseractVersion`, `pdftoppmVersion`)

### `POST /api/import/pdf/editable`

Retorna:

- `data.text`
- `data.source` (`pdfjs | ocr | hybrid`)
- `data.qualityReport.score`
- `data.qualityReport.pages[]` com `page`, `mode`, `confidence`
- `data.qualityReport.warnings[]`

### `POST /api/convert/pdf-to-docx`

Retorna binário DOCX com:

- `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `Content-Disposition: attachment; filename="<name>.docx"`

Erros estruturados:

- `PDF_CONVERTER_NOT_AVAILABLE` (`503`)
- `PDF_TO_DOCX_TIMEOUT` (`504`)
- `PDF_TO_DOCX_FAILED` (`500`)

## Motores usados

- PDF.js para extração de texto
- Tesseract + Poppler (`pdftoppm`) para OCR/fallback
- LibreOffice quando aplicável
