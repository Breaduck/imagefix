/**
 * 스마트 마스크: 배경색 샘플링으로 자연스러운 텍스트 제거
 */

'use client';

import { fabric } from 'fabric';
import { PDFTextRegion } from '@/types/pdf.types';
import { TextRegion } from '@/types/canvas.types';

interface ColorSample {
  r: number;
  g: number;
  b: number;
}

/**
 * 텍스트 주변 링(ring) 영역에서 배경색 샘플링
 */
function sampleBackgroundColor(
  canvas: HTMLCanvasElement,
  region: { x: number; y: number; width: number; height: number },
  ringWidth: number = 5
): string {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '#ffffff';

  const samples: ColorSample[] = [];

  // 텍스트 박스 주변 링 영역 샘플링
  const padding = 2;
  const innerBox = {
    x: Math.max(0, region.x - padding),
    y: Math.max(0, region.y - padding),
    width: region.width + padding * 2,
    height: region.height + padding * 2,
  };

  const outerBox = {
    x: Math.max(0, region.x - padding - ringWidth),
    y: Math.max(0, region.y - padding - ringWidth),
    width: region.width + (padding + ringWidth) * 2,
    height: region.height + (padding + ringWidth) * 2,
  };

  // 상단 링
  for (let x = outerBox.x; x < outerBox.x + outerBox.width; x += 2) {
    for (let y = outerBox.y; y < innerBox.y; y += 2) {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
    }
  }

  // 하단 링
  for (let x = outerBox.x; x < outerBox.x + outerBox.width; x += 2) {
    for (let y = innerBox.y + innerBox.height; y < outerBox.y + outerBox.height; y += 2) {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
    }
  }

  // 좌측 링
  for (let x = outerBox.x; x < innerBox.x; x += 2) {
    for (let y = innerBox.y; y < innerBox.y + innerBox.height; y += 2) {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
    }
  }

  // 우측 링
  for (let x = innerBox.x + innerBox.width; x < outerBox.x + outerBox.width; x += 2) {
    for (let y = innerBox.y; y < innerBox.y + innerBox.height; y += 2) {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
    }
  }

  if (samples.length === 0) {
    return '#ffffff';
  }

  // Median 색상 계산 (이상치 제거에 유리)
  const medianColor = getMedianColor(samples);

  return `rgb(${medianColor.r}, ${medianColor.g}, ${medianColor.b})`;
}

/**
 * Median 색상 계산
 */
function getMedianColor(samples: ColorSample[]): ColorSample {
  if (samples.length === 0) {
    return { r: 255, g: 255, b: 255 };
  }

  const sortedR = samples.map((s) => s.r).sort((a, b) => a - b);
  const sortedG = samples.map((s) => s.g).sort((a, b) => a - b);
  const sortedB = samples.map((s) => s.b).sort((a, b) => a - b);

  const mid = Math.floor(samples.length / 2);

  return {
    r: sortedR[mid],
    g: sortedG[mid],
    b: sortedB[mid],
  };
}

/**
 * 그라데이션 배경 감지 (간단 버전)
 */
function hasGradientBackground(samples: ColorSample[]): boolean {
  if (samples.length < 10) return false;

  const variance = calculateColorVariance(samples);

  // 분산이 크면 그라데이션/패턴 가능성
  return variance > 1000;
}

/**
 * 색상 분산 계산
 */
function calculateColorVariance(samples: ColorSample[]): number {
  const avgR = samples.reduce((sum, s) => sum + s.r, 0) / samples.length;
  const avgG = samples.reduce((sum, s) => sum + s.g, 0) / samples.length;
  const avgB = samples.reduce((sum, s) => sum + s.b, 0) / samples.length;

  const variance =
    samples.reduce((sum, s) => {
      return sum + Math.pow(s.r - avgR, 2) + Math.pow(s.g - avgG, 2) + Math.pow(s.b - avgB, 2);
    }, 0) / samples.length;

  return variance;
}

/**
 * 스마트 마스크 생성 (배경 이미지 기반)
 */
export function createSmartMask(
  backgroundCanvas: HTMLCanvasElement,
  region: PDFTextRegion | TextRegion,
  options: {
    padding?: number;
    ringWidth?: number;
    useGradient?: boolean;
  } = {}
): fabric.Rect {
  const { padding = 10, ringWidth = 5, useGradient = false } = options;

  const bgColor = sampleBackgroundColor(
    backgroundCanvas,
    {
      x: region.position.x,
      y: region.position.y,
      width: region.size.width,
      height: region.size.height,
    },
    ringWidth
  );

  const mask = new fabric.Rect({
    left: region.position.x - padding,
    top: region.position.y - padding,
    width: region.size.width + padding * 2,
    height: region.size.height + padding * 2,
    fill: bgColor,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    opacity: 1.0,
  });

  console.log('[SmartMask] Created mask:', {
    regionId: region.id,
    text: region.text.substring(0, 20),
    bgColor,
    position: { x: mask.left, y: mask.top },
    size: { width: mask.width, height: mask.height },
  });

  return mask;
}

/**
 * 여러 텍스트 영역에 대한 스마트 마스크 일괄 생성
 */
export function createSmartMasks(
  backgroundCanvas: HTMLCanvasElement,
  regions: (PDFTextRegion | TextRegion)[],
  options?: {
    padding?: number;
    ringWidth?: number;
    useGradient?: boolean;
  }
): fabric.Rect[] {
  console.log('[SmartMask] Creating smart masks for', regions.length, 'regions');

  const masks = regions.map((region) => createSmartMask(backgroundCanvas, region, options));

  console.log('[SmartMask] ✅ Created', masks.length, 'smart masks');

  return masks;
}

/**
 * Export용: 배경 캔버스에서 원본 텍스트를 스마트 마스크로 제거
 */
export async function removeTextWithSmartMask(
  backgroundImage: fabric.Image,
  regions: (PDFTextRegion | TextRegion)[],
  fabricCanvas: fabric.Canvas
): Promise<fabric.Canvas> {
  // 임시 캔버스 생성
  const tempCanvas = new fabric.Canvas(document.createElement('canvas'), {
    width: fabricCanvas.width,
    height: fabricCanvas.height,
  });

  // 배경 이미지 복사
  const bgCopy = await cloneFabricImage(backgroundImage);
  tempCanvas.add(bgCopy);

  // 스마트 마스크 생성 및 추가
  const backgroundCanvasElement = (backgroundImage as any)._element as HTMLCanvasElement;

  if (backgroundCanvasElement) {
    const masks = createSmartMasks(backgroundCanvasElement, regions, { padding: 15 });
    masks.forEach((mask) => tempCanvas.add(mask));
  }

  tempCanvas.renderAll();

  return tempCanvas;
}

/**
 * Fabric.js 이미지 복제 헬퍼
 */
function cloneFabricImage(image: fabric.Image): Promise<fabric.Image> {
  return new Promise((resolve) => {
    image.clone((cloned: fabric.Image) => {
      resolve(cloned);
    });
  });
}
