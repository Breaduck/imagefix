/**
 * Fabric.js 캔버스 유틸리티 함수
 */

'use client';

import { fabric } from 'fabric';

/**
 * Fabric.js 캔버스 초기화
 */
export function initCanvas(
  canvasElement: HTMLCanvasElement,
  width: number,
  height: number
): fabric.Canvas {
  const canvas = new fabric.Canvas(canvasElement, {
    width,
    height,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: true,
  });

  return canvas;
}

/**
 * 캔버스에 이미지 추가 (레이어 0)
 */
export async function addBackgroundImage(
  canvas: fabric.Canvas,
  imageUrl: string
): Promise<fabric.Image> {
  return new Promise((resolve, reject) => {
    fabric.Image.fromURL(
      imageUrl,
      (img) => {
        if (!img) {
          reject(new Error('Failed to load image'));
          return;
        }

        // 캔버스 크기에 맞게 이미지 스케일 조정
        img.scaleToWidth(canvas.width!);
        img.scaleToHeight(canvas.height!);
        img.set({
          left: 0,
          top: 0,
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
        });

        canvas.add(img);
        canvas.sendToBack(img);
        canvas.renderAll();

        resolve(img);
      },
      { crossOrigin: 'anonymous' }
    );
  });
}

/**
 * 캔버스 크기 조정
 */
export function resizeCanvas(canvas: fabric.Canvas, width: number, height: number): void {
  canvas.setWidth(width);
  canvas.setHeight(height);
  canvas.renderAll();
}

/**
 * 캔버스 초기화 (모든 객체 제거)
 */
export function clearCanvas(canvas: fabric.Canvas): void {
  canvas.clear();
  canvas.backgroundColor = '#ffffff';
  canvas.renderAll();
}

/**
 * 특정 레이어의 객체만 제거
 */
export function clearLayer(canvas: fabric.Canvas, layerName: string): void {
  const objects = canvas.getObjects().filter((obj: any) => obj.layerName === layerName);
  objects.forEach((obj) => canvas.remove(obj));
  canvas.renderAll();
}

/**
 * Z-index 기반 레이어 정렬
 */
export function sortObjectsByLayer(canvas: fabric.Canvas): void {
  const objects = canvas.getObjects();
  objects.sort((a: any, b: any) => {
    const layerA = a.layerIndex || 0;
    const layerB = b.layerIndex || 0;
    return layerA - layerB;
  });

  objects.forEach((obj) => {
    canvas.bringToFront(obj);
  });

  canvas.renderAll();
}

/**
 * 캔버스를 이미지로 내보내기
 */
export function exportCanvasToImage(
  canvas: fabric.Canvas,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 1.0
): string {
  return canvas.toDataURL({
    format,
    quality,
    multiplier: 1,
  });
}

/**
 * 캔버스를 Blob으로 내보내기
 */
export function exportCanvasToBlob(
  canvas: fabric.Canvas,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 1.0
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const dataUrl = canvas.toDataURL({
      format,
      quality,
      multiplier: 1,
    });

    fetch(dataUrl)
      .then((res) => res.blob())
      .then(resolve)
      .catch(reject);
  });
}
