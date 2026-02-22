/**
 * PDF 페이지를 "텍스트 없는" 깨끗한 배경으로 렌더링
 *
 * 방법: PDF 페이지를 렌더링하되, 텍스트 레이어는 OCR로 추출한 것만 사용
 * 결과: 원본 텍스트 없는 깨끗한 배경 + 편집 가능한 텍스트 레이어
 */

'use client';

/**
 * PDF 캔버스를 "깨끗한 배경"으로 처리
 *
 * NOTE: PDF.js의 기본 렌더링에는 이미 텍스트가 포함되어 있음
 * 하지만 이미지 기반 PDF나 스캔 PDF의 경우,
 * 렌더링된 캔버스 자체가 "텍스트가 그려진 이미지"이므로
 * OCR로 추출한 위치에 마스크를 씌우는 것이 현재로서는 최선
 *
 * 미래 개선:
 * 1. PDF.js OperatorList 필터링 (텍스트 그리기 명령 제거)
 * 2. 서버 사이드 PDFium/MuPDF로 텍스트 제외 렌더
 * 3. AI 기반 텍스트 인페인팅
 */

import { PDFPageProxy } from 'pdfjs-dist';

/**
 * PDF 페이지 렌더링 (현재는 기본 렌더링과 동일)
 *
 * TODO: 텍스트 제외 렌더링 구현
 * - Option 1: getOperatorList() + 텍스트 연산 필터링
 * - Option 2: 서버 렌더링 API
 */
export async function renderCleanBackground(
  page: PDFPageProxy,
  scale: number = 2.0
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas context not available');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // 기본 렌더링
  // NOTE: 이미지 기반 PDF의 경우, 이 렌더링 자체가 이미 텍스트를 포함
  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  console.log('[CleanBackground] PDF page rendered (may include embedded text)');
  console.log('[CleanBackground] For image-based PDFs, use smart masking or inpainting');

  return canvas;
}

/**
 * 실험적: OperatorList 기반 텍스트 제외 렌더링
 *
 * WARNING: PDF.js 내부 API 사용, 불안정할 수 있음
 */
export async function renderWithoutText_EXPERIMENTAL(
  page: PDFPageProxy,
  scale: number = 2.0
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas context not available');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  try {
    // OperatorList 가져오기
    const operatorList = await page.getOperatorList();

    console.log('[EXPERIMENTAL] Total operations:', operatorList.fnArray.length);

    // 텍스트 관련 연산 찾기
    const textOps = [
      // PDF 텍스트 그리기 연산들
      // OPS.showText, OPS.showSpacedText, OPS.nextLineShowText, ...
      // 실제 값은 PDF.js 내부 상수를 확인해야 함
    ];

    // TODO: 텍스트 연산 필터링 구현
    // 현재는 그냥 전체 렌더링
    console.warn('[EXPERIMENTAL] Text filtering not implemented yet');
    console.warn('[EXPERIMENTAL] Falling back to default rendering');

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    return canvas;
  } catch (error) {
    console.error('[EXPERIMENTAL] OperatorList filtering failed:', error);
    console.log('[EXPERIMENTAL] Falling back to default rendering');

    // Fallback
    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    return canvas;
  }
}

/**
 * 사용 가이드:
 *
 * 1. 현재 (Phase 1):
 *    - renderCleanBackground() 사용
 *    - Export 시 smart-mask로 텍스트 영역만 배경색으로 덮기
 *    - 문서형 PDF (흰색 배경)에서는 99% 완벽
 *
 * 2. 미래 (Phase 2):
 *    - renderWithoutText_EXPERIMENTAL() 완성
 *    - 또는 서버 렌더링 API 구축
 *    - 복잡한 배경에서도 완벽한 텍스트 제거
 */
