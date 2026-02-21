/**
 * 텍스트 색상 추출 알고리즘
 */

'use client';

import { BoundingBox } from '@/types/ocr.types';

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * RGB를 HEX로 변환
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * HEX를 RGB로 변환
 */
export function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * 밝기 계산
 */
function getBrightness(rgb: RGB): number {
  return (rgb.r + rgb.g + rgb.b) / 3;
}

/**
 * 색상이 배경색인지 판단
 */
function isBackgroundColor(rgb: RGB): boolean {
  const brightness = getBrightness(rgb);
  // 매우 밝거나 (>235) 매우 어두운 (<20) 색상은 배경으로 간주
  return brightness > 235 || brightness < 20;
}

/**
 * 이미지에서 바운딩 박스 영역의 픽셀 데이터 추출
 */
export function getPixelsInBBox(imageElement: HTMLImageElement, bbox: BoundingBox): RGB[] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  canvas.width = imageElement.width;
  canvas.height = imageElement.height;
  ctx.drawImage(imageElement, 0, 0);

  const x = Math.max(0, Math.floor(bbox.x0));
  const y = Math.max(0, Math.floor(bbox.y0));
  const width = Math.min(canvas.width - x, Math.ceil(bbox.x1 - bbox.x0));
  const height = Math.min(canvas.height - y, Math.ceil(bbox.y1 - bbox.y0));

  const imageData = ctx.getImageData(x, y, width, height);
  const pixels: RGB[] = [];

  for (let i = 0; i < imageData.data.length; i += 4) {
    pixels.push({
      r: imageData.data[i],
      g: imageData.data[i + 1],
      b: imageData.data[i + 2],
    });
  }

  return pixels;
}

/**
 * 색상 배열에서 가장 많이 나타나는 색상 찾기
 */
function getMostCommonColor(colors: RGB[]): RGB {
  const colorCounts = new Map<string, { color: RGB; count: number }>();

  colors.forEach((color) => {
    const key = `${color.r},${color.g},${color.b}`;
    const existing = colorCounts.get(key);

    if (existing) {
      existing.count++;
    } else {
      colorCounts.set(key, { color, count: 1 });
    }
  });

  let maxCount = 0;
  let mostCommon: RGB = { r: 0, g: 0, b: 0 };

  colorCounts.forEach(({ color, count }) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = color;
    }
  });

  return mostCommon;
}

/**
 * 바운딩 박스에서 지배적인 텍스트 색상 추출
 */
export function extractDominantColor(imageElement: HTMLImageElement, bbox: BoundingBox): string {
  try {
    const pixels = getPixelsInBBox(imageElement, bbox);

    // 배경색 제거
    const textPixels = pixels.filter((pixel) => !isBackgroundColor(pixel));

    if (textPixels.length === 0) {
      // 배경색만 있으면 기본 검은색 반환
      return '#000000';
    }

    // 가장 많이 나타나는 색상 찾기
    const dominantColor = getMostCommonColor(textPixels);

    return rgbToHex(dominantColor);
  } catch (error) {
    console.error('Error extracting color:', error);
    return '#000000'; // 에러 시 기본 검은색
  }
}

/**
 * 바운딩 박스 주변의 배경색 추출
 */
export function extractBackgroundColor(
  imageElement: HTMLImageElement,
  bbox: BoundingBox,
  padding: number = 5
): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return '#ffffff';
    }

    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0);

    // 바운딩 박스 주변 영역의 픽셀 샘플링
    const samples: RGB[] = [];

    // 상단
    const topY = Math.max(0, bbox.y0 - padding);
    for (let x = bbox.x0; x < bbox.x1; x += 2) {
      const pixel = ctx.getImageData(x, topY, 1, 1).data;
      samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
    }

    // 하단
    const bottomY = Math.min(canvas.height - 1, bbox.y1 + padding);
    for (let x = bbox.x0; x < bbox.x1; x += 2) {
      const pixel = ctx.getImageData(x, bottomY, 1, 1).data;
      samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
    }

    if (samples.length === 0) {
      return '#ffffff';
    }

    // 평균 색상 계산
    const avgColor: RGB = {
      r: samples.reduce((sum, c) => sum + c.r, 0) / samples.length,
      g: samples.reduce((sum, c) => sum + c.g, 0) / samples.length,
      b: samples.reduce((sum, c) => sum + c.b, 0) / samples.length,
    };

    return rgbToHex(avgColor);
  } catch (error) {
    console.error('Error extracting background color:', error);
    return '#ffffff';
  }
}
