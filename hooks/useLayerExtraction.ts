/**
 * Layer Extraction Hook
 *
 * 2단계 추출: (1) 텍스트 먼저 (2) 객체 후속
 */

'use client';

import { useState, useCallback } from 'react';
import { LayerExtractionResult, TextRegion, ObjectLayer } from '@/types/canvas.types';

export interface UseLayerExtractionReturn {
  isProcessing: boolean;
  isExtractingObjects: boolean;
  progress: number;
  error: string | null;
  objectError: string | null;
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
  const [isExtractingObjects, setIsExtractingObjects] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [objectError, setObjectError] = useState<string | null>(null);
  const [result, setResult] = useState<LayerExtractionResult | null>(null);

  /**
   * 레이어 추출 실행 (2단계)
   */
  const extractLayers = useCallback(
    async (
      slidePngDataUrl: string,
      imageWidth: number,
      imageHeight: number,
      provider: 'tesseract' | 'clova' = 'tesseract'
    ): Promise<LayerExtractionResult> => {
      console.log('[useLayerExtraction] Starting 2-stage extraction');
      console.log('[useLayerExtraction] Original dimensions:', imageWidth, 'x', imageHeight);

      setIsProcessing(true);
      setIsExtractingObjects(false);
      setProgress(0);
      setError(null);
      setObjectError(null);
      setResult(null);

      try {
        // Resize large images to 1280px max with JPEG compression
        const MAX_DIMENSION = 1280;
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
          resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

          console.log('[useLayerExtraction] Resized to:', resizedWidth, 'x', resizedHeight);
          console.log('[useLayerExtraction] DataURL length reduced:', slidePngDataUrl.length, '->', resizedDataUrl.length);
        }

        // ============ STAGE 1: 텍스트 추출 (필수) ============
        console.log('[useLayerExtraction] STAGE 1: Extracting text...');
        setProgress(10);

        const textResponse = await fetch('/api/extractLayers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slidePngDataUrl: resizedDataUrl,
            imageWidth: resizedWidth,
            imageHeight: resizedHeight,
            provider,
          }),
        });

        if (!textResponse.ok) {
          throw new Error(`텍스트 추출 실패 (${textResponse.status})`);
        }

        const textData = await textResponse.json();
        let textLayers: TextRegion[] = textData.textLayers || [];
        const textMaskBoxes = textData.textMaskBoxes || [];

        // Scale text layers back to original dimensions
        if (resizedWidth !== imageWidth || resizedHeight !== imageHeight) {
          const scaleX = imageWidth / resizedWidth;
          const scaleY = imageHeight / resizedHeight;

          console.log('[useLayerExtraction] Scaling text layers back:', scaleX, 'x', scaleY);

          textLayers = textLayers.map((layer) => ({
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
        }

        console.log('[useLayerExtraction] ✅ Text extraction complete:', textLayers.length, 'texts');
        setProgress(50);

        // 텍스트만으로도 일단 결과 설정 (에디터 즉시 사용 가능)
        const partialResult: LayerExtractionResult = {
          textLayers,
          objectLayers: [],
          stats: {
            textCount: textLayers.length,
            objectCount: 0,
            processingTimeMs: 0,
          },
        };
        setResult(partialResult);
        setIsProcessing(false); // 텍스트 완료 → 스피너 중지

        // ============ STAGE 2: 객체 추출 (선택, 재시도 가능) ============
        console.log('[useLayerExtraction] STAGE 2: Extracting objects...');
        setIsExtractingObjects(true);

        const MAX_RETRIES = 5;
        let retryCount = 0;
        let objectLayers: ObjectLayer[] = [];

        while (retryCount < MAX_RETRIES) {
          try {
            const objectResponse = await fetch('/api/extractObjects', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imagePngDataUrl: resizedDataUrl,
                textMaskBoxes,
                imageWidth: resizedWidth,
                imageHeight: resizedHeight,
              }),
            });

            if (!objectResponse.ok) {
              throw new Error(`객체 추출 실패 (${objectResponse.status})`);
            }

            const objectData = await objectResponse.json();

            // Check if WARMING_UP
            if (objectData.stats?.reason === 'WARMING_UP') {
              retryCount++;
              const retryMs = objectData.stats.retryAfterMs || 15000;
              console.log(`[useLayerExtraction] WARMING_UP, retry ${retryCount}/${MAX_RETRIES} after ${retryMs}ms`);
              setObjectError(`SAM2 준비 중... (${retryCount}/${MAX_RETRIES})`);

              if (retryCount < MAX_RETRIES) {
                await new Promise((resolve) => setTimeout(resolve, retryMs));
                continue;
              } else {
                throw new Error('SAM2 모델이 준비되지 않았습니다. Modal billing limit을 확인하거나 잠시 후 다시 시도해주세요.');
              }
            }

            // Success
            objectLayers = objectData.objectLayers || [];

            // Scale object layers back
            if (resizedWidth !== imageWidth || resizedHeight !== imageHeight) {
              const scaleX = imageWidth / resizedWidth;
              const scaleY = imageHeight / resizedHeight;

              objectLayers = objectLayers.map((layer) => ({
                ...layer,
                x: layer.x * scaleX,
                y: layer.y * scaleY,
                width: layer.width * scaleX,
                height: layer.height * scaleY,
              }));
            }

            console.log('[useLayerExtraction] ✅ Object extraction complete:', objectLayers.length, 'objects');
            break;

          } catch (err) {
            // Don't retry on non-WARMING_UP errors
            throw err;
          }
        }

        setProgress(100);

        const finalResult: LayerExtractionResult = {
          textLayers,
          objectLayers,
          stats: {
            textCount: textLayers.length,
            objectCount: objectLayers.length,
            processingTimeMs: 0,
          },
        };

        setResult(finalResult);
        setObjectError(null);

        return finalResult;

      } catch (err) {
        let errorMessage = 'Layer extraction failed';

        if (err instanceof Error) {
          errorMessage = err.message;
        }

        console.error('[useLayerExtraction] Error:', err);

        // 텍스트는 이미 성공했을 수 있음
        if (result && result.textLayers.length > 0) {
          // 객체 추출만 실패
          setObjectError(errorMessage);
          console.log('[useLayerExtraction] Text succeeded, objects failed');
          return result;
        } else {
          // 텍스트 추출부터 실패
          setError(errorMessage);
          throw err;
        }
      } finally {
        setIsProcessing(false);
        setIsExtractingObjects(false);
      }
    },
    [result]
  );

  /**
   * 결과 초기화
   */
  const clearResults = useCallback(() => {
    setResult(null);
    setProgress(0);
    setError(null);
    setObjectError(null);
  }, []);

  return {
    isProcessing,
    isExtractingObjects,
    progress,
    error,
    objectError,
    result,
    extractLayers,
    clearResults,
  };
}
