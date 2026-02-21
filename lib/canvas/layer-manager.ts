/**
 * 캔버스 레이어 관리
 */

'use client';

import { fabric } from 'fabric';

export enum LayerIndex {
  BACKGROUND_IMAGE = 0,
  BACKGROUND_MASKS = 1,
  EDITABLE_TEXT = 2,
}

export enum LayerName {
  BACKGROUND_IMAGE = 'background-image',
  BACKGROUND_MASK = 'background-mask',
  EDITABLE_TEXT = 'editable-text',
}

/**
 * 객체에 레이어 정보 설정
 */
export function setLayerInfo(
  obj: fabric.Object,
  layerName: LayerName,
  layerIndex: LayerIndex
): void {
  (obj as any).layerName = layerName;
  (obj as any).layerIndex = layerIndex;
}

/**
 * 레이어별 객체 가져오기
 */
export function getObjectsByLayer(canvas: fabric.Canvas, layerName: LayerName): fabric.Object[] {
  return canvas.getObjects().filter((obj: any) => obj.layerName === layerName);
}

/**
 * 모든 레이어 재정렬
 */
export function reorderLayers(canvas: fabric.Canvas): void {
  const objects = canvas.getObjects();

  // 레이어 인덱스로 정렬
  objects.sort((a: any, b: any) => {
    const layerA = a.layerIndex ?? 999;
    const layerB = b.layerIndex ?? 999;
    return layerA - layerB;
  });

  // 순서대로 다시 추가
  canvas.clear();
  objects.forEach((obj) => canvas.add(obj));
  canvas.renderAll();
}

/**
 * 특정 레이어의 모든 객체 제거
 */
export function removeLayer(canvas: fabric.Canvas, layerName: LayerName): void {
  const objects = getObjectsByLayer(canvas, layerName);
  objects.forEach((obj) => canvas.remove(obj));
  canvas.renderAll();
}

/**
 * 레이어 표시/숨김
 */
export function toggleLayerVisibility(
  canvas: fabric.Canvas,
  layerName: LayerName,
  visible: boolean
): void {
  const objects = getObjectsByLayer(canvas, layerName);
  objects.forEach((obj) => {
    obj.set({ visible });
  });
  canvas.renderAll();
}
