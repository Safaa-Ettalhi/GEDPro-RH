import { Injectable, Logger } from '@nestjs/common';
import { createWorker, Worker } from 'tesseract.js';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      this.logger.log(`Début extraction PDF (${buffer.length} bytes)`);

      const pdfParseModule = await import('pdf-parse');
      const PDFParse = pdfParseModule.PDFParse as new (options: {
        data: Buffer;
      }) => {
        getText: () => Promise<{ text: string }>;
      };

      const parser = new PDFParse({ data: buffer });

      const result = await parser.getText();
      const text =
        typeof result === 'object' && result !== null && 'text' in result
          ? String(result.text || '')
          : '';

      this.logger.log(`Texte extrait du PDF (${text.length} caractères)`);
      return text;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Erreur lors de l'extraction PDF: ${errorMessage}`);
      this.logger.error(`Stack trace: ${errorStack}`);
      throw new Error(`Impossible d'extraire le texte du PDF: ${errorMessage}`);
    }
  }

  async extractTextFromImage(buffer: Buffer): Promise<string> {
    let worker: Worker | undefined;
    try {
      this.logger.log(`Début OCR image (${buffer.length} bytes)`);
      worker = await createWorker('fra+eng');
      const result = await worker.recognize(buffer);
      const text =
        result && typeof result === 'object' && 'data' in result
          ? String(result.data?.text || '')
          : '';
      this.logger.log(`Texte extrait de l'image (${text.length} caractères)`);
      await worker.terminate();
      return text;
    } catch (error) {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // Ignore termination errors
        }
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Erreur lors de l'OCR: ${errorMessage}`);
      this.logger.error(`Stack trace: ${errorStack}`);
      throw new Error(
        `Impossible d'extraire le texte de l'image: ${errorMessage}`,
      );
    }
  }

  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    this.logger.log(`Extraction de texte pour type MIME: ${mimeType}`);

    if (mimeType === 'application/pdf') {
      return this.extractTextFromPdf(buffer);
    }

    if (
      mimeType.startsWith('image/') &&
      [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/tiff',
        'image/bmp',
      ].includes(mimeType)
    ) {
      return this.extractTextFromImage(buffer);
    }

    if (mimeType.startsWith('text/')) {
      return buffer.toString('utf-8');
    }

    this.logger.warn(
      `Type MIME non supporté directement: ${mimeType}, tentative OCR...`,
    );
    try {
      return await this.extractTextFromImage(buffer);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Impossible d'extraire le texte pour ${mimeType}: ${errorMessage}`,
      );
      return '';
    }
  }
}
