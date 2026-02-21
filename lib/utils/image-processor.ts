/**
 * 이미지 전처리 유틸리티
 */

/**
 * 이미지 리사이즈
 */
export function resizeImage(
  image: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  let width = image.width;
  let height = image.height;

  // 비율 유지하며 리사이즈
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  return canvas;
}

/**
 * 이미지 대비 향상
 */
export function enhanceContrast(canvas: HTMLCanvasElement, factor: number = 1.2): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const contrastFactor = (259 * (factor + 255)) / (255 * (259 - factor));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = contrastFactor * (data[i] - 128) + 128; // Red
    data[i + 1] = contrastFactor * (data[i + 1] - 128) + 128; // Green
    data[i + 2] = contrastFactor * (data[i + 2] - 128) + 128; // Blue
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * 이미지를 그레이스케일로 변환
 */
export function convertToGrayscale(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = avg; // Red
    data[i + 1] = avg; // Green
    data[i + 2] = avg; // Blue
  }

  ctx.putImageData(imageData, 0, 0);
}
