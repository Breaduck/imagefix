/**
 * PDF.js 기반 텍스트 추출
 */

'use client';

import { PDFTextItem, PDFTextContent, PDFTextRegion, PDFPageData } from '@/types/pdf.types';
import { mapPDFFont, buildFontFamilyString, extractFontStyle } from './font-mapper';
import { mergePDFTextItems } from './line-merger';

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
 * PDF 텍스트 레이어 품질 검증
 */
export function isTextLayerUsable(items: PDFTextItem[]): {
  usable: boolean;
  reason?: string;
  stats: {
    totalItems: number;
    nonEmptyItems: number;
    totalChars: number;
    whitespaceRatio: number;
  };
} {
  const nonEmpty = items.filter((item) => item.str.trim().length > 0);
  const totalChars = nonEmpty.reduce((sum, item) => sum + item.str.length, 0);
  const nonWhitespaceChars = nonEmpty.reduce(
    (sum, item) => sum + item.str.replace(/\s/g, '').length,
    0
  );
  const whitespaceRatio = totalChars > 0 ? 1 - nonWhitespaceChars / totalChars : 1;

  const stats = {
    totalItems: items.length,
    nonEmptyItems: nonEmpty.length,
    totalChars,
    whitespaceRatio,
  };

  // 조건 1: 텍스트 아이템이 없음
  if (nonEmpty.length === 0) {
    return { usable: false, reason: 'No text items found', stats };
  }

  // 조건 2: 80% 이상이 공백
  if (whitespaceRatio > 0.8) {
    return { usable: false, reason: 'Text is mostly whitespace (>80%)', stats };
  }

  // 조건 3: 총 문자 수가 너무 적음 (페이지당 10자 미만)
  if (totalChars < 10) {
    return { usable: false, reason: 'Too few characters (<10)', stats };
  }

  return { usable: true, stats };
}

/**
 * PDF TextItem을 TextRegion으로 변환 (줄 단위 병합 적용)
 */
export function convertPDFTextItemsToRegions(
  textContent: PDFTextContent,
  pageHeight: number
): PDFTextRegion[] {
  const items = textContent.items;

  console.log('[PDF Extractor] 📄 Total items from PDF:', items.length);

  const filtered = items.filter((item) => item.str.trim().length > 0);
  console.log('[PDF Extractor] ✂️ Items after filtering:', filtered.length);

  if (filtered.length > 0) {
    console.log('[PDF Extractor] 📝 Sample items:', filtered.slice(0, 3).map(i => ({
      text: i.str,
      transform: i.transform,
      fontName: i.fontName
    })));
  }

  // 🔥 핵심: 줄 단위 병합 적용
  console.log('[PDF Extractor] 🚀 Starting line merge...');
  const mergedRegions = mergePDFTextItems(filtered, pageHeight);

  console.log('[PDF Extractor] ✨ Line merge complete:', {
    before: filtered.length,
    after: mergedRegions.length,
    reduction: `${filtered.length - mergedRegions.length} items merged`,
    compressionRatio: filtered.length > 0
      ? `${((1 - mergedRegions.length / filtered.length) * 100).toFixed(1)}%`
      : 'N/A'
  });

  return mergedRegions;
}

/**
 * PDF 페이지 전체 데이터 추출
 */
export async function extractPDFPageData(
  page: any,
  pageNumber: number,
  totalPages: number,
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
    totalPages,
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
    const pageData = await extractPDFPageData(page, i, numPages, scale);
    pages.push(pageData);
  }

  return pages;
}
