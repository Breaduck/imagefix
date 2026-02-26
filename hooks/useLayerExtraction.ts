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
      console.log('[useLayerExtraction] Original dimensions:', imageWidth, 'x', imageHeight);

      setIsProcessing(true);
      setProgress(0);
      setError(null);
      setResult(null);

      try {
        // Resize large images before sending to API to prevent timeout
        const MAX_DIMENSION = 2048;
        let resizedDataUrl = slidePngDataUrl;
        let resizedWidth = imageWidth;
        let resizedHeight = imageHeight;

        if (imageWidth > MAX_DIMENSION || imageHeight > MAX_DIMENSION) {
          console.log('[useLayerExtraction] Resizing large image...');

          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = slidePngDataUrl;
          });

          const ratio = Math.min(MAX_DIMENSION / imageWidth, MAX_DIMENSION / imageHeight);
          resizedWidth = Math.floor(imageWidth * ratio);
          resizedHeight = Math.floor(imageHeight * ratio);

          const canvas = document.createElement('canvas');
          canvas.width = resizedWidth;
          canvas.height = resizedHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Canvas context not available');
          }

          ctx.drawImage(img, 0, 0, resizedWidth, resizedHeight);
          resizedDataUrl = canvas.toDataURL('image/png');

          console.log('[useLayerExtraction] Resized to:', resizedWidth, 'x', resizedHeight);
          console.log('[useLayerExtraction] DataURL length reduced:', slidePngDataUrl.length, '->', resizedDataUrl.length);
        } else {
          console.log('[useLayerExtraction] Image size OK, no resize needed');
        }

        // API 호출
        setProgress(10);
        const response = await fetch('/api/extractLayers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slidePngDataUrl: resizedDataUrl,
            imageWidth: resizedWidth,
            imageHeight: resizedHeight,
            originalWidth: imageWidth,
            originalHeight: imageHeight,
            provider,
          }),
        });

        setProgress(50);

        if (!response.ok) {
          // Handle 504 Gateway Timeout specifically
          if (response.status === 504) {
            throw new Error('처리 시간이 초과되었습니다. 이미지 크기를 줄이거나 나중에 다시 시도해주세요.');
          }

          // Try to parse JSON error, fallback to status text
          let errorMessage = 'Layer extraction failed';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // Response is not JSON, use status text
            errorMessage = `서버 오류 (${response.status}): ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        // Parse response with error handling for non-JSON responses
        let extractionResult: LayerExtractionResult;
        try {
          extractionResult = await response.json();
        } catch (jsonError) {
          console.error('[useLayerExtraction] Failed to parse response as JSON:', jsonError);
          throw new Error('서버 응답 형식이 올바르지 않습니다. 다시 시도해주세요.');
        }

        console.log('[useLayerExtraction] ✅ Extraction complete:', {
          textCount: extractionResult.stats.textCount,
          objectCount: extractionResult.stats.objectCount,
          timeMs: extractionResult.stats.processingTimeMs,
        });

        // Scale results back to original dimensions if image was resized
        if (resizedWidth !== imageWidth || resizedHeight !== imageHeight) {
          const scaleX = imageWidth / resizedWidth;
          const scaleY = imageHeight / resizedHeight;

          console.log('[useLayerExtraction] Scaling results back to original dimensions');
          console.log('[useLayerExtraction] Scale factors:', scaleX, 'x', scaleY);

          // Scale text layers
          extractionResult.textLayers = extractionResult.textLayers.map((layer) => ({
            ...layer,
            position: {
              x: layer.position.x * scaleX,
              y: layer.position.y * scaleY,
            },
            size: {
              width: layer.size.width * scaleX,
              height: layer.size.height * scaleY,
            },
            style: {
              ...layer.style,
              fontSize: layer.style.fontSize * scaleY,
            },
          }));

          // Scale object layers
          extractionResult.objectLayers = extractionResult.objectLayers.map((layer) => ({
            ...layer,
            x: layer.x * scaleX,
            y: layer.y * scaleY,
            width: layer.width * scaleX,
            height: layer.height * scaleY,
          }));
        }

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
