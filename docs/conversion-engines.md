# Conversion Engines (Self-Hosted)

## Visão geral

O backend usa três motores locais para PDF:

- `PDF.js`: extração de texto por página.
- `Tesseract` + `pdftoppm` (Poppler): OCR por página quando a extração do PDF.js é fraca.
- `DOCX engine`:
  - tenta `LibreOffice` (`soffice`) primeiro;
  - se não houver filtro viável, faz fallback para DOCX por imagens (render de páginas via Poppler + geração DOCX local).

Nenhum arquivo é enviado para serviço de terceiros.

## Dependências por ambiente

### macOS

- `brew install --cask libreoffice`
- `brew install poppler tesseract`

### Ubuntu/Debian

- `sudo apt-get update`
- `sudo apt-get install -y libreoffice poppler-utils tesseract-ocr`

### Alpine

- `apk add libreoffice poppler-utils tesseract-ocr`

## Endpoints e comportamento

- `GET /api/capabilities`
  - retorna disponibilidade dos motores (`pdfToDocxAvailable`, `ocrAvailable`, `pdfRasterizationAvailable`) e versões detectadas.
- `POST /api/convert/pdf-to-docx`
  - retorna binário DOCX;
  - erros estruturados (`PDF_CONVERTER_NOT_AVAILABLE`, `PDF_TO_DOCX_TIMEOUT`, `PDF_TO_DOCX_FAILED`).
- `POST /api/import/pdf/editable`
  - retorna `text`, `source` (`pdfjs|ocr|hybrid`) e `qualityReport` por página.

## Validação rápida no host

- `soffice --version`
- `pdftoppm -v`
- `tesseract --version`
- `curl http://127.0.0.1:3333/api/capabilities`

## Segurança e operação

- Dependências versionadas em lockfile e Dockerfile.
- Conversão e OCR executados apenas na infraestrutura do projeto.
