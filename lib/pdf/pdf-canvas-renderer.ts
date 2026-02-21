/**
 * PDF TextRegion을 Fabric.js 캔버스로 렌더링
 */

'use client';

import { fabric } from 'fabric';
import { PDFTextRegion } from '@/types/pdf.types';
import { buildFontFamilyString } from './font-mapper';
import { LayerName, LayerIndex, setLayerInfo } from '@/lib/canvas/layer-manager';

/**
 * PDF TextRegion을 Fabric.js Text 객체로 변환
 */
export function createTextObjectFromPDF(region: PDFTextRegion): fabric.Text {
  const fontFamilyString = buildFontFamilyString(region.fontInfo);

  const text = new fabric.Text(region.text, {
    left: region.position.x,
    top: region.position.y,
    fontSize: region.style.fontSize,
    fontFamily: fontFamilyString, // 폰트 fallback 체인
    fill: region.style.color,
    angle: region.style.rotation,
    selectable: true,
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
): fabric.Text[] {
  const textObjects: fabric.Text[] = [];

  regions.forEach((region) => {
    const text = createTextObjectFromPDF(region);
    canvas.add(text);
    textObjects.push(text);
  });

  canvas.renderAll();

  return textObjects;
}

/**
 * PDF 페이지 캔버스를 배경 이미지로 추가
 */
export function addPDFPageAsBackground(
  canvas: fabric.Canvas,
  pdfCanvas: HTMLCanvasElement
): Promise<fabric.Image> {
  return new Promise((resolve, reject) => {
    const dataUrl = pdfCanvas.toDataURL();

    fabric.Image.fromURL(
      dataUrl,
      (img) => {
        if (!img) {
          reject(new Error('Failed to load PDF page image'));
          return;
        }

        img.set({
          left: 0,
          top: 0,
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
        });

        setLayerInfo(img, LayerName.BACKGROUND_IMAGE, LayerIndex.BACKGROUND_IMAGE);

        canvas.add(img);
        canvas.sendToBack(img);
        canvas.renderAll();

        resolve(img);
      },
      { crossOrigin: 'anonymous' }
    );
  });
}
