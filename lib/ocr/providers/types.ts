/**
 * OCR Provider abstraction
 */

import { OCRResult } from '@/types/ocr.types';

export type OCRProvider = 'tesseract' | 'clova';

export interface OCRProviderOptions {
  onProgress?: (progress: number) => void;
}

export interface OCRProviderInterface {
  recognize(imageUrl: string, options?: OCRProviderOptions): Promise<OCRResult[]>;
}
