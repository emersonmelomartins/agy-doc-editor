import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  HighlightColor,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextWrappingType,
  TextRun,
  WidthType,
} from 'docx';
import { buildExportFileName, downloadBlob } from '@/utils/file-download';
import { capturePrintPages } from '@/utils/capture-print-pages';

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
type DocxHighlight = (typeof HighlightColor)[keyof typeof HighlightColor];

const PAGE_MARGIN_TOP_BOTTOM_TWIP = 1276; // ~85px
const PAGE_MARGIN_LEFT_RIGHT_TWIP = 1576; // ~105px
const A4_WIDTH_TWIP = 11906;
const A4_HEIGHT_TWIP = 16838;
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

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

function mapHighlightColor(value: unknown): DocxHighlight | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = value.toLowerCase();
  if (normalized === '#ffff00' || normalized === 'yellow') return HighlightColor.YELLOW;
  if (normalized === '#00ff00' || normalized === 'green') return HighlightColor.GREEN;
  if (normalized === '#00ffff' || normalized === 'cyan') return HighlightColor.CYAN;
  if (normalized === '#ff00ff' || normalized === 'magenta') return HighlightColor.MAGENTA;
  if (normalized === '#0000ff' || normalized === 'blue') return HighlightColor.BLUE;
  if (normalized === '#ff0000' || normalized === 'red') return HighlightColor.RED;

  return HighlightColor.YELLOW;
}

function buildTextRuns(nodes: TipTapNode[] | undefined): TextRun[] {
  if (!nodes?.length) return [new TextRun('')];

  const runs: TextRun[] = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      const textStyle = pickTextStyleMark(node.marks);
      const highlightMark = pickHighlightMark(node.marks);
      const hasLink = node.marks?.some((m) => m.type === 'link');
      const color = typeof textStyle?.attrs?.color === 'string'
        ? textStyle.attrs.color.replace('#', '')
        : hasLink
          ? '0563C1'
          : undefined;

      runs.push(new TextRun({
        text: node.text ?? '',
        bold: node.marks?.some((m) => m.type === 'bold'),
        italics: node.marks?.some((m) => m.type === 'italic'),
        underline: (node.marks?.some((m) => m.type === 'underline') || hasLink) ? {} : undefined,
        strike: node.marks?.some((m) => m.type === 'strike'),
        superScript: node.marks?.some((m) => m.type === 'superscript'),
        subScript: node.marks?.some((m) => m.type === 'subscript'),
        color,
        highlight: highlightMark
          ? (mapHighlightColor(highlightMark.attrs?.color) ?? HighlightColor.YELLOW)
          : undefined,
      }));
      continue;
    }

    if (node.type === 'hardBreak') {
      runs.push(new TextRun({ break: 1 }));
    }
  }

  return runs.length ? runs : [new TextRun('')];
}

type DocxImageType = 'png' | 'jpg' | 'gif' | 'bmp';
type DocxImagePayload = { data: Uint8Array; type: DocxImageType };

function mapMimeTypeToDocxType(mimeType: string): DocxImageType | null {
  const normalized = mimeType.toLowerCase();
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') return 'jpg';
  if (normalized === 'image/gif') return 'gif';
  if (normalized === 'image/bmp') return 'bmp';
  return null;
}

async function blobToPng(blob: Blob): Promise<Blob> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Nao foi possivel carregar a imagem para exportacao DOCX.'));
      img.src = objectUrl;
    });

    const canvas = window.document.createElement('canvas');
    canvas.width = Math.max(1, image.naturalWidth || image.width || 1);
    canvas.height = Math.max(1, image.naturalHeight || image.height || 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponivel para converter imagem.');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('Falha ao converter imagem para PNG.'));
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function parseDataUrl(dataUrl: string): { data: Uint8Array; mimeType: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  try {
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { data: bytes, mimeType };
  } catch {
    return null;
  }
}

async function resolveDocxImagePayload(source: string): Promise<DocxImagePayload> {
  const trimmed = source.trim();
  if (trimmed.startsWith('data:')) {
    const parsed = parseDataUrl(trimmed);
    if (!parsed) throw new Error('Data URL de imagem invalida.');
    let docxType = mapMimeTypeToDocxType(parsed.mimeType);
    if (!docxType) docxType = 'png';
    return { data: parsed.data, type: docxType };
  }

  const response = await fetch(trimmed);
  if (!response.ok) {
    throw new Error(`Falha ao carregar imagem (${response.status}).`);
  }

  let blob = await response.blob();
  let docxType = mapMimeTypeToDocxType(blob.type);
  if (!docxType) {
    blob = await blobToPng(blob);
    docxType = 'png';
  }

  return {
    data: new Uint8Array(await blob.arrayBuffer()),
    type: docxType,
  };
}

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Falha ao gerar imagem da pagina para DOCX.'));
    }, 'image/png');
  });
  return new Uint8Array(await blob.arrayBuffer());
}

function fitCanvasToA4(canvas: HTMLCanvasElement) {
  const sourceRatio = canvas.width / Math.max(1, canvas.height);
  const targetRatio = A4_WIDTH_PX / A4_HEIGHT_PX;

  if (sourceRatio >= targetRatio) {
    const width = A4_WIDTH_PX;
    const height = Math.round(width / sourceRatio);
    const offsetY = Math.round((A4_HEIGHT_PX - height) / 2);
    return { width, height, offsetX: 0, offsetY };
  }

  const height = A4_HEIGHT_PX;
  const width = Math.round(height * sourceRatio);
  const offsetX = Math.round((A4_WIDTH_PX - width) / 2);
  return { width, height, offsetX, offsetY: 0 };
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fallback;
}

function buildListParagraph(
  listType: ListKind,
  node: TipTapNode,
  level: number,
  asTaskItem = false
): Paragraph {
  const paragraphNode = node.content?.find((child) => child.type === 'paragraph');
  const alignment = getAlignment(paragraphNode?.attrs?.textAlign as string | undefined);
  const children = buildTextRuns(paragraphNode?.content);
  const checked = Boolean(node.attrs?.checked);
  const taskPrefix = asTaskItem ? new TextRun({ text: checked ? '☑ ' : '☐ ' }) : null;
  const mergedChildren = taskPrefix ? [taskPrefix, ...children] : children;

  if (listType === 'ordered') {
    return new Paragraph({
      children: mergedChildren,
      alignment,
      numbering: { reference: 'ordered-list', level: Math.min(level, 8) },
      spacing: { after: 120 },
    });
  }

  return new Paragraph({
    children: mergedChildren,
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
      const asTaskItem = node.type === 'taskList';
      for (const item of node.content ?? []) {
        output.push(buildListParagraph(listType, item, listLevel, asTaskItem));

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
        const imagePayload = await resolveDocxImagePayload(src);

        const imageWidth = Math.max(120, Math.min(680, asNumber(node.attrs?.width, 420)));
        const imageHeight = Math.max(80, Math.min(800, asNumber(node.attrs?.height, 260)));
        const imageAlignment = getAlignment(
          typeof node.attrs?.align === 'string' ? node.attrs.align : 'center'
        );

        output.push(new Paragraph({
          alignment: imageAlignment,
          spacing: { before: 180, after: 180 },
          children: [
            new ImageRun({
              data: imagePayload.data,
              type: imagePayload.type,
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
    const liveElement = document.getElementById('print-content');
    if (liveElement) {
      const html2canvas = (await import('html2canvas')).default;
      const pageCanvases = await capturePrintPages(liveElement, html2canvas);
      const pageImages = await Promise.all(pageCanvases.map(async (canvas) => ({
        data: await canvasToPngBytes(canvas),
        fit: fitCanvasToA4(canvas),
      })));

      const visualDoc = new Document({
        sections: pageImages.map((pageImage) => ({
          properties: {
            page: {
              size: { width: A4_WIDTH_TWIP, height: A4_HEIGHT_TWIP },
              margin: { top: 0, bottom: 0, left: 0, right: 0 },
            },
          },
          children: [
            new Paragraph({
              spacing: { before: 0, after: 0 },
              children: [
                new ImageRun({
                  data: pageImage.data,
                  type: 'png',
                  transformation: { width: pageImage.fit.width, height: pageImage.fit.height },
                  floating: {
                    horizontalPosition: { offset: pageImage.fit.offsetX },
                    verticalPosition: { offset: pageImage.fit.offsetY },
                    wrap: { type: TextWrappingType.NONE },
                  },
                }),
              ],
            }),
          ],
        })),
      });

      const visualBlob = await Packer.toBlob(visualDoc);
      downloadBlob(visualBlob, buildExportFileName(filename, 'docx'));
      return;
    }

    const parsed = JSON.parse(jsonContent) as TipTapNode;
    const children: Array<Paragraph | Table> = [];
    await processNodes(parsed.content ?? [], children);

    const docxDoc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Arial',
              size: 24,
            },
            paragraph: {
              spacing: { line: 360 },
            },
          },
        },
      },
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
            size: {
              width: A4_WIDTH_TWIP,
              height: A4_HEIGHT_TWIP,
            },
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
