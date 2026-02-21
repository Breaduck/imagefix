/**
 * 좌표 변환 유틸리티
 */

/**
 * 원본 이미지 좌표를 캔버스 좌표로 변환
 */
export function imageToCanvasCoordinates(
  imageX: number,
  imageY: number,
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const scaleX = canvasWidth / imageWidth;
  const scaleY = canvasHeight / imageHeight;

  return {
    x: imageX * scaleX,
    y: imageY * scaleY,
  };
}

/**
 * 캔버스 좌표를 원본 이미지 좌표로 변환
 */
export function canvasToImageCoordinates(
  canvasX: number,
  canvasY: number,
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const scaleX = imageWidth / canvasWidth;
  const scaleY = imageHeight / canvasHeight;

  return {
    x: canvasX * scaleX,
    y: canvasY * scaleY,
  };
}

/**
 * 크기 변환 (이미지 → 캔버스)
 */
export function scaleSize(
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { width: number; height: number } {
  const scaleX = canvasWidth / imageWidth;
  const scaleY = canvasHeight / imageHeight;

  return {
    width: width * scaleX,
    height: height * scaleY,
  };
}

/**
 * 스케일 비율 계산
 */
export function calculateScale(
  imageWidth: number,
  imageHeight: number,
  maxWidth: number,
  maxHeight: number
): number {
  const scaleX = maxWidth / imageWidth;
  const scaleY = maxHeight / imageHeight;

  return Math.min(scaleX, scaleY, 1); // 1을 초과하지 않음 (확대 방지)
}
