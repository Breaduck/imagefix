/**
 * PDF 폰트 매핑 및 정규화
 */

import { NormalizedFont } from '@/types/pdf.types';

/**
 * PDF subset prefix 제거
 * 예: "ABCDEF+NotoSansKR-Regular" → "NotoSansKR-Regular"
 */
export function removeSubsetPrefix(fontName: string): string {
  // 6자 대문자 + '+' 패턴 제거
  const cleaned = fontName.replace(/^[A-Z]{6}\+/, '');
  return cleaned;
}

/**
 * 폰트명 정규화 (하이픈, 언더스코어 제거 등)
 */
export function normalizeFontName(fontName: string): string {
  return fontName
    .replace(/[-_]/g, '') // 하이픈, 언더스코어 제거
    .toLowerCase()
    .trim();
}

/**
 * 폰트 매핑 테이블
 * PDF 폰트명 → 웹폰트 매핑
 */
export const FONT_MAPPING_TABLE: Record<string, { webFont: string; fallbacks: string[] }> = {
  // Google Fonts
  'googlesans': {
    webFont: 'Google Sans',
    fallbacks: ['Roboto', 'Noto Sans KR', 'sans-serif'],
  },
  'roboto': {
    webFont: 'Roboto',
    fallbacks: ['Noto Sans KR', 'Arial', 'sans-serif'],
  },
  'opensans': {
    webFont: 'Open Sans',
    fallbacks: ['Roboto', 'Noto Sans KR', 'sans-serif'],
  },
  'lato': {
    webFont: 'Lato',
    fallbacks: ['Roboto', 'Noto Sans KR', 'sans-serif'],
  },
  'montserrat': {
    webFont: 'Montserrat',
    fallbacks: ['Roboto', 'Noto Sans KR', 'sans-serif'],
  },

  // Noto Fonts (한글 지원)
  'notosanskr': {
    webFont: 'Noto Sans KR',
    fallbacks: ['Malgun Gothic', 'Apple SD Gothic Neo', 'sans-serif'],
  },
  'notosanscjkkr': {
    webFont: 'Noto Sans KR',
    fallbacks: ['Malgun Gothic', 'Apple SD Gothic Neo', 'sans-serif'],
  },
  'notoserifkr': {
    webFont: 'Noto Serif KR',
    fallbacks: ['Batang', 'Georgia', 'serif'],
  },

  // Pretendard (한글)
  'pretendard': {
    webFont: 'Pretendard',
    fallbacks: ['Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'sans-serif'],
  },

  // Apple Fonts
  'applesd': {
    webFont: 'Apple SD Gothic Neo',
    fallbacks: ['Noto Sans KR', 'Malgun Gothic', 'sans-serif'],
  },
  'applesystem': {
    webFont: '-apple-system',
    fallbacks: ['BlinkMacSystemFont', 'Noto Sans KR', 'sans-serif'],
  },

  // Windows Fonts (한글)
  'malgun': {
    webFont: 'Malgun Gothic',
    fallbacks: ['Noto Sans KR', 'Apple SD Gothic Neo', 'sans-serif'],
  },
  'batang': {
    webFont: 'Batang',
    fallbacks: ['Noto Serif KR', 'Georgia', 'serif'],
  },
  'dotum': {
    webFont: 'Dotum',
    fallbacks: ['Noto Sans KR', 'Malgun Gothic', 'sans-serif'],
  },
  'gulim': {
    webFont: 'Gulim',
    fallbacks: ['Noto Sans KR', 'Malgun Gothic', 'sans-serif'],
  },

  // Serif Fonts
  'timesnewroman': {
    webFont: 'Times New Roman',
    fallbacks: ['Georgia', 'Noto Serif KR', 'serif'],
  },
  'times': {
    webFont: 'Times New Roman',
    fallbacks: ['Georgia', 'Noto Serif KR', 'serif'],
  },
  'georgia': {
    webFont: 'Georgia',
    fallbacks: ['Times New Roman', 'Noto Serif KR', 'serif'],
  },

  // Monospace Fonts
  'couriernew': {
    webFont: 'Courier New',
    fallbacks: ['Courier', 'monospace'],
  },
  'courier': {
    webFont: 'Courier',
    fallbacks: ['Courier New', 'monospace'],
  },
  'consolas': {
    webFont: 'Consolas',
    fallbacks: ['Monaco', 'Courier New', 'monospace'],
  },

  // Arial 계열
  'arial': {
    webFont: 'Arial',
    fallbacks: ['Helvetica', 'Noto Sans KR', 'sans-serif'],
  },
  'helvetica': {
    webFont: 'Helvetica',
    fallbacks: ['Arial', 'Noto Sans KR', 'sans-serif'],
  },

  // 기타 한글 폰트
  'nanumgothic': {
    webFont: 'Nanum Gothic',
    fallbacks: ['Noto Sans KR', 'Malgun Gothic', 'sans-serif'],
  },
  'nanummyeongjo': {
    webFont: 'Nanum Myeongjo',
    fallbacks: ['Noto Serif KR', 'Batang', 'serif'],
  },
};

/**
 * 기본 한글/영문 폰트 fallback
 */
const DEFAULT_KOREAN_FALLBACKS = [
  'Noto Sans KR',
  'Pretendard',
  'Malgun Gothic',
  'Apple SD Gothic Neo',
  'sans-serif',
];

const DEFAULT_ENGLISH_FALLBACKS = ['Roboto', 'Arial', 'Helvetica', 'sans-serif'];

/**
 * PDF 폰트명을 웹폰트로 매핑
 */
export function mapPDFFont(pdfFontName: string): NormalizedFont {
  // 1. Subset prefix 제거
  const cleanName = removeSubsetPrefix(pdfFontName);

  // 2. 정규화 (소문자, 특수문자 제거)
  const normalized = normalizeFontName(cleanName);

  // 3. 매핑 테이블에서 찾기
  const mapping = FONT_MAPPING_TABLE[normalized];

  if (mapping) {
    return {
      originalName: pdfFontName,
      cleanName,
      webFont: mapping.webFont,
      fallbacks: mapping.fallbacks,
    };
  }

  // 4. 매핑되지 않은 경우: 한글/영문 판단하여 fallback 설정
  const hasKoreanChars = /[가-힣]/.test(cleanName);

  return {
    originalName: pdfFontName,
    cleanName,
    webFont: cleanName, // 원본 폰트명 사용 시도
    fallbacks: hasKoreanChars ? DEFAULT_KOREAN_FALLBACKS : DEFAULT_ENGLISH_FALLBACKS,
  };
}

/**
 * CSS font-family 문자열 생성
 * 한글/영문 혼합을 고려한 fallback 체인
 */
export function buildFontFamilyString(normalizedFont: NormalizedFont): string {
  const fonts = [normalizedFont.webFont, ...normalizedFont.fallbacks];

  // 공백이 포함된 폰트명은 따옴표로 감싸기
  const quotedFonts = fonts.map((font) => {
    if (font.includes(' ')) {
      return `"${font}"`;
    }
    return font;
  });

  return quotedFonts.join(', ');
}

/**
 * 폰트 스타일 추출 (bold, italic 등)
 */
export function extractFontStyle(fontName: string): {
  weight: number;
  style: 'normal' | 'italic' | 'oblique';
} {
  const lower = fontName.toLowerCase();

  let weight = 400; // normal
  if (lower.includes('bold')) weight = 700;
  else if (lower.includes('semibold')) weight = 600;
  else if (lower.includes('medium')) weight = 500;
  else if (lower.includes('light')) weight = 300;
  else if (lower.includes('thin')) weight = 100;
  else if (lower.includes('black') || lower.includes('heavy')) weight = 900;

  let style: 'normal' | 'italic' | 'oblique' = 'normal';
  if (lower.includes('italic')) style = 'italic';
  else if (lower.includes('oblique')) style = 'oblique';

  return { weight, style };
}
