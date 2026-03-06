import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { ConversionEngineService } from '@/infrastructure/conversion/conversion-engine-service';

export const importRoutes = (conversionService: ConversionEngineService): FastifyPluginAsync => {
  const routes: FastifyPluginAsync = async (app) => {
    app.post('/import/pdf/editable', async (request, reply) => {
      const file = await request.file();
      if (!file) return reply.status(400).send({ message: 'File is required' });
      const buffer = new Uint8Array(await file.toBuffer());
      const text = await conversionService.extractPdfText(buffer);
      return {
        data: {
          text,
          qualityReport: {
            score: text.length > 0 ? 0.8 : 0.2,
            pages: [],
            warnings: text.length > 0 ? [] : ['No selectable text found in PDF. OCR may be required.'],
          },
        },
      };
    });

    app.post('/convert/pdf-to-docx', async (request, reply) => {
      const file = await request.file();
      if (!file) return reply.status(400).send({ message: 'File is required' });
      try {
        const input = await file.toBuffer();

        const result = await conversionService.withTempDir(async (dir) => {
          const { writeFile, readFile } = await import('node:fs/promises');
          const { join } = await import('node:path');
          const inputPath = join(dir, file.filename);
          await writeFile(inputPath, input);
          const outputPath = await conversionService.convertPdfToDocxWithLibreOffice(inputPath, dir);
          return readFile(outputPath);
        });

        reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        reply.header('Content-Disposition', `attachment; filename="${file.filename.replace(/\.pdf$/i, '')}.docx"`);
        return reply.send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('spawn soffice ENOENT')) {
          return reply.status(503).send({
            message: 'LibreOffice (soffice) nao esta instalado no servidor. Instale para habilitar PDF->DOCX.',
            code: 'LIBREOFFICE_NOT_INSTALLED',
          });
        }
        throw error;
      }
    });

    app.post('/ocr/image', async (request, reply) => {
      const file = await request.file();
      if (!file) return reply.status(400).send({ message: 'File is required' });
      const text = await conversionService.runOcrFromImageBuffer(await file.toBuffer());
      return { data: { text } };
    });

    app.post('/import/pdf/options', async (request) => {
      const schema = z.object({ strictMode: z.boolean().default(false) });
      const body = schema.parse(request.body);
      return { data: body };
    });
  };

  return routes;
};
