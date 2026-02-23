/**
 * Tesseract.js 언어 설정
 */

export const TESSERACT_LANGUAGES = {
  korean: 'kor',
  english: 'eng',
  combined: 'kor+eng', // 한글 + 영문 동시 인식
} as const;

/**
 * langPath candidates with fallback
 * Priority: env > projectnaptha > jsdelivr
 */
export const getLangPathCandidates = (): string[] => {
  const candidates = [
    'https://tessdata.projectnaptha.com/4.0.0',
    'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5/tessdata',
  ];

  if (process.env.NEXT_PUBLIC_TESS_LANG_PATH) {
    candidates.unshift(process.env.NEXT_PUBLIC_TESS_LANG_PATH);
  }

  return candidates;
};

export const getTessLangPath = () => getLangPathCandidates()[0];

export const TESSERACT_CONFIG = {
  get langPath() {
    return getTessLangPath();
  },
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
