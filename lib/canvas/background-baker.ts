/**
 * 배경 베이킹: 마스크를 Fabric 오브젝트로 올리지 말고 배경 이미지에 "굽기"
 *
 * Before:
 * - 배경 이미지 (원본 텍스트 포함)
 * - fabric.Rect 마스크 (흰색) ← 히스토리에 저장됨, 레이어 지옥
 * - fabric.IText (새 텍스트)
 *
 * After:
 * - 배경 이미지 (텍스트 영역이 배경색으로 채워짐) ← 1번만!
 * - fabric.IText (새 텍스트)
 *
 * 결과:
 * - 히스토리 로그 폭발 없음
 * - Undo/Redo가 텍스트 편집만 추적
 * - "덮어씌우기" 느낌 사라짐
 */

'use client';

import { PDFTextRegion } from '@/types/pdf.types';
import { TextRegion } from '@/types/canvas.types';

/**
 * 배경 캔버스에 텍스트 제거 영역을 직접 "굽기"
 */
export async function bakeTextMasksToBackground(
  backgroundCanvas: HTMLCanvasElement,
  textRegions: (PDFTextRegion | TextRegion)[],
  options: {
    padding?: number;
    method?: 'simple' | 'smart' | 'inpaint';
  } = {}
): Promise<HTMLCanvasElement> {
  const { method = 'smart' } = options;

  console.log('[BackgroundBaker] 🔥 Baking', textRegions.length, 'text masks to background');
  console.log('[BackgroundBaker] Method:', method);
  console.log('[BackgroundBaker] Canvas size:', {
    width: backgroundCanvas.width,
    height: backgroundCanvas.height,
  });

  // 새 캔버스 생성 (원본은 유지)
  const bakedCanvas = document.createElement('canvas');
  const ctx = bakedCanvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // 원본 복사
  bakedCanvas.width = backgroundCanvas.width;
  bakedCanvas.height = backgroundCanvas.height;
  ctx.drawImage(backgroundCanvas, 0, 0);

  // 각 텍스트 영역을 배경으로 채우기
  for (let i = 0; i < textRegions.length; i++) {
    const region = textRegions[i];

    // fontSize 비례 padding (최소 8px, fontSize의 35%)
    const fontSize = region.style?.fontSize || 16;
    const dynamicPadding = Math.max(8, fontSize * 0.35);
    const padding = options.padding !== undefined ? options.padding : dynamicPadding;

    const bbox = {
      x: Math.max(0, Math.floor(region.position.x - padding)),
      y: Math.max(0, Math.floor(region.position.y - padding)),
      width: Math.ceil(region.size.width + padding * 2),
      height: Math.ceil(region.size.height + padding * 2),
    };

    if (method === 'simple') {
      // 흰색으로 채우기 (가장 빠름)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bbox.x, bbox.y, bbox.width, bbox.height);
    } else if (method === 'smart') {
      // 주변 배경색으로 채우기
      const bgColor = sampleBackgroundColor(backgroundCanvas, bbox);
      ctx.fillStyle = bgColor;
      ctx.fillRect(bbox.x, bbox.y, bbox.width, bbox.height);
    }
    // 'inpaint' 방식은 서버 API 필요 (Phase 2)

    if (i < 3) {
      console.log(`[BackgroundBaker] Baked region ${i}:`, {
        text: region.text.substring(0, 20),
        bbox,
        fontSize,
        padding: padding.toFixed(1),
        method,
      });
    }
  }

  console.log('[BackgroundBaker] ✅ Baking complete');

  return bakedCanvas;
}

/**
 * 주변 배경색 샘플링 (간단 버전)
 */
function sampleBackgroundColor(
  canvas: HTMLCanvasElement,
  region: { x: number; y: number; width: number; height: number }
): string {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '#ffffff';

  const samples: { r: number; g: number; b: number }[] = [];
  const sampleCount = 20; // 샘플 수

  try {
    // 위쪽 border
    const topY = Math.max(0, region.y - 1);
    const step = Math.max(1, Math.floor(region.width / sampleCount));

    for (let x = region.x; x < region.x + region.width; x += step) {
      const pixel = ctx.getImageData(x, topY, 1, 1).data;
      samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
    }

    // 아래쪽 border
    const bottomY = Math.min(canvas.height - 1, region.y + region.height + 1);
    for (let x = region.x; x < region.x + region.width; x += step) {
      const pixel = ctx.getImageData(x, bottomY, 1, 1).data;
      samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
    }

    // 왼쪽 border
    const leftX = Math.max(0, region.x - 1);
    for (let y = region.y; y < region.y + region.height; y += step) {
      const pixel = ctx.getImageData(leftX, y, 1, 1).data;
      samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
    }

    // 오른쪽 border
    const rightX = Math.min(canvas.width - 1, region.x + region.width + 1);
    for (let y = region.y; y < region.y + region.height; y += step) {
      const pixel = ctx.getImageData(rightX, y, 1, 1).data;
      samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
    }

    if (samples.length === 0) {
      return '#ffffff';
    }

    // Median 색상 (이상치 제거)
    samples.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
    const median = samples[Math.floor(samples.length / 2)];

    return `rgb(${Math.round(median.r)}, ${Math.round(median.g)}, ${Math.round(median.b)})`;
  } catch (error) {
    console.error('[BackgroundBaker] Error sampling background:', error);
    return '#ffffff';
  }
}

/**
 * Fabric.js 배경 이미지로 설정
 */
export async function setBackgroundFromCanvas(
  fabricCanvas: fabric.Canvas,
  bakedCanvas: HTMLCanvasElement
): Promise<void> {
  return new Promise((resolve, reject) => {
    const dataUrl = bakedCanvas.toDataURL();

    fabricCanvas.setBackgroundImage(
      dataUrl,
      () => {
        fabricCanvas.renderAll();
        console.log('[BackgroundBaker] Background image set');
        resolve();
      },
      {
        crossOrigin: 'anonymous',
      }
    );
  });
}
