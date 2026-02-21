/**
 * 클립보드 관련 유틸리티
 */

'use client';

import { fabric } from 'fabric';

/**
 * 캔버스를 클립보드로 복사
 */
export async function copyCanvasToClipboard(canvas: fabric.Canvas): Promise<void> {
  try {
    // Canvas를 Blob으로 변환
    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1.0 });
    const blob = await fetch(dataUrl).then((res) => res.blob());

    // ClipboardItem 생성
    const clipboardItem = new ClipboardItem({
      'image/png': blob,
    });

    // 클립보드에 쓰기
    await navigator.clipboard.write([clipboardItem]);

    console.log('[Clipboard] Image copied to clipboard successfully');
  } catch (error) {
    console.error('[Clipboard] Failed to copy image:', error);
    throw new Error('클립보드 복사에 실패했습니다. HTTPS 환경에서만 사용 가능합니다.');
  }
}

/**
 * 클립보드 API 지원 여부 확인
 */
export function isClipboardSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard !== 'undefined' &&
    typeof ClipboardItem !== 'undefined'
  );
}

/**
 * 텍스트를 클립보드로 복사
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    console.log('[Clipboard] Text copied to clipboard');
  } catch (error) {
    console.error('[Clipboard] Failed to copy text:', error);
    throw new Error('텍스트 복사에 실패했습니다.');
  }
}
