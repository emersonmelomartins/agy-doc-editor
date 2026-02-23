export type TextDocumentContent = {
  type: 'doc';
  content: Array<Record<string, unknown>>;
};

const EMPTY_TEXT_DOCUMENT: TextDocumentContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [] }],
};

export function parseTextContent(content: string): TextDocumentContent {
  if (!content) return structuredClone(EMPTY_TEXT_DOCUMENT);

  try {
    const parsed = JSON.parse(content);
    const isValid = parsed && parsed.type === 'doc' && Array.isArray(parsed.content);

    return isValid ? parsed as TextDocumentContent : structuredClone(EMPTY_TEXT_DOCUMENT);
  } catch {
    return structuredClone(EMPTY_TEXT_DOCUMENT);
  }
}
