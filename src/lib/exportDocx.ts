import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ImageRun, BorderStyle } from 'docx';

async function urlToBase64(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function processContent(content: any[] = []): any[] {
  return content.map(item => {
    if (item.type === 'text') {
      const colorMark = item.marks?.find((m: any) => m.type === 'textStyle');
      const highlightMark = item.marks?.find((m: any) => m.type === 'highlight');
      
      return new TextRun({
        text: item.text,
        bold: item.marks?.some((m: any) => m.type === 'bold'),
        italics: item.marks?.some((m: any) => m.type === 'italic'),
        underline: item.marks?.some((m: any) => m.type === 'underline') ? {} : undefined,
        strike: item.marks?.some((m: any) => m.type === 'strike'),
        color: colorMark?.attrs?.color?.replace('#', ''),
        highlight: highlightMark?.attrs?.color?.replace('#', ''),
        superScript: item.marks?.some((m: any) => m.type === 'superscript'),
        subScript: item.marks?.some((m: any) => m.type === 'subscript'),
      });
    }
    return new TextRun({ text: '' });
  });
}

async function processNodes(nodes: any[]): Promise<any[]> {
  const results: any[] = [];
  
  const getAlignment = (align?: string) => {
    switch (align) {
      case 'center': return AlignmentType.CENTER;
      case 'right': return AlignmentType.RIGHT;
      case 'justify': return AlignmentType.JUSTIFIED;
      default: return AlignmentType.LEFT;
    }
  };

  for (const node of nodes) {
    if (node.type === 'paragraph') {
      results.push(new Paragraph({
        children: processContent(node.content),
        alignment: getAlignment(node.attrs?.textAlign),
        spacing: { after: 120 }
      }));
    } else if (node.type === 'heading') {
      let headingLevel: any = HeadingLevel.HEADING_1;
      if (node.attrs?.level === 2) headingLevel = HeadingLevel.HEADING_2;
      if (node.attrs?.level === 3) headingLevel = HeadingLevel.HEADING_3;
      
      results.push(new Paragraph({
        children: processContent(node.content),
        heading: headingLevel,
        alignment: getAlignment(node.attrs?.textAlign),
        spacing: { before: 240, after: 120 }
      }));
    } else if (node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'taskList') {
      node.content?.forEach((item: any) => {
        results.push(new Paragraph({
          children: processContent(item.content?.[0]?.content),
          bullet: (node.type === 'bulletList' || node.type === 'taskList') ? { level: 0 } : undefined,
          spacing: { after: 60 }
        }));
      });
    } else if (node.type === 'image') {
      try {
        const b64 = await urlToBase64(node.attrs?.src);
        const data = b64.split(',')[1];
        results.push(new Paragraph({
          children: [
            new ImageRun({
              data: Buffer.from(data, 'base64'),
              transformation: { width: 500, height: 300 },
              type: 'png', // Adjust based on data if needed, but png is a safe default for canvas/base64
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 }
        }));
      } catch (e) {
        console.error('Image processing failed', e);
      }
    } else if (node.type === 'horizontalRule') {
      results.push(new Paragraph({
        thematicBreak: true,
        spacing: { before: 200, after: 200 }
      }));
    } else if (node.type === 'blockquote') {
      node.content?.forEach((p: any) => {
        results.push(new Paragraph({
          children: processContent(p.content),
          indent: { left: 720 },
          spacing: { before: 120, after: 120 }
        }));
      });
    } else if (node.type === 'codeBlock') {
      results.push(new Paragraph({
        children: [new TextRun({
          text: node.content?.[0]?.text || '',
          font: 'Courier New',
          size: 18,
        })],
        shading: { fill: 'F5F5F5' },
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'E0E0E0' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E0E0E0' },
          left: { style: BorderStyle.SINGLE, size: 4, color: 'E0E0E0' },
          right: { style: BorderStyle.SINGLE, size: 4, color: 'E0E0E0' },
        },
        spacing: { before: 200, after: 200 }
      }));
    } else if (node.type === 'table') {
      const rows = node.content.map((rowNode: any) => {
        return new TableRow({
          children: rowNode.content.map((cellNode: any) => {
            return new TableCell({
              children: [new Paragraph({ children: processContent(cellNode.content?.[0]?.content || []) })],
              width: { size: 100 / rowNode.content.length, type: WidthType.PERCENTAGE },
              shading: cellNode.type === 'tableHeader' ? { fill: 'F0F0F0' } : undefined
            });
          })
        });
      });
      results.push(new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));
    }
  }
  return results;
}

export async function exportToDocx(jsonContent: string, filename: string): Promise<void> {
  try {
    let content;
    try {
      content = JSON.parse(jsonContent);
    } catch (e) {
      console.error('Failed to parse content for docx export', e);
      throw new Error('Conteúdo inválido para exportação.');
    }

    const nodes = await processNodes(content.content || []);

    const docxDoc = new Document({
      sections: [{
        children: nodes
      }],
    });

    const blob = await Packer.toBlob(docxDoc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('DOCX Export Error:', error);
    alert('Erro ao exportar documento Word. Por favor, tente novamente.');
  }
}
