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
 * Two-pass OCR: eng + kor 각각 실행 후 병합
 */
export async function recognizeTextTwoPass(
  imageUrl: string,
  onProgress?: (progress: number) => void
): Promise<OCRResult[]> {
  console.log('[Tesseract] Starting two-pass OCR (eng + kor)');

  // Pass 1: English (PSM.SPARSE for slides)
  const workerEng = await createWorker('eng', undefined, {
    langPath: TESSERACT_CONFIG.langPath,
  });
  await workerEng.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT, // Better for slides
  });

  const engResult = await workerEng.recognize(imageUrl);
  await workerEng.terminate();
  if (onProgress) onProgress(0.5);

  // Pass 2: Korean
  const workerKor = await createWorker('kor', undefined, {
    langPath: TESSERACT_CONFIG.langPath,
  });
  await workerKor.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
  });

  const korResult = await workerKor.recognize(imageUrl);
  await workerKor.terminate();
  if (onProgress) onProgress(1.0);

  // 결과 변환
  const engLines = convertLinesToOCRResults(engResult.data.lines || []);
  const korLines = convertLinesToOCRResults(korResult.data.lines || []);

  console.log(`[Tesseract] Pass1 (eng): ${engLines.length} regions, Pass2 (kor): ${korLines.length} regions`);

  // IoU 병합: 겹치는 영역은 confidence 높은 것 선택
  const merged = mergeOCRResults(engLines, korLines);
  console.log(`[Tesseract] Merged: ${merged.length} total regions`);

  return merged;
}

/**
 * 라인을 OCRResult로 변환
 */
function convertLinesToOCRResults(lines: any[]): OCRResult[] {
  return (lines || [])
    .map((line) => {
      const bbox: BoundingBox = {
        x0: line.bbox.x0,
        y0: line.bbox.y0,
        x1: line.bbox.x1,
        y1: line.bbox.y1,
      };

      const lineWords: OCRWord[] = (line.words || []).map((word: any) => ({
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
    })
    .filter((result) => result.text.trim().length > 0);
}

/**
 * IoU 기반 OCR 결과 병합
 */
function mergeOCRResults(engResults: OCRResult[], korResults: OCRResult[]): OCRResult[] {
  const merged: OCRResult[] = [...engResults];
  const IOU_THRESHOLD = 0.3; // 30% 이상 겹치면 중복으로 간주

  for (const korRegion of korResults) {
    let hasOverlap = false;

    for (let i = 0; i < merged.length; i++) {
      const iou = calculateIoU(merged[i].bbox, korRegion.bbox);

      if (iou > IOU_THRESHOLD) {
        hasOverlap = true;
        // confidence 높은 것 선택
        if (korRegion.confidence > merged[i].confidence) {
          merged[i] = korRegion;
        }
        break;
      }
    }

    // 겹치지 않으면 추가
    if (!hasOverlap) {
      merged.push(korRegion);
    }
  }

  return merged;
}

/**
 * IoU (Intersection over Union) 계산
 */
function calculateIoU(bbox1: BoundingBox, bbox2: BoundingBox): number {
  const x1 = Math.max(bbox1.x0, bbox2.x0);
  const y1 = Math.max(bbox1.y0, bbox2.y0);
  const x2 = Math.min(bbox1.x1, bbox2.x1);
  const y2 = Math.min(bbox1.y1, bbox2.y1);

  if (x2 < x1 || y2 < y1) return 0; // No overlap

  const intersection = (x2 - x1) * (y2 - y1);
  const area1 = (bbox1.x1 - bbox1.x0) * (bbox1.y1 - bbox1.y0);
  const area2 = (bbox2.x1 - bbox2.x0) * (bbox2.y1 - bbox2.y0);
  const union = area1 + area2 - intersection;

  return intersection / union;
}

/**
 * 이미지에서 텍스트 추출 (기존 단일 패스, 호환성 유지)
 */
export async function recognizeText(
  imageUrl: string,
  onProgress?: (progress: number) => void
): Promise<OCRResult[]> {
  // Two-pass OCR 사용
  return recognizeTextTwoPass(imageUrl, onProgress);
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
 * 이미지 전처리: grayscale + contrast + sharpen
 */
export function preprocessImageAdvanced(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 1. Grayscale
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = data[i + 1] = data[i + 2] = gray;
      }

      // 2. Contrast enhancement
      const contrast = 1.3;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL());
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

/**
 * 이미지 전처리 (선택적) - 기존 함수 유지
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
