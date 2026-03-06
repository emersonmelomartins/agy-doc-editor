import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { access, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AlignmentType, Document, ImageRun, Packer, Paragraph } from 'docx';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createWorker } from 'tesseract.js';

type ImportSource = 'pdfjs' | 'ocr' | 'hybrid';
type PageMode = 'pdfjs' | 'ocr' | 'hybrid';

type PageQuality = {
  page: number;
  mode: PageMode;
  confidence: number;
};

type EditableImportResult = {
  text: string;
  source: ImportSource;
  qualityReport: {
    score: number;
    pages: PageQuality[];
    warnings: string[];
  };
};

type EngineCapabilities = {
  pdfToDocxAvailable: boolean;
  ocrAvailable: boolean;
  pdfRasterizationAvailable: boolean;
  libreOfficeVersion?: string;
  tesseractVersion?: string;
  pdftoppmVersion?: string;
};

const MIN_GOOD_TEXT_TOTAL_CHARS = 120;
const MIN_GOOD_TEXT_PAGE_CHARS = 48;
const DOCX_CONVERT_TIMEOUT_MS = 120_000;
const OCR_TIMEOUT_MS = 180_000;
const PDFTOPPM_TIMEOUT_MS = 90_000;
const DOCX_PAGE_WIDTH_PX = 794;
const DOCX_PAGE_HEIGHT_PX = 1123;
const CAPABILITIES_TTL_MS = 60_000;

const require = createRequire(import.meta.url);
const pdfjsPackagePath = require.resolve('pdfjs-dist/package.json');
const pdfjsPackageDir = pdfjsPackagePath.replace(/package\.json$/, '');
const standardFontDataUrl = `${join(pdfjsPackageDir, 'standard_fonts')}/`;

export class ConversionEngineService {
  private capabilitiesCache: { value: EngineCapabilities; expiresAt: number } | null = null;

  async getCapabilities(): Promise<EngineCapabilities> {
    if (this.capabilitiesCache && this.capabilitiesCache.expiresAt > Date.now()) {
      return this.capabilitiesCache.value;
    }

    const [libreOffice, tesseract, pdftoppm] = await Promise.all([
      this.getCommandVersion('soffice', ['--version']),
      this.getCommandVersion('tesseract', ['--version']),
      this.getCommandVersion('pdftoppm', ['-v']),
    ]);

    const value = {
      pdfToDocxAvailable: libreOffice.available || pdftoppm.available,
      ocrAvailable: tesseract.available,
      pdfRasterizationAvailable: pdftoppm.available,
      libreOfficeVersion: libreOffice.version,
      tesseractVersion: tesseract.version,
      pdftoppmVersion: pdftoppm.version,
    };
    this.capabilitiesCache = {
      value,
      expiresAt: Date.now() + CAPABILITIES_TTL_MS,
    };
    return value;
  }

  async convertPdfToDocxWithLibreOffice(inputPath: string, outputDir: string): Promise<string> {
    try {
      await this.exec('soffice', ['--headless', '--convert-to', 'docx', '--outdir', outputDir, inputPath], DOCX_CONVERT_TIMEOUT_MS);
      const libreOfficeOutput = await this.resolveDocxOutputPath(inputPath, outputDir);
      if (libreOfficeOutput) return libreOfficeOutput;
      throw new Error('LIBREOFFICE_OUTPUT_NOT_FOUND');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const canFallbackToImageConversion = message.includes('spawn soffice ENOENT')
        || message.toLowerCase().includes('no export filter')
        || message.includes('LIBREOFFICE_OUTPUT_NOT_FOUND')
        || message.toLowerCase().includes('source file could not be loaded');

      if (!canFallbackToImageConversion) {
        throw error;
      }

      return this.convertPdfToDocxFromRenderedPages(inputPath, outputDir);
    }
  }

  async extractPdfEditable(buffer: Uint8Array): Promise<EditableImportResult> {
    const pdfjsInput = new Uint8Array(buffer);
    const ocrInput = new Uint8Array(buffer);
    const pdfjsPages = await this.extractPdfPagesWithPdfJs(pdfjsInput);
    const pdfjsText = pdfjsPages.map((page) => page.text).join('\n\n').trim();
    const pdfjsQualityPages: PageQuality[] = pdfjsPages.map((page) => ({
      page: page.page,
      mode: 'pdfjs',
      confidence: this.clamp(page.confidence),
    }));

    const warnings: string[] = [];
    const totalPdfChars = pdfjsPages.reduce((sum, page) => sum + page.text.length, 0);
    const hasGoodPdfText = totalPdfChars >= MIN_GOOD_TEXT_TOTAL_CHARS
      && pdfjsPages.some((page) => page.text.length >= MIN_GOOD_TEXT_PAGE_CHARS);

    if (hasGoodPdfText) {
      return {
        text: pdfjsText,
        source: 'pdfjs',
        qualityReport: {
          score: this.calculateScore(pdfjsQualityPages),
          pages: pdfjsQualityPages,
          warnings,
        },
      };
    }

    warnings.push('PDF.js extraiu pouco texto; tentando OCR por pagina.');

    const capabilities = await this.getCapabilities();
    if (!capabilities.pdfRasterizationAvailable) {
      warnings.push('pdftoppm indisponivel no servidor; OCR por pagina foi ignorado.');
      return {
        text: pdfjsText,
        source: 'pdfjs',
        qualityReport: {
          score: this.calculateScore(pdfjsQualityPages),
          pages: pdfjsQualityPages,
          warnings,
        },
      };
    }

    const ocrPages = await this.extractPdfPagesWithOcr(ocrInput);
    if (!ocrPages.length) {
      warnings.push('OCR nao conseguiu extrair conteudo adicional.');
      return {
        text: pdfjsText,
        source: 'pdfjs',
        qualityReport: {
          score: this.calculateScore(pdfjsQualityPages),
          pages: pdfjsQualityPages,
          warnings,
        },
      };
    }

    const mergedPages: Array<{ page: number; text: string; mode: PageMode; confidence: number }> = [];
    for (let index = 0; index < Math.max(pdfjsPages.length, ocrPages.length); index += 1) {
      const pdfPage = pdfjsPages[index];
      const ocrPage = ocrPages[index];

      if (!pdfPage && ocrPage) {
        mergedPages.push({ page: ocrPage.page, text: ocrPage.text, mode: 'ocr', confidence: this.clamp(ocrPage.confidence) });
        continue;
      }

      if (pdfPage && !ocrPage) {
        mergedPages.push({ page: pdfPage.page, text: pdfPage.text, mode: 'pdfjs', confidence: this.clamp(pdfPage.confidence) });
        continue;
      }

      if (!pdfPage || !ocrPage) continue;

      const pdfChars = pdfPage.text.length;
      const ocrChars = ocrPage.text.length;

      if (ocrChars > pdfChars * 1.25 && ocrChars >= MIN_GOOD_TEXT_PAGE_CHARS) {
        mergedPages.push({ page: pdfPage.page, text: ocrPage.text, mode: 'ocr', confidence: this.clamp(ocrPage.confidence) });
      } else if (pdfChars > 0 && ocrChars > 0 && Math.abs(pdfChars - ocrChars) <= 24) {
        const hybridText = `${pdfPage.text}\n${ocrPage.text}`.trim();
        mergedPages.push({
          page: pdfPage.page,
          text: hybridText,
          mode: 'hybrid',
          confidence: this.clamp(Math.max(pdfPage.confidence, ocrPage.confidence)),
        });
      } else {
        mergedPages.push({ page: pdfPage.page, text: pdfPage.text, mode: 'pdfjs', confidence: this.clamp(pdfPage.confidence) });
      }
    }

    const mergedText = mergedPages.map((page) => page.text).join('\n\n').trim();
    const pageQualities: PageQuality[] = mergedPages.map((page) => ({
      page: page.page,
      mode: page.mode,
      confidence: this.clamp(page.confidence),
    }));
    const source = this.detectSource(pageQualities);

    if (mergedText.length < MIN_GOOD_TEXT_TOTAL_CHARS) {
      warnings.push('Resultado final ainda possui baixa densidade textual para edicao completa.');
    }

    return {
      text: mergedText,
      source,
      qualityReport: {
        score: this.calculateScore(pageQualities),
        pages: pageQualities,
        warnings,
      },
    };
  }

  async extractPdfText(buffer: Uint8Array): Promise<string> {
    const result = await this.extractPdfEditable(buffer);
    return result.text;
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

  private detectSource(pages: PageQuality[]): ImportSource {
    const allPdfjs = pages.every((page) => page.mode === 'pdfjs');
    const allOcr = pages.every((page) => page.mode === 'ocr');
    if (allPdfjs) return 'pdfjs';
    if (allOcr) return 'ocr';
    return 'hybrid';
  }

  private calculateScore(pages: PageQuality[]): number {
    if (!pages.length) return 0;
    const total = pages.reduce((sum, page) => sum + this.clamp(page.confidence), 0);
    return Number((total / pages.length).toFixed(3));
  }

  private clamp(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }

  private computePdfJsConfidence(text: string): number {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return 0.1;
    const words = clean.split(' ').filter(Boolean).length;
    const chars = clean.length;
    return this.clamp((chars / 600) * 0.65 + (words / 120) * 0.35);
  }

  private async extractPdfPagesWithPdfJs(buffer: Uint8Array): Promise<Array<{ page: number; text: string; confidence: number }>> {
    const pdf = await getDocument({
      data: buffer,
      disableWorker: true,
      standardFontDataUrl,
    } as any).promise;
    const pages: Array<{ page: number; text: string; confidence: number }> = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const rawText = (textContent.items as Array<{ str?: string }>)
        .map((item) => item.str ?? '')
        .join(' ');
      const pageText = rawText.replace(/\s+/g, ' ').trim();
      pages.push({
        page: pageNumber,
        text: pageText,
        confidence: this.computePdfJsConfidence(pageText),
      });
    }

    return pages;
  }

  private async extractPdfPagesWithOcr(buffer: Uint8Array): Promise<Array<{ page: number; text: string; confidence: number }>> {
    return this.withTempDir(async (dir) => {
      const inputPath = join(dir, 'source.pdf');
      const outputPrefix = join(dir, 'page');

      await writeFile(inputPath, Buffer.from(buffer));
      await this.exec('pdftoppm', ['-png', '-r', '200', inputPath, outputPrefix], PDFTOPPM_TIMEOUT_MS);

      const entries = await readdir(dir);
      const pageImages = entries
        .filter((entry) => /^page-\d+\.png$/i.test(entry))
        .sort((a, b) => {
          const pageA = Number(a.match(/-(\d+)\.png$/i)?.[1] ?? 0);
          const pageB = Number(b.match(/-(\d+)\.png$/i)?.[1] ?? 0);
          return pageA - pageB;
        });

      if (!pageImages.length) return [];

      const worker = await createWorker('eng');
      try {
        const pages: Array<{ page: number; text: string; confidence: number }> = [];
        for (const image of pageImages) {
          const imagePath = join(dir, image);
          const ocrResult = await this.withTimeout(worker.recognize(imagePath), OCR_TIMEOUT_MS, 'OCR timeout');
          const text = String(ocrResult.data.text ?? '').replace(/\s+/g, ' ').trim();
          const confidence = this.clamp(Number(ocrResult.data.confidence ?? 0) / 100);
          const page = Number(image.match(/-(\d+)\.png$/i)?.[1] ?? pages.length + 1);
          pages.push({ page, text, confidence });
        }
        return pages;
      } finally {
        await worker.terminate();
      }
    });
  }

  private async convertPdfToDocxFromRenderedPages(inputPath: string, outputDir: string): Promise<string> {
    const outputPrefix = join(outputDir, 'pdf-page');
    await this.exec('pdftoppm', ['-png', '-r', '220', inputPath, outputPrefix], PDFTOPPM_TIMEOUT_MS);

    const entries = await readdir(outputDir);
    const pageFiles = entries
      .filter((entry) => /^pdf-page-\d+\.png$/i.test(entry))
      .sort((a, b) => {
        const pageA = Number(a.match(/-(\d+)\.png$/i)?.[1] ?? 0);
        const pageB = Number(b.match(/-(\d+)\.png$/i)?.[1] ?? 0);
        return pageA - pageB;
      });

    if (!pageFiles.length) {
      throw new Error('PDF_TO_DOCX_PAGE_RENDER_FAILED');
    }

    const paragraphs: Paragraph[] = [];
    for (let index = 0; index < pageFiles.length; index += 1) {
      const pageFile = pageFiles[index];
      const imageBuffer = await readFile(join(outputDir, pageFile));
      const dimensions = this.readPngDimensions(imageBuffer);
      const fitted = this.fitImageWithinDocPage(
        dimensions?.width ?? DOCX_PAGE_WIDTH_PX,
        dimensions?.height ?? DOCX_PAGE_HEIGHT_PX,
      );

      paragraphs.push(new Paragraph({
        pageBreakBefore: index > 0,
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: imageBuffer,
            type: 'png',
            transformation: fitted,
          }),
        ],
      }));
    }

    const docx = new Document({
      sections: [
        {
          children: paragraphs,
        },
      ],
    });

    const outputPath = join(
      outputDir,
      `${inputPath.split('/').pop()?.replace(/\.pdf$/i, '') ?? 'converted'}.docx`,
    );
    const buffer = await Packer.toBuffer(docx);
    await writeFile(outputPath, buffer);
    return outputPath;
  }

  private fitImageWithinDocPage(width: number, height: number): { width: number; height: number } {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    const ratio = Math.min(DOCX_PAGE_WIDTH_PX / safeWidth, DOCX_PAGE_HEIGHT_PX / safeHeight);
    return {
      width: Math.max(1, Math.round(safeWidth * ratio)),
      height: Math.max(1, Math.round(safeHeight * ratio)),
    };
  }

  private readPngDimensions(buffer: Buffer): { width: number; height: number } | null {
    if (buffer.length < 24) return null;
    const pngSignature = '89504e470d0a1a0a';
    if (buffer.subarray(0, 8).toString('hex') !== pngSignature) return null;
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (!width || !height) return null;
    return { width, height };
  }

  private async resolveDocxOutputPath(inputPath: string, outputDir: string): Promise<string | null> {
    const expectedPath = join(outputDir, inputPath.split('/').pop()?.replace(/\.pdf$/i, '.docx') ?? 'converted.docx');
    try {
      await access(expectedPath);
      return expectedPath;
    } catch {
      const entries = await readdir(outputDir);
      const docxCandidates = entries
        .filter((entry) => entry.toLowerCase().endsWith('.docx'))
        .map((entry) => join(outputDir, entry));
      return docxCandidates[0] ?? null;
    }
  }

  private async getCommandVersion(command: string, args: string[]): Promise<{ available: boolean; version?: string }> {
    try {
      const output = await this.execAndCapture(command, args, 10_000);
      return {
        available: true,
        version: output.trim().split('\n').find((line) => line.trim().length > 0)?.trim(),
      };
    } catch {
      return { available: false };
    }
  }

  private async exec(command: string, args: string[], timeoutMs = 60_000): Promise<void> {
    await this.execAndCapture(command, args, timeoutMs);
  }

  private async execAndCapture(command: string, args: string[], timeoutMs: number): Promise<string> {
    return this.withTimeout(new Promise<string>((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'pipe' });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
      });

      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });

      child.on('error', (error) => reject(error));
      child.on('close', (code) => {
        if (code === 0) {
          resolve(`${stdout}\n${stderr}`.trim());
          return;
        }
        reject(new Error(`Command failed (${command} ${args.join(' ')}): ${stderr || stdout}`));
      });
    }), timeoutMs, `Timeout running ${command}`);
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

}
