/**
 * 텍스트 객체 렌더링
 */

'use client';

import { fabric } from 'fabric';
import { TextRegion } from '@/types/canvas.types';
import { LayerName, LayerIndex, setLayerInfo } from './layer-manager';

/**
 * 텍스트 영역을 Fabric.js IText 객체로 변환 (편집 가능)
 */
export function createTextObject(region: TextRegion): fabric.IText {
  const text = new fabric.IText(region.text, {
    left: region.position.x,
    top: region.position.y,
    fontSize: region.style.fontSize,
    fontFamily: region.style.fontFamily,
    fill: region.style.color,
    angle: region.style.rotation,
    textAlign: region.style.align,
    lineHeight: region.style.lineHeight,
    fontWeight: region.style.fontWeight || 'normal',
    fontStyle: region.style.fontStyle || 'normal',
    underline: region.style.underline || false,
    selectable: true,
    editable: true, // 더블클릭으로 텍스트 편집 가능
    hasControls: true,
    hasBorders: true,
    lockRotation: false,
  });

  // 레이어 정보 설정
  setLayerInfo(text, LayerName.EDITABLE_TEXT, LayerIndex.EDITABLE_TEXT);

  // ID 저장
  (text as any).regionId = region.id;

  return text;
}

/**
 * 배경 마스크 생성 (텍스트 영역 덮기)
 */
export function createBackgroundMask(
  region: TextRegion,
  backgroundColor: string = '#ffffff'
): fabric.Rect {
  // 마스크 패딩을 매우 크게 설정 (원본 텍스트를 완전히 덮기 위해)
  // 폰트 크기의 150% + bbox 크기의 20%를 패딩으로 사용
  const fontSizePadding = region.style.fontSize * 1.5; // 폰트 크기의 150%
  const bboxPadding = Math.max(region.size.width, region.size.height) * 0.2; // bbox의 20%
  const padding = Math.max(fontSizePadding, bboxPadding, 15); // 최소 15px

  const mask = new fabric.Rect({
    left: region.position.x - padding,
    top: region.position.y - padding,
    width: region.size.width + padding * 2,
    height: region.size.height + padding * 2,
    fill: backgroundColor,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    opacity: 1.0, // 완전 불투명
  });

  console.log('[TextRenderer] Creating mask:', {
    regionId: region.id,
    text: region.text.substring(0, 20),
    originalPosition: region.position,
    originalSize: region.size,
    padding: padding,
    maskPosition: { x: mask.left, y: mask.top },
    maskSize: { width: mask.width, height: mask.height },
    backgroundColor: backgroundColor,
    opacity: mask.opacity,
  });

  // 레이어 정보 설정
  setLayerInfo(mask, LayerName.BACKGROUND_MASK, LayerIndex.BACKGROUND_MASKS);

  // ID 저장
  (mask as any).regionId = region.id;

  return mask;
}

/**
 * 텍스트 영역에 대한 마스크 + 텍스트 객체 생성
 */
export function renderTextRegion(
  canvas: fabric.Canvas,
  region: TextRegion,
  backgroundColor: string = '#ffffff'
): { mask: fabric.Rect; text: fabric.IText } {
  // 배경 마스크 생성 및 추가
  const mask = createBackgroundMask(region, backgroundColor);
  canvas.add(mask);

  // 텍스트 객체 생성 및 추가
  const text = createTextObject(region);
  canvas.add(text);

  // 레이어 재정렬
  canvas.sendToBack(mask);
  canvas.bringToFront(text);

  return { mask, text };
}

/**
 * 여러 텍스트 영역 렌더링
 */
export function renderTextRegions(
  canvas: fabric.Canvas,
  regions: TextRegion[],
  backgroundColor: string = '#ffffff'
): Array<{ mask: fabric.Rect; text: fabric.IText }> {
  return regions.map((region) => renderTextRegion(canvas, region, backgroundColor));
}

/**
 * 텍스트 스타일 업데이트
 */
export function updateTextStyle(
  text: fabric.IText,
  style: Partial<{
    fontSize: number;
    color: string;
    rotation: number;
    fontFamily: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    underline: boolean;
  }>
): void {
  if (style.fontSize !== undefined) {
    text.set({ fontSize: style.fontSize });
  }
  if (style.color !== undefined) {
    text.set({ fill: style.color });
  }
  if (style.rotation !== undefined) {
    text.set({ angle: style.rotation });
  }
  if (style.fontFamily !== undefined) {
    text.set({ fontFamily: style.fontFamily });
  }
  if (style.fontWeight !== undefined) {
    text.set({ fontWeight: style.fontWeight });
  }
  if (style.fontStyle !== undefined) {
    text.set({ fontStyle: style.fontStyle });
  }
  if (style.underline !== undefined) {
    text.set({ underline: style.underline });
  }

  text.canvas?.renderAll();
}
