/**
 * 폰트 크기 계산 로직
 */

import { BoundingBox } from '@/types/ocr.types';

/**
 * 바운딩 박스 높이로 폰트 크기 추정
 */
export function calculateFontSize(bbox: BoundingBox, imageScale: number = 1): number {
  const bboxHeight = bbox.y1 - bbox.y0;

  // 픽셀 높이를 폰트 포인트로 변환
  // 일반적으로 1pt ≈ 1.333px (96 DPI 기준)
  const pixelToPt = 0.75;
  let fontSize = (bboxHeight * pixelToPt) / imageScale;

  // 일반적인 폰트 크기로 반올림
  const commonSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];
  fontSize = commonSizes.reduce((prev, curr) =>
    Math.abs(curr - fontSize) < Math.abs(prev - fontSize) ? curr : prev
  );

  return fontSize;
}

/**
 * 폰트 크기를 바운딩 박스 높이로 변환
 */
export function fontSizeToPixelHeight(fontSize: number, imageScale: number = 1): number {
  const ptToPixel = 1.333;
  return fontSize * ptToPixel * imageScale;
}

/**
 * 여러 바운딩 박스의 평균 폰트 크기 계산
 */
export function calculateAverageFontSize(bboxes: BoundingBox[], imageScale: number = 1): number {
  if (bboxes.length === 0) return 12;

  const sizes = bboxes.map((bbox) => calculateFontSize(bbox, imageScale));
  const avgSize = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;

  return Math.round(avgSize);
}
