/**
 * 이미지에서 텍스트 완전 제거 (진짜 편집의 핵심)
 *
 * 방법 1 (현재): Canvas 픽셀 조작 - 텍스트 영역을 주변 배경색으로 채우기
 * 방법 2 (미래): AI Inpainting API (ClipDrop, Stability AI 등)
 */

'use client';

import { TextRegion } from '@/types/canvas.types';
import { PDFTextRegion } from '@/types/pdf.types';

/**
 * 텍스트 영역의 주변 배경을 샘플링하여 배경 패턴 추정
 */
function sampleBackgroundPattern(
  ctx: CanvasRenderingContext2D,
  region: { x: number; y: number; width: number; height: number },
  sampleWidth: number = 10
): ImageData | null {
  try {
    // 텍스트 영역 주변의 배경 샘플링 (왼쪽, 오른쪽, 위, 아래)
    const samples: ImageData[] = [];

    // 왼쪽 샘플
    if (region.x - sampleWidth >= 0) {
      samples.push(
        ctx.getImageData(
          region.x - sampleWidth,
          region.y,
          sampleWidth,
          region.height
        )
      );
    }

    // 오른쪽 샘플
    const canvasWidth = ctx.canvas.width;
    if (region.x + region.width + sampleWidth <= canvasWidth) {
      samples.push(
        ctx.getImageData(
          region.x + region.width,
          region.y,
          sampleWidth,
          region.height
        )
      );
    }

    // 위쪽 샘플
    if (region.y - sampleWidth >= 0) {
      samples.push(
        ctx.getImageData(
          region.x,
          region.y - sampleWidth,
          region.width,
          sampleWidth
        )
      );
    }

    // 아래쪽 샘플
    const canvasHeight = ctx.canvas.height;
    if (region.y + region.height + sampleWidth <= canvasHeight) {
      samples.push(
        ctx.getImageData(
          region.x,
          region.y + region.height,
          region.width,
          sampleWidth
        )
      );
    }

    return samples.length > 0 ? samples[0] : null;
  } catch (error) {
    console.error('[TextRemover] Error sampling background:', error);
    return null;
  }
}

/**
 * 텍스트 영역을 배경으로 채우기 (간단한 inpainting)
 */
function fillWithBackground(
  ctx: CanvasRenderingContext2D,
  region: { x: number; y: number; width: number; height: number }
): void {
  // 주변 픽셀 샘플링
  const left = Math.max(0, region.x - 1);
  const top = Math.max(0, region.y - 1);
  const right = Math.min(ctx.canvas.width - 1, region.x + region.width + 1);
  const bottom = Math.min(ctx.canvas.height - 1, region.y + region.height + 1);

  // 주변 평균 색상 계산
  const borderPixels: { r: number; g: number; b: number }[] = [];

  // 위쪽 border
  for (let x = left; x <= right; x++) {
    const pixel = ctx.getImageData(x, top, 1, 1).data;
    borderPixels.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
  }

  // 아래쪽 border
  for (let x = left; x <= right; x++) {
    const pixel = ctx.getImageData(x, bottom, 1, 1).data;
    borderPixels.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
  }

  // 왼쪽 border
  for (let y = top; y <= bottom; y++) {
    const pixel = ctx.getImageData(left, y, 1, 1).data;
    borderPixels.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
  }

  // 오른쪽 border
  for (let y = top; y <= bottom; y++) {
    const pixel = ctx.getImageData(right, y, 1, 1).data;
    borderPixels.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
  }

  // 평균 색상
  const avgR = Math.round(borderPixels.reduce((sum, p) => sum + p.r, 0) / borderPixels.length);
  const avgG = Math.round(borderPixels.reduce((sum, p) => sum + p.g, 0) / borderPixels.length);
  const avgB = Math.round(borderPixels.reduce((sum, p) => sum + p.b, 0) / borderPixels.length);

  // 텍스트 영역을 평균 색상으로 채우기
  ctx.fillStyle = `rgb(${avgR}, ${avgG}, ${avgB})`;
  ctx.fillRect(region.x, region.y, region.width, region.height);
}

/**
 * 이미지에서 모든 텍스트 제거
 *
 * 사용법:
 * ```typescript
 * const cleanImage = await removeAllText(originalImage, textRegions);
 * // cleanImage는 텍스트가 제거된 깨끗한 이미지
 * ```
 */
export async function removeAllText(
  image: HTMLImageElement | HTMLCanvasElement,
  regions: (TextRegion | PDFTextRegion)[],
  padding: number = 5
): Promise<HTMLCanvasElement> {
  console.log('[TextRemover] Removing', regions.length, 'text regions');

  // 새 캔버스 생성
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // 원본 이미지 그리기
  if (image instanceof HTMLImageElement) {
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
  } else {
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
  }

  // 각 텍스트 영역 제거
  regions.forEach((region, index) => {
    const cleanRegion = {
      x: Math.max(0, region.position.x - padding),
      y: Math.max(0, region.position.y - padding),
      width: region.size.width + padding * 2,
      height: region.size.height + padding * 2,
    };

    fillWithBackground(ctx, cleanRegion);

    if (index < 3) {
      console.log(`[TextRemover] Removed region ${index}:`, cleanRegion);
    }
  });

  console.log('[TextRemover] ✅ All text removed');

  return canvas;
}

/**
 * Export용: 깨끗한 배경 생성
 */
export async function createCleanBackgroundForExport(
  originalCanvas: HTMLCanvasElement,
  textRegions: (TextRegion | PDFTextRegion)[]
): Promise<HTMLCanvasElement> {
  console.log('[TextRemover] Creating clean background for export');

  return removeAllText(originalCanvas, textRegions, 10);
}
