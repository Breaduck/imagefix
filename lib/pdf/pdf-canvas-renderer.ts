/**
 * PDF TextRegion을 Fabric.js 캔버스로 렌더링
 */

'use client';

import { fabric } from 'fabric';
import { PDFTextRegion } from '@/types/pdf.types';
import { buildFontFamilyString } from './font-mapper';
import { LayerName, LayerIndex, setLayerInfo } from '@/lib/canvas/layer-manager';
import { bakeTextMasksToBackground, setBackgroundFromCanvas } from '@/lib/canvas/background-baker';

/**
 * PDF TextRegion을 Fabric.js IText 객체로 변환 (편집 가능)
 */
export function createTextObjectFromPDF(region: PDFTextRegion): fabric.IText {
  const fontFamilyString = buildFontFamilyString(region.fontInfo);

  const text = new fabric.IText(region.text, {
    left: region.position.x,
    top: region.position.y,
    fontSize: region.style.fontSize,
    fontFamily: fontFamilyString, // 폰트 fallback 체인
    fill: region.style.color,
    angle: region.style.rotation,
    selectable: true,
    editable: true, // 더블클릭으로 텍스트 편집 가능
    hasControls: true,
    hasBorders: true,
  });

  // 레이어 정보 설정
  setLayerInfo(text, LayerName.EDITABLE_TEXT, LayerIndex.EDITABLE_TEXT);

  // PDF 고유 정보 저장
  (text as any).pdfRegionId = region.id;
  (text as any).pdfFontInfo = region.fontInfo;

  return text;
}

/**
 * 여러 PDF TextRegion을 캔버스에 렌더링
 */
export function renderPDFTextRegions(
  canvas: fabric.Canvas,
  regions: PDFTextRegion[]
): fabric.IText[] {
  const textObjects: fabric.IText[] = [];

  regions.forEach((region) => {
    const text = createTextObjectFromPDF(region);
    canvas.add(text);
    textObjects.push(text);
  });

  canvas.renderAll();

  return textObjects;
}

/**
 * PDF 페이지 캔버스를 배경 이미지로 추가 (텍스트 제거 포함)
 */
export async function addPDFPageAsBackground(
  canvas: fabric.Canvas,
  pdfCanvas: HTMLCanvasElement,
  textRegions?: PDFTextRegion[]
): Promise<void> {
  // Canvas 유효성 확인
  if (!canvas || !canvas.getElement()) {
    throw new Error('Canvas is not available or has been disposed');
  }

  console.log('[PDF Renderer] Adding PDF background, text regions:', textRegions?.length || 0);

  let finalCanvas = pdfCanvas;

  // 텍스트 영역이 있으면 background baking 적용
  if (textRegions && textRegions.length > 0) {
    console.log('[PDF Renderer] 🔥 Baking text masks to remove original text');
    finalCanvas = await bakeTextMasksToBackground(pdfCanvas, textRegions, {
      method: 'smart'
    });
    console.log('[PDF Renderer] ✅ Background baked');
  }

  // canvas.backgroundImage로 설정 (canvas.add 사용 안 함!)
  await setBackgroundFromCanvas(canvas, finalCanvas);
  console.log('[PDF Renderer] Background set as canvas.backgroundImage');
}
