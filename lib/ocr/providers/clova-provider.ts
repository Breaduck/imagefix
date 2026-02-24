/**
 * CLOVA OCR Provider (client-side)
 */

import { OCRResult } from '@/types/ocr.types';
import { OCRProviderInterface, OCRProviderOptions } from './types';

export class ClovaProvider implements OCRProviderInterface {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async recognize(imageUrl: string, options?: OCRProviderOptions): Promise<OCRResult[]> {
    // Convert data URL to blob
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // Create FormData
    const formData = new FormData();
    formData.append('image', blob, 'image.png');

    if (options?.onProgress) {
      options.onProgress(0.1); // Upload started
    }

    // Call Next.js API route with optional API key
    const headers: HeadersInit = {};
    if (this.apiKey) {
      headers['X-CLOVA-API-KEY'] = this.apiKey;
    }

    const apiResponse = await fetch('/api/ocr/clova', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!apiResponse.ok) {
      const error = await apiResponse.text();
      throw new Error(`CLOVA OCR failed: ${error}`);
    }

    if (options?.onProgress) {
      options.onProgress(0.9); // Processing complete
    }

    const data = await apiResponse.json();

    if (options?.onProgress) {
      options.onProgress(1.0); // Done
    }

    return data.results as OCRResult[];
  }
}
