import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createWorker } from 'tesseract.js';

export class ConversionEngineService {
  async convertPdfToDocxWithLibreOffice(inputPath: string, outputDir: string): Promise<string> {
    await this.exec('soffice', ['--headless', '--convert-to', 'docx', '--outdir', outputDir, inputPath]);
    const fileName = inputPath.split('/').pop()?.replace(/\.pdf$/i, '.docx') ?? 'converted.docx';
    return join(outputDir, fileName);
  }

  async extractPdfText(buffer: Uint8Array): Promise<string> {
    const pdf = await getDocument({ data: buffer, disableWorker: true } as any).promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items as Array<{ str?: string }>)
        .map((item) => item.str ?? '')
        .join(' ')
        .trim();
      pages.push(pageText);
    }

    return pages.join('\n\n');
  }

  async runOcrFromImageBuffer(imageBuffer: Buffer): Promise<string> {
    const worker = await createWorker('eng');
    try {
      const result = await worker.recognize(imageBuffer);
      return result.data.text;
    } finally {
      await worker.terminate();
    }
  }

  async withTempDir<T>(action: (dir: string) => Promise<T>): Promise<T> {
    const dir = await mkdtemp(join(tmpdir(), 'docsi-convert-'));
    try {
      return await action(dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async exec(command: string, args: string[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'pipe' });
      let stderr = '';

      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });

      child.on('error', (error) => reject(error));
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`Command failed (${command} ${args.join(' ')}): ${stderr}`));
      });
    });
  }
}
