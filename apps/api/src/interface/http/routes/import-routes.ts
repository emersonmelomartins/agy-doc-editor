import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { ConversionEngineService } from '@/infrastructure/conversion/conversion-engine-service';

export const importRoutes = (conversionService: ConversionEngineService): FastifyPluginAsync => {
  const routes: FastifyPluginAsync = async (app) => {
    const ensureMultipartRequest = (request: FastifyRequest, reply: FastifyReply) => {
      const multipart = typeof (request as FastifyRequest & { isMultipart?: () => boolean }).isMultipart === 'function'
        ? (request as FastifyRequest & { isMultipart: () => boolean }).isMultipart()
        : false;
      if (multipart) return true;
      reply.status(400).send({ message: 'File is required' });
      return false;
    };

    app.get('/capabilities', async () => {
      const data = await conversionService.getCapabilities();
      return { data };
    });

    app.post('/import/pdf/editable', async (request, reply) => {
      if (!ensureMultipartRequest(request, reply)) return;
      const file = await request.file();
      if (!file) return reply.status(400).send({ message: 'File is required' });
      const buffer = new Uint8Array(await file.toBuffer());
      const result = await conversionService.extractPdfEditable(buffer);
      return {
        data: {
          text: result.text,
          source: result.source,
          qualityReport: result.qualityReport,
        },
      };
    });

    app.post('/convert/pdf-to-docx', async (request, reply) => {
      if (!ensureMultipartRequest(request, reply)) return;
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
            message: 'Motor de conversao indisponivel no servidor. Instale LibreOffice ou habilite o fallback por imagens.',
            code: 'PDF_CONVERTER_NOT_AVAILABLE',
          });
        }
        if (message.includes('spawn pdftoppm ENOENT')) {
          return reply.status(503).send({
            message: 'Poppler (pdftoppm) nao esta instalado no servidor para fallback de conversao.',
            code: 'PDF_CONVERTER_NOT_AVAILABLE',
          });
        }
        if (message.toLowerCase().includes('timeout')) {
          return reply.status(504).send({
            message: 'Tempo limite excedido durante a conversao PDF->DOCX.',
            code: 'PDF_TO_DOCX_TIMEOUT',
          });
        }
        request.log.error({ err: error }, 'PDF to DOCX conversion failed');
        return reply.status(500).send({
          message: 'Falha na conversao PDF->DOCX.',
          code: 'PDF_TO_DOCX_FAILED',
        });
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
