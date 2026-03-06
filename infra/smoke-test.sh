#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3333}"
PDF_FILE="${1:-$ROOT_DIR/tests/fixtures/pdf/executive-summary.pdf}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl nao encontrado. Instale curl para executar o smoke test."
  exit 1
fi

if ! command -v unzip >/dev/null 2>&1; then
  echo "unzip nao encontrado. Instale unzip para validar o DOCX."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node nao encontrado. Instale Node.js para executar as validacoes."
  exit 1
fi

if [[ ! -f "$PDF_FILE" ]]; then
  echo "PDF de fixture nao encontrado em: $PDF_FILE"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
DOCX_OUT="$TMP_DIR/converted.docx"
CAPABILITIES_OUT="$TMP_DIR/capabilities.json"
EDITABLE_OUT="$TMP_DIR/editable.json"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "[1/4] Health check da API..."
curl --silent --show-error --fail "$API_BASE_URL/health" >/dev/null

echo "[2/4] Capabilities..."
curl --silent --show-error --fail "$API_BASE_URL/api/capabilities" >"$CAPABILITIES_OUT"
node -e '
const fs = require("node:fs");
const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const data = body?.data;
if (!data || typeof data !== "object") {
  throw new Error("Resposta de /api/capabilities invalida.");
}
if (!data.pdfToDocxAvailable) {
  throw new Error("pdfToDocxAvailable=false. Conversao indisponivel.");
}
if (!data.ocrAvailable) {
  throw new Error("ocrAvailable=false. OCR indisponivel.");
}
if (!data.pdfRasterizationAvailable) {
  throw new Error("pdfRasterizationAvailable=false. Rasterizacao indisponivel.");
}
console.log(`Capabilities OK: libreOffice=${data.libreOfficeVersion ?? "n/a"} | tesseract=${data.tesseractVersion ?? "n/a"} | pdftoppm=${data.pdftoppmVersion ?? "n/a"}`);
' "$CAPABILITIES_OUT"

echo "[3/4] Conversao PDF -> DOCX..."
curl --silent --show-error --fail \
  -F "file=@${PDF_FILE};type=application/pdf" \
  "$API_BASE_URL/api/convert/pdf-to-docx" \
  -o "$DOCX_OUT"

DOCX_SIZE="$(wc -c <"$DOCX_OUT" | tr -d ' ')"
if [[ "$DOCX_SIZE" -lt 10000 ]]; then
  echo "DOCX gerado muito pequeno (${DOCX_SIZE} bytes)."
  exit 1
fi

DOCX_LISTING="$TMP_DIR/docx-listing.txt"
unzip -l "$DOCX_OUT" >"$DOCX_LISTING"

if ! grep -q "word/document.xml" "$DOCX_LISTING"; then
  echo "DOCX invalido: nao contem word/document.xml."
  exit 1
fi
echo "Conversao OK: ${DOCX_SIZE} bytes."

echo "[4/4] Importacao PDF editavel..."
curl --silent --show-error --fail \
  -F "file=@${PDF_FILE};type=application/pdf" \
  "$API_BASE_URL/api/import/pdf/editable" \
  >"$EDITABLE_OUT"

node -e '
const fs = require("node:fs");
const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const data = body?.data ?? {};
const text = String(data.text ?? "").replace(/\s+/g, " ").trim();
const score = Number(data?.qualityReport?.score ?? 0);
if (text.length < 200) {
  throw new Error(`Texto importado muito curto (${text.length} chars).`);
}
if (/^(01|02)(\s+(01|02))*$/.test(text)) {
  throw new Error("Texto importado parece degradado (apenas numeros de pagina).");
}
if (!["pdfjs", "ocr", "hybrid"].includes(data.source)) {
  throw new Error(`source invalido: ${data.source}`);
}
if (!(score > 0)) {
  throw new Error(`score invalido: ${score}`);
}
console.log(`Importacao OK: source=${data.source} | score=${score.toFixed(2)} | textChars=${text.length}`);
' "$EDITABLE_OUT"

echo "Smoke test finalizado com sucesso."
