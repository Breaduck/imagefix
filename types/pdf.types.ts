/**
 * PDF 관련 타입 정의
 */

export interface PDFTextItem {
  str: string; // 텍스트 내용
  dir: string; // 텍스트 방향 (ltr, rtl)
  width: number; // 텍스트 너비
  height: number; // 텍스트 높이
  transform: number[]; // 변환 행렬 [a, b, c, d, e, f]
  fontName: string; // 폰트명 (subset prefix 포함 가능)
  hasEOL: boolean; // 줄 끝 여부
}

export interface PDFTextContent {
  items: PDFTextItem[];
  styles: Record<string, PDFFontStyle>;
}

export interface PDFFontStyle {
  fontFamily: string;
  ascent: number;
  descent: number;
  vertical: boolean;
}

export interface NormalizedFont {
  originalName: string; // PDF에서 추출된 원본 폰트명
  cleanName: string; // subset prefix 제거한 이름
  webFont: string; // 실제 사용할 웹폰트명
  fallbacks: string[]; // 대체 폰트 목록
}

export interface PDFTextRegion {
  id: string;
  text: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    fontSize: number;
    fontFamily: string;
    fontFallbacks: string[];
    color: string;
    rotation: number;
    transform: number[];
  };
  fontInfo: NormalizedFont;
}

export interface PDFPageData {
  pageNumber: number;
  viewport: {
    width: number;
    height: number;
    scale: number;
  };
  canvas: HTMLCanvasElement;
  textContent: PDFTextContent;
  textRegions: PDFTextRegion[];
}
