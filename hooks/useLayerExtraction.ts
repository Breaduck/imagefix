/**
 * Layer Extraction Hook
 *
 * 슬라이드 이미지에서 텍스트 + 객체 레이어를 추출하는 Hook
 */

'use client';

import { useState, useCallback } from 'react';
import { LayerExtractionResult } from '@/types/canvas.types';

export interface UseLayerExtractionReturn {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  result: LayerExtractionResult | null;
  extractLayers: (
    slidePngDataUrl: string,
    imageWidth: number,
    imageHeight: number,
    provider?: 'tesseract' | 'clova'
  ) => Promise<LayerExtractionResult>;
  clearResults: () => void;
}

export function useLayerExtraction(): UseLayerExtractionReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LayerExtractionResult | null>(null);

  /**
   * 레이어 추출 실행
   */
  const extractLayers = useCallback(
    async (
      slidePngDataUrl: string,
      imageWidth: number,
      imageHeight: number,
      provider: 'tesseract' | 'clova' = 'tesseract'
    ): Promise<LayerExtractionResult> => {
      console.log('[useLayerExtraction] Starting extraction');
      console.log('[useLayerExtraction] DataURL length:', slidePngDataUrl.length);
      console.log('[useLayerExtraction] Dimensions:', imageWidth, 'x', imageHeight);

      setIsProcessing(true);
      setProgress(0);
      setError(null);
      setResult(null);

      try {
        // API 호출
        setProgress(10);
        const response = await fetch('/api/extractLayers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slidePngDataUrl,
            imageWidth,
            imageHeight,
            provider,
          }),
        });

        setProgress(50);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Layer extraction failed');
        }

        const extractionResult: LayerExtractionResult = await response.json();

        console.log('[useLayerExtraction] ✅ Extraction complete:', {
          textCount: extractionResult.stats.textCount,
          objectCount: extractionResult.stats.objectCount,
          timeMs: extractionResult.stats.processingTimeMs,
        });

        setProgress(100);
        setResult(extractionResult);

        return extractionResult;

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Layer extraction failed';
        console.error('[useLayerExtraction] Error:', err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  /**
   * 결과 초기화
   */
  const clearResults = useCallback(() => {
    setResult(null);
    setProgress(0);
    setError(null);
  }, []);

  return {
    isProcessing,
    progress,
    error,
    result,
    extractLayers,
    clearResults,
  };
}
