/**
 * Tesseract OCR Provider
 */

import { OCRResult } from '@/types/ocr.types';
import { recognizeText } from '../tesseract-worker';
import { OCRProviderInterface, OCRProviderOptions } from './types';

export class TesseractProvider implements OCRProviderInterface {
  async recognize(imageUrl: string, options?: OCRProviderOptions): Promise<OCRResult[]> {
    return recognizeText(imageUrl, options?.onProgress);
  }
}
