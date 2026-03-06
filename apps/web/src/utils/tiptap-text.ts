type TipTapNode = {
  type?: string;
  text?: unknown;
  content?: unknown;
};

function walk(nodes: TipTapNode[] | undefined): number {
  if (!Array.isArray(nodes)) return 0;
  let total = 0;
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    if (node.type === 'text' && typeof node.text === 'string') {
      total += node.text.trim().length;
    }
    if (Array.isArray(node.content)) {
      total += walk(node.content as TipTapNode[]);
    }
  }
  return total;
}

export function estimateTipTapTextLength(serializedContent: string): number {
  if (!serializedContent) return 0;
  try {
    const parsed = JSON.parse(serializedContent) as TipTapNode;
    if (!parsed || typeof parsed !== 'object') return 0;
    return walk(Array.isArray(parsed.content) ? (parsed.content as TipTapNode[]) : []);
  } catch {
    return 0;
  }
}
