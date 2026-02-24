/**
 * OCR 결과와 스타일 추출을 통합하는 Hook
 */

'use client';

import { useCallback } from 'react';
import { useOCR } from './useOCR';
import { TextRegion } from '@/types/canvas.types';
import { extractDominantColor } from '@/lib/style/color-extractor';
import { OCRProvider } from '@/lib/ocr/providers';

export interface UseTextExtractionReturn {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  textRegions: TextRegion[];
  extractText: (imageUrl: string, imageWidth: number, imageHeight: number) => Promise<TextRegion[]>;
  clearResults: () => void;
}

export function useTextExtraction(provider: OCRProvider = 'tesseract', apiKey?: string): UseTextExtractionReturn {
  const { isProcessing, progress, error, textRegions, processImage, clearResults } = useOCR(provider, apiKey);

  /**
   * 이미지에서 텍스트 추출 + 스타일 분석
   */
  const extractText = useCallback(
    async (imageUrl: string, imageWidth: number, imageHeight: number): Promise<TextRegion[]> => {
      // OCR 처리
      const regions = await processImage(imageUrl, imageWidth, imageHeight);

      // 색상 추출 (이미지 로드 필요)
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // 각 텍스트 영역의 색상 추출
      const regionsWithColor = regions.map((region) => {
        try {
          const color = extractDominantColor(img, {
            x0: region.position.x,
            y0: region.position.y,
            x1: region.position.x + region.size.width,
            y1: region.position.y + region.size.height,
          });

          return {
            ...region,
            style: {
              ...region.style,
              color,
            },
          };
        } catch (error) {
          console.error('Error extracting color for region:', error);
          return region;
        }
      });

      return regionsWithColor;
    },
    [processImage]
  );

  return {
    isProcessing,
    progress,
    error,
    textRegions,
    extractText,
    clearResults,
  };
}
