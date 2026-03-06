# Conversion Engines (Self-Hosted)

## Visão geral

Motores usados localmente:

- LibreOffice (PDF/DOCX de alta fidelidade)
- PDF.js (extração de texto/estrutura)
- Tesseract (OCR local)

Nenhuma API de conversão de terceiros é necessária.

## Instalação

### macOS

- `brew install --cask libreoffice tesseract`

### Ubuntu/Debian

- `sudo apt-get update`
- `sudo apt-get install -y libreoffice tesseract-ocr`

### Alpine

- `apk add libreoffice tesseract-ocr`

## Como o backend usa

- Conversão PDF->DOCX: `soffice --headless --convert-to docx`
- Extração PDF editável: `pdfjs-dist`
- OCR fallback: `tesseract.js`

## Controle e segurança

- Versões travadas no lockfile e Dockerfile
- Execução dentro da sua infra
- Sem envio de arquivo para terceiros
