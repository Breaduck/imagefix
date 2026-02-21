/**
 * 이미지 내보내기 유틸리티
 */

'use client';

import { fabric } from 'fabric';
import { ExportOptions } from '@/types/editor.types';

/**
 * 캔버스를 이미지로 내보내기
 */
export function exportCanvasAsImage(
  canvas: fabric.Canvas,
  options: ExportOptions = { format: 'png', quality: 1.0, scale: 1 }
): string {
  const dataUrl = canvas.toDataURL({
    format: options.format,
    quality: options.quality,
    multiplier: options.scale,
  });

  return dataUrl;
}

/**
 * 이미지 다운로드
 */
export function downloadImage(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 캔버스를 이미지로 내보내고 다운로드
 */
export function exportAndDownload(
  canvas: fabric.Canvas,
  filename: string,
  options: ExportOptions = { format: 'png', quality: 1.0, scale: 1 }
): void {
  const dataUrl = exportCanvasAsImage(canvas, options);
  downloadImage(dataUrl, filename);
}

/**
 * 파일명 생성 (타임스탬프 포함)
 */
export function generateFilename(prefix: string = 'edited-image', format: 'png' | 'jpeg'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const extension = format === 'jpeg' ? 'jpg' : format;
  return `${prefix}-${timestamp}.${extension}`;
}
