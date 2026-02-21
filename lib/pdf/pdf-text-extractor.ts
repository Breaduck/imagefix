/**
 * PDF.js 기반 텍스트 추출
 */

'use client';

import { PDFTextItem, PDFTextContent, PDFTextRegion, PDFPageData } from '@/types/pdf.types';
import { mapPDFFont, buildFontFamilyString, extractFontStyle } from './font-mapper';

// Dynamic import for PDF.js (client-side only)
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPDFJS() {
  if (!pdfjsLib && typeof window !== 'undefined') {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
  return pdfjsLib;
}

/**
 * PDF 파일 로드
 */
export async function loadPDF(file: File): Promise<any> {
  const pdfjs = await getPDFJS();
  if (!pdfjs) throw new Error('PDF.js not loaded');

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  return pdf;
}

/**
 * PDF 페이지를 캔버스로 렌더링
 */
export async function renderPDFPage(page: any, scale: number = 2.0): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas context not available');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas;
}

/**
 * PDF 페이지에서 텍스트 내용 추출
 */
export async function extractTextContent(page: any): Promise<PDFTextContent> {
  const textContent = await page.getTextContent();

  return {
    items: textContent.items as PDFTextItem[],
    styles: textContent.styles as Record<string, any>,
  };
}

/**
 * Transform 행렬에서 폰트 크기, 위치, 회전 각도 계산
 * Transform: [a, b, c, d, e, f]
 * - a, d: 스케일 (폰트 크기)
 * - b, c: 회전/기울임
 * - e, f: 위치 (x, y)
 */
function parseTransform(transform: number[]): {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  fontSize: number;
} {
  const [a, b, c, d, e, f] = transform;

  // 위치
  const x = e;
  const y = f;

  // 스케일
  const scaleX = Math.sqrt(a * a + b * b);
  const scaleY = Math.sqrt(c * c + d * d);

  // 회전 각도 (라디안 → 도)
  const rotation = (Math.atan2(b, a) * 180) / Math.PI;

  // 폰트 크기 (scaleY를 주로 사용)
  const fontSize = Math.abs(scaleY);

  return { x, y, scaleX, scaleY, rotation, fontSize };
}

/**
 * PDF TextItem을 TextRegion으로 변환
 */
export function convertPDFTextItemsToRegions(
  textContent: PDFTextContent,
  pageHeight: number
): PDFTextRegion[] {
  const items = textContent.items;

  return items
    .filter((item) => item.str.trim().length > 0)
    .map((item, index) => {
      const { x, y, fontSize, rotation } = parseTransform(item.transform);

      // PDF 좌표계는 좌하단 원점이므로, 캔버스 좌표계(좌상단 원점)로 변환
      const canvasY = pageHeight - y;

      // 폰트 정보 추출 및 매핑
      const fontInfo = mapPDFFont(item.fontName);
      const fontFamilyString = buildFontFamilyString(fontInfo);
      const { weight, style } = extractFontStyle(item.fontName);

      return {
        id: `pdf-text-${index}-${Date.now()}`,
        text: item.str,
        position: {
          x,
          y: canvasY - fontSize, // 텍스트 베이스라인 보정
        },
        size: {
          width: item.width,
          height: item.height || fontSize,
        },
        style: {
          fontSize,
          fontFamily: fontInfo.webFont,
          fontFallbacks: fontInfo.fallbacks,
          color: '#000000', // PDF에서 색상 추출은 복잡하므로 기본값 사용
          rotation,
          transform: item.transform,
        },
        fontInfo,
      };
    });
}

/**
 * PDF 페이지 전체 데이터 추출
 */
export async function extractPDFPageData(
  page: any,
  pageNumber: number,
  scale: number = 2.0
): Promise<PDFPageData> {
  // 1. 페이지 렌더링 (배경 이미지)
  const canvas = await renderPDFPage(page, scale);

  // 2. 텍스트 내용 추출
  const textContent = await extractTextContent(page);

  // 3. Viewport 정보
  const viewport = page.getViewport({ scale });

  // 4. TextRegion 변환
  const textRegions = convertPDFTextItemsToRegions(textContent, viewport.height);

  return {
    pageNumber,
    viewport: {
      width: viewport.width,
      height: viewport.height,
      scale,
    },
    canvas,
    textContent,
    textRegions,
  };
}

/**
 * PDF 파일 전체 페이지 처리
 */
export async function extractAllPDFPages(pdf: any, scale: number = 2.0): Promise<PDFPageData[]> {
  const numPages = pdf.numPages;
  const pages: PDFPageData[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const pageData = await extractPDFPageData(page, i, scale);
    pages.push(pageData);
  }

  return pages;
}
