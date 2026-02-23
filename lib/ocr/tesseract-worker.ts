/**
 * Tesseract.js 워커 관리 및 OCR 처리
 */

import { createWorker, Worker, PSM } from 'tesseract.js';
import { TESSERACT_CONFIG, OCR_OPTIONS } from './language-config';
import { OCRResult, BoundingBox, OCRWord } from '@/types/ocr.types';

let worker: Worker | null = null;

/**
 * Tesseract 워커 초기화
 */
export async function initializeWorker(
  onProgress?: (progress: number) => void
): Promise<Worker> {
  if (worker) {
    return worker;
  }

  console.log(`[Tesseract] Initializing worker with languages: ${OCR_OPTIONS.lang}`);
  console.log(`[Tesseract] Language data path: ${TESSERACT_CONFIG.langPath}`);

  worker = await createWorker(OCR_OPTIONS.lang, undefined, {
    langPath: TESSERACT_CONFIG.langPath,
    logger: (m: any) => {
      console.log(`[Tesseract] ${m.status}: ${m.progress}`);
      if (onProgress && m.progress) {
        onProgress(m.progress);
      }
    },
  });

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
  });

  console.log(`[Tesseract] Worker initialized successfully`);

  return worker;
}

/**
 * 이미지에서 텍스트 추출
 */
export async function recognizeText(
  imageUrl: string,
  onProgress?: (progress: number) => void
): Promise<OCRResult[]> {
  const currentWorker = await initializeWorker(onProgress);

  const {
    data: { words, lines },
  } = await currentWorker.recognize(imageUrl);

  // 라인 단위로 결과 변환
  const results: OCRResult[] = (lines || []).map((line, index) => {
    const bbox: BoundingBox = {
      x0: line.bbox.x0,
      y0: line.bbox.y0,
      x1: line.bbox.x1,
      y1: line.bbox.y1,
    };

    const lineWords: OCRWord[] = (line.words || []).map((word) => ({
      text: word.text,
      confidence: word.confidence,
      bbox: {
        x0: word.bbox.x0,
        y0: word.bbox.y0,
        x1: word.bbox.x1,
        y1: word.bbox.y1,
      },
    }));

    return {
      text: line.text,
      confidence: line.confidence,
      bbox,
      baseline: {
        ...line.baseline,
        hasDropCap: (line.baseline as any).hasDropCap || false,
      },
      words: lineWords,
    };
  });

  return results.filter((result) => result.text.trim().length > 0);
}

/**
 * 워커 종료 및 메모리 해제
 */
export async function terminateWorker(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

/**
 * 이미지 전처리 (선택적)
 * OCR 정확도 향상을 위한 이미지 전처리
 */
export function preprocessImage(
  imageElement: HTMLImageElement
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  canvas.width = imageElement.width;
  canvas.height = imageElement.height;

  // 이미지 그리기
  ctx.drawImage(imageElement, 0, 0);

  // 대비 향상 (선택적)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // 간단한 대비 향상 알고리즘
  const contrast = 1.2;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = factor * (data[i] - 128) + 128; // Red
    data[i + 1] = factor * (data[i + 1] - 128) + 128; // Green
    data[i + 2] = factor * (data[i + 2] - 128) + 128; // Blue
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}
