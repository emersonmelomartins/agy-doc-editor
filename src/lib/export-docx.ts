import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { buildExportFileName, downloadBlob } from '@/lib/file-download';

type TipTapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

type TipTapNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TipTapMark[];
  content?: TipTapNode[];
};

type ListKind = 'bullet' | 'ordered';

const PAGE_MARGIN_TOP_BOTTOM_TWIP = 1276; // ~85px
const PAGE_MARGIN_LEFT_RIGHT_TWIP = 1576; // ~105px

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;

  const response = await fetch(url);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getAlignment(align?: string) {
  if (align === 'center') return AlignmentType.CENTER;
  if (align === 'right') return AlignmentType.RIGHT;
  if (align === 'justify') return AlignmentType.JUSTIFIED;
  return AlignmentType.LEFT;
}

function pickTextStyleMark(marks: TipTapMark[] | undefined): TipTapMark | undefined {
  return marks?.find((mark) => mark.type === 'textStyle');
}

function pickHighlightMark(marks: TipTapMark[] | undefined): TipTapMark | undefined {
  return marks?.find((mark) => mark.type === 'highlight');
}

function buildTextRuns(nodes: TipTapNode[] | undefined): TextRun[] {
  if (!nodes?.length) return [new TextRun('')];

  const runs: TextRun[] = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      const textStyle = pickTextStyleMark(node.marks);
      const color = typeof textStyle?.attrs?.color === 'string'
        ? textStyle.attrs.color.replace('#', '')
        : undefined;

      runs.push(new TextRun({
        text: node.text ?? '',
        bold: node.marks?.some((m) => m.type === 'bold'),
        italics: node.marks?.some((m) => m.type === 'italic'),
        underline: node.marks?.some((m) => m.type === 'underline') ? {} : undefined,
        strike: node.marks?.some((m) => m.type === 'strike'),
        superScript: node.marks?.some((m) => m.type === 'superscript'),
        subScript: node.marks?.some((m) => m.type === 'subscript'),
        color,
        highlight: pickHighlightMark(node.marks) ? 'yellow' : undefined,
      }));
      continue;
    }

    if (node.type === 'hardBreak') {
      runs.push(new TextRun({ break: 1 }));
    }
  }

  return runs.length ? runs : [new TextRun('')];
}

function getImageTypeFromDataUrl(dataUrl: string): 'png' | 'jpg' | 'gif' | 'bmp' {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'jpg';
  if (dataUrl.startsWith('data:image/gif')) return 'gif';
  if (dataUrl.startsWith('data:image/bmp')) return 'bmp';
  return 'png';
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fallback;
}

function buildListParagraph(
  listType: ListKind,
  node: TipTapNode,
  level: number
): Paragraph {
  const paragraphNode = node.content?.find((child) => child.type === 'paragraph');
  const alignment = getAlignment(paragraphNode?.attrs?.textAlign as string | undefined);
  const children = buildTextRuns(paragraphNode?.content);

  if (listType === 'ordered') {
    return new Paragraph({
      children,
      alignment,
      numbering: { reference: 'ordered-list', level: Math.min(level, 8) },
      spacing: { after: 120 },
    });
  }

  return new Paragraph({
    children,
    alignment,
    bullet: { level: Math.min(level, 8) },
    spacing: { after: 120 },
  });
}

async function processNodes(nodes: TipTapNode[], output: Array<Paragraph | Table>, listLevel = 0): Promise<void> {
  for (const node of nodes) {
    if (node.type === 'paragraph') {
      output.push(new Paragraph({
        children: buildTextRuns(node.content),
        alignment: getAlignment(node.attrs?.textAlign as string | undefined),
        spacing: { after: 200 },
      }));
      continue;
    }

    if (node.type === 'heading') {
      const level = asNumber(node.attrs?.level, 1);
      const heading = level === 2
        ? HeadingLevel.HEADING_2
        : level === 3
          ? HeadingLevel.HEADING_3
          : HeadingLevel.HEADING_1;

      output.push(new Paragraph({
        children: buildTextRuns(node.content),
        heading,
        alignment: getAlignment(node.attrs?.textAlign as string | undefined),
        spacing: { before: 220, after: 120 },
      }));
      continue;
    }

    if (node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'taskList') {
      const listType: ListKind = node.type === 'orderedList' ? 'ordered' : 'bullet';
      for (const item of node.content ?? []) {
        output.push(buildListParagraph(listType, item, listLevel));

        const nestedList = item.content?.find((child) => (
          child.type === 'bulletList' || child.type === 'orderedList' || child.type === 'taskList'
        ));

        if (nestedList) {
          await processNodes([nestedList], output, listLevel + 1);
        }
      }
      continue;
    }

    if (node.type === 'blockquote') {
      for (const paragraph of node.content ?? []) {
        output.push(new Paragraph({
          children: buildTextRuns(paragraph.content),
          indent: { left: 720 },
          spacing: { before: 120, after: 120 },
        }));
      }
      continue;
    }

    if (node.type === 'horizontalRule') {
      output.push(new Paragraph({
        thematicBreak: true,
        spacing: { before: 200, after: 200 },
      }));
      continue;
    }

    if (node.type === 'codeBlock') {
      const codeText = node.content
        ?.filter((child) => child.type === 'text')
        .map((child) => child.text ?? '')
        .join('') ?? '';

      output.push(new Paragraph({
        children: [new TextRun({ text: codeText, font: 'Courier New', size: 20 })],
        border: {
          top: { style: BorderStyle.SINGLE, size: 3, color: 'E0E0E0' },
          bottom: { style: BorderStyle.SINGLE, size: 3, color: 'E0E0E0' },
          left: { style: BorderStyle.SINGLE, size: 3, color: 'E0E0E0' },
          right: { style: BorderStyle.SINGLE, size: 3, color: 'E0E0E0' },
        },
        shading: { fill: 'F5F5F5' },
        spacing: { before: 180, after: 180 },
      }));
      continue;
    }

    if (node.type === 'image') {
      try {
        const src = typeof node.attrs?.src === 'string' ? node.attrs.src : '';
        if (!src) continue;

        const dataUrl = await urlToDataUrl(src);
        const base64 = dataUrl.split(',')[1];
        if (!base64) continue;

        const imageWidth = Math.max(120, Math.min(600, asNumber(node.attrs?.width, 420)));
        const imageHeight = Math.max(80, Math.min(800, asNumber(node.attrs?.height, 260)));

        output.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 180, after: 180 },
          children: [
            new ImageRun({
              data: base64ToUint8Array(base64),
              type: getImageTypeFromDataUrl(dataUrl),
              transformation: { width: imageWidth, height: imageHeight },
            }),
          ],
        }));
      } catch (error) {
        console.error('Image processing failed on DOCX export:', error);
      }
      continue;
    }

    if (node.type === 'table') {
      const rows = (node.content ?? []).map((rowNode) => new TableRow({
        children: (rowNode.content ?? []).map((cellNode) => {
          const cellParagraphs = (cellNode.content ?? [])
            .filter((cellChild) => cellChild.type === 'paragraph')
            .map((cellParagraph) => new Paragraph({
              children: buildTextRuns(cellParagraph.content),
              spacing: { after: 80 },
            }));

          return new TableCell({
            children: cellParagraphs.length ? cellParagraphs : [new Paragraph('')],
            width: { size: 1000, type: WidthType.PERCENTAGE },
            shading: cellNode.type === 'tableHeader' ? { fill: 'F0F0F0' } : undefined,
          });
        }),
      }));

      output.push(new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));
      continue;
    }
  }
}

export async function exportToDocx(jsonContent: string, filename: string): Promise<void> {
  try {
    const parsed = JSON.parse(jsonContent) as TipTapNode;
    const children: Array<Paragraph | Table> = [];
    await processNodes(parsed.content ?? [], children);

    const docxDoc = new Document({
      numbering: {
        config: [{
          reference: 'ordered-list',
          levels: Array.from({ length: 9 }, (_, level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
          })),
        }],
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: PAGE_MARGIN_TOP_BOTTOM_TWIP,
              bottom: PAGE_MARGIN_TOP_BOTTOM_TWIP,
              left: PAGE_MARGIN_LEFT_RIGHT_TWIP,
              right: PAGE_MARGIN_LEFT_RIGHT_TWIP,
            },
          },
        },
        children: children.length ? children : [new Paragraph('')],
      }],
    });

    const blob = await Packer.toBlob(docxDoc);
    const finalName = buildExportFileName(filename, 'docx');
    downloadBlob(blob, finalName);
  } catch (error) {
    console.error('DOCX export failed:', error);
    alert('Erro ao exportar DOCX. Verifique se o conteúdo do documento está válido.');
  }
}
