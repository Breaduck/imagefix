/**
 * OCR 처리를 위한 React Hook
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { recognizeText, initializeWorker, terminateWorker } from '@/lib/ocr/tesseract-worker';
import {
  convertOCRResultsToTextRegions,
  filterByConfidence,
  sortTextRegions,
} from '@/lib/ocr/text-detector';
import { TextRegion } from '@/types/canvas.types';

export interface UseOCRReturn {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  textRegions: TextRegion[];
  processImage: (imageUrl: string, imageWidth: number, imageHeight: number) => Promise<TextRegion[]>;
  clearResults: () => void;
  cleanup: () => Promise<void>;
}

export function useOCR(): UseOCRReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [textRegions, setTextRegions] = useState<TextRegion[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 이미지에서 텍스트 추출 및 처리
   */
  const processImage = useCallback(
    async (imageUrl: string, imageWidth: number, imageHeight: number): Promise<TextRegion[]> => {
      // 이전 작업 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setIsProcessing(true);
      setProgress(0);
      setError(null);
      setTextRegions([]);

      try {
        // OCR 처리
        const ocrResults = await recognizeText(imageUrl, (p) => {
          setProgress(p * 100);
        });

        console.log(`[useOCR] OCR completed. Found ${ocrResults.length} text regions.`);

        // OCR 결과를 TextRegion으로 변환
        let allRegions = convertOCRResultsToTextRegions(ocrResults, imageWidth, imageHeight);

        // 2종 분리: maskRegions (conf>=15), editableRegions (conf>=60)
        const maskRegions = filterByConfidence(allRegions, 15);
        const editableRegions = filterByConfidence(allRegions, 60);

        console.log(`[OCR] raw=${allRegions.length} mask=${maskRegions.length} editable=${editableRegions.length}`);
        console.log(`[Coord] ocr=${imageWidth}x${imageHeight} canvas=${imageWidth}x${imageHeight} down=1.000/1.000`);

        // 정렬 (위에서 아래, 왼쪽에서 오른쪽)
        const regions = sortTextRegions(editableRegions);

        console.log(`[useOCR] After filtering: ${regions.length} editable text regions.`);

        setTextRegions(regions);
        setProgress(100);

        return regions;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'OCR 처리 중 오류가 발생했습니다.';
        console.error('[useOCR] Error:', err);
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
    setTextRegions([]);
    setProgress(0);
    setError(null);
  }, []);

  /**
   * 워커 종료 및 정리
   */
  const cleanup = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    await terminateWorker();
    clearResults();
  }, [clearResults]);

  return {
    isProcessing,
    progress,
    error,
    textRegions,
    processImage,
    clearResults,
    cleanup,
  };
}
