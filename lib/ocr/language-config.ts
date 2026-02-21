/**
 * Tesseract.js 언어 설정
 */

export const TESSERACT_LANGUAGES = {
  korean: 'kor',
  english: 'eng',
  combined: 'kor+eng', // 한글 + 영문 동시 인식
} as const;

export const TESSERACT_CONFIG = {
  langPath: '/tessdata', // public/tessdata/ 경로
  logger: (m: { status: string; progress: number }) => {
    console.log(`[Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`);
  },
};

export const OCR_OPTIONS = {
  lang: TESSERACT_LANGUAGES.combined,
  // Tesseract PSM (Page Segmentation Mode) 설정
  // 3 = Fully automatic page segmentation (기본값)
  tessedit_pageseg_mode: '3',
  // 신뢰도 임계값
  tessedit_char_whitelist: '', // 빈 문자열 = 모든 문자 허용
};
