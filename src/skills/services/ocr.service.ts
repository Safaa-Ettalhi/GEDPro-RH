import { Injectable, Logger } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      const data = await (pdfParse as any)(buffer);
      return data.text;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Erreur lors de l'extraction PDF: ${errorMessage}`);
      throw new Error(`Impossible d'extraire le texte du PDF: ${errorMessage}`);
    }
  }

  async extractTextFromImage(buffer: Buffer): Promise<string> {
    try {
      const worker = await createWorker('fra+eng'); // Français + Anglais
      const { data } = await worker.recognize(buffer);
      await worker.terminate();
      return data.text;
    } catch (error) {
      this.logger.error(`Erreur lors de l'OCR: ${error.message}`);
      throw new Error(
        `Impossible d'extraire le texte de l'image: ${error.message}`,
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
      this.logger.error(
        `Impossible d'extraire le texte pour ${mimeType}: ${error.message}`,
      );
      return '';
    }
  }
}
