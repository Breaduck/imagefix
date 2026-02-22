/**
 * 텍스트 영역 감지 및 분석
 */

import { OCRResult, BoundingBox } from '@/types/ocr.types';
import { TextRegion } from '@/types/canvas.types';

/**
 * OCR 결과를 TextRegion으로 변환
 */
export function convertOCRResultsToTextRegions(
  ocrResults: OCRResult[],
  imageWidth: number,
  imageHeight: number
): TextRegion[] {
  return ocrResults.map((result, index) => {
    const bbox = result.bbox;

    return {
      id: `text-${index}-${Date.now()}`,
      text: result.text,
      position: {
        x: bbox.x0,
        y: bbox.y0,
      },
      size: {
        width: bbox.x1 - bbox.x0,
        height: bbox.y1 - bbox.y0,
      },
      style: {
        fontSize: estimateFontSize(bbox, imageHeight),
        fontFamily: 'Pretendard',
        color: '#000000', // 나중에 색상 추출로 대체
        rotation: estimateRotation(result.baseline),
        align: 'left',
        lineHeight: 1.2,
        fontWeight: 'normal',
        fontStyle: 'normal',
        underline: false,
      },
      confidence: result.confidence,
    };
  });
}

/**
 * 바운딩 박스 높이로 폰트 크기 추정
 */
function estimateFontSize(bbox: BoundingBox, imageHeight: number): number {
  const bboxHeight = bbox.y1 - bbox.y0;

  // Tesseract의 bbox 높이는 실제 텍스트 높이와 거의 일치
  // 하지만 폰트는 보통 bbox보다 약간 작으므로 1.1을 곱해서 보정
  // 이렇게 하면 텍스트가 bbox를 완전히 채우게 됨
  const adjustmentFactor = 1.1;
  let fontSize = bboxHeight * adjustmentFactor;

  // 최소 폰트 크기 제한
  if (fontSize < 8) fontSize = 8;

  console.log(`[FontSize] bbox height: ${bboxHeight}px → fontSize: ${Math.round(fontSize)}px`);

  return Math.round(fontSize);
}

/**
 * 베이스라인으로 텍스트 회전 각도 추정
 */
function estimateRotation(baseline: { x0: number; y0: number; x1: number; y1: number }): number {
  const dx = baseline.x1 - baseline.x0;
  const dy = baseline.y1 - baseline.y0;

  // 라디안을 도(degree)로 변환
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // 각도 정규화 (-180 ~ 180)
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;

  // 작은 각도는 0으로 처리 (오차 범위)
  if (Math.abs(angle) < 2) angle = 0;

  return angle;
}

/**
 * 신뢰도 임계값 필터링
 */
export function filterByConfidence(
  textRegions: TextRegion[],
  minConfidence: number = 60
): TextRegion[] {
  return textRegions.filter((region) => region.confidence >= minConfidence);
}

/**
 * 텍스트 영역 병합 (가까운 영역을 하나로)
 */
export function mergeNearbyRegions(
  textRegions: TextRegion[],
  threshold: number = 10
): TextRegion[] {
  // 간단한 구현: 나중에 필요시 개선
  // TODO: 같은 라인에 있는 텍스트 영역을 하나로 병합
  return textRegions;
}

/**
 * 텍스트 영역 정렬 (위에서 아래, 왼쪽에서 오른쪽)
 */
export function sortTextRegions(textRegions: TextRegion[]): TextRegion[] {
  return [...textRegions].sort((a, b) => {
    // 먼저 Y 좌표로 정렬 (위에서 아래)
    const yDiff = a.position.y - b.position.y;
    if (Math.abs(yDiff) > 10) {
      // 10px 이상 차이나면 다른 줄로 간주
      return yDiff;
    }
    // 같은 줄이면 X 좌표로 정렬 (왼쪽에서 오른쪽)
    return a.position.x - b.position.x;
  });
}
