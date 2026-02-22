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

/**
 * "진짜 편집" Export: 원본 텍스트를 완전히 제거한 배경 + 새 텍스트
 *
 * 사용법:
 * ```typescript
 * import { exportWithCleanBackground } from '@/lib/export/image-exporter';
 *
 * const dataUrl = await exportWithCleanBackground(
 *   fabricCanvas,
 *   originalBackgroundImage,
 *   textRegions
 * );
 * ```
 */
export async function exportWithCleanBackground(
  canvas: fabric.Canvas,
  originalBackground: HTMLCanvasElement,
  textRegions: any[],
  options: ExportOptions = { format: 'png', quality: 1.0, scale: 1 }
): Promise<string> {
  console.log('[Export] Creating clean background export');

  // 동적 import (text-remover가 클라이언트 전용)
  const { removeAllText } = await import('@/lib/image/text-remover');

  // 1. 원본 배경에서 텍스트 제거
  const cleanBackground = await removeAllText(originalBackground, textRegions);
  console.log('[Export] Text removed from background');

  // 2. 임시 캔버스 생성
  const tempCanvas = new fabric.Canvas(document.createElement('canvas'), {
    width: canvas.width,
    height: canvas.height,
  });

  // 3. 깨끗한 배경 추가
  const bgImage = await new Promise<fabric.Image>((resolve) => {
    fabric.Image.fromURL(
      cleanBackground.toDataURL(),
      (img) => {
        img.set({
          left: 0,
          top: 0,
          selectable: false,
          evented: false,
        });
        resolve(img);
      },
      { crossOrigin: 'anonymous' }
    );
  });

  tempCanvas.add(bgImage);

  // 4. 텍스트 객체만 복사
  const textObjects = canvas.getObjects().filter((obj: any) => {
    return obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox';
  });

  for (const textObj of textObjects) {
    const cloned = await new Promise<fabric.Object>((resolve) => {
      textObj.clone((clonedObj: fabric.Object) => {
        resolve(clonedObj);
      });
    });
    tempCanvas.add(cloned);
  }

  tempCanvas.renderAll();

  // 5. Export
  const dataUrl = tempCanvas.toDataURL({
    format: options.format,
    quality: options.quality,
    multiplier: options.scale,
  });

  // 6. 임시 캔버스 정리
  tempCanvas.dispose();

  console.log('[Export] ✅ Clean background export complete');

  return dataUrl;
}
