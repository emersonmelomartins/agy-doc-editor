import { parseTextContent } from '@/utils/text-content';
import type { TextDocumentContent } from '@/utils/text-content';

/**
 * Extracts the content array (child nodes) from a TipTap doc JSON string.
 * Returns empty array if invalid or empty.
 */
function getContentNodes(jsonString: string | null | undefined): Array<Record<string, unknown>> {
  if (!jsonString) return [];
  try {
    const parsed = parseTextContent(jsonString) as TextDocumentContent;
    return Array.isArray(parsed.content) ? [...parsed.content] : [];
  } catch {
    return [];
  }
}

/**
 * Merges layout snippets into the document content by inserting them as editable blocks.
 * Order: [cover nodes] + [header nodes] + [existing body] + [footer nodes].
 * The result is a single TipTap doc that the user can edit; pagination works normally.
 */
export function mergeLayoutIntoContent(
  currentContent: string,
  coverContent: string | null | undefined,
  headerContent: string | null | undefined,
  footerContent: string | null | undefined
): string {
  const body = parseTextContent(currentContent) as TextDocumentContent;
  const bodyNodes = Array.isArray(body.content) ? body.content : [{ type: 'paragraph', content: [] }];

  const coverNodes = getContentNodes(coverContent);
  const headerNodes = getContentNodes(headerContent);
  const footerNodes = getContentNodes(footerContent);

  const merged = [
    ...coverNodes,
    ...headerNodes,
    ...bodyNodes,
    ...footerNodes,
  ];

  if (merged.length === 0) {
    merged.push({ type: 'paragraph', content: [] });
  }

  return JSON.stringify({
    type: 'doc',
    content: merged,
  });
}
