/**
 * OCR Provider Factory
 */

import { OCRProvider, OCRProviderInterface } from './types';
import { TesseractProvider } from './tesseract-provider';
import { ClovaProvider } from './clova-provider';

export * from './types';

export function createOCRProvider(provider: OCRProvider, apiKey?: string): OCRProviderInterface {
  switch (provider) {
    case 'tesseract':
      return new TesseractProvider();
    case 'clova':
      return new ClovaProvider(apiKey);
    default:
      throw new Error(`Unknown OCR provider: ${provider}`);
  }
}
