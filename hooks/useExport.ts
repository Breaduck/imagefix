/**
 * 내보내기 기능을 위한 React Hook
 */

'use client';

import { useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { ExportOptions } from '@/types/editor.types';
import { exportAndDownload, generateFilename } from '@/lib/export/image-exporter';
import { copyCanvasToClipboard, isClipboardSupported } from '@/lib/export/clipboard-handler';

export interface UseExportReturn {
  isExporting: boolean;
  error: string | null;
  exportAsPNG: (canvas: fabric.Canvas, filename?: string) => Promise<void>;
  exportAsJPEG: (canvas: fabric.Canvas, filename?: string, quality?: number) => Promise<void>;
  copyToClipboard: (canvas: fabric.Canvas) => Promise<void>;
  isClipboardAvailable: boolean;
}

export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClipboardAvailable] = useState(isClipboardSupported());

  /**
   * PNG로 내보내기
   */
  const exportAsPNG = useCallback(async (canvas: fabric.Canvas, filename?: string) => {
    setIsExporting(true);
    setError(null);

    try {
      const finalFilename = filename || generateFilename('edited-image', 'png');
      exportAndDownload(canvas, finalFilename, {
        format: 'png',
        quality: 1.0,
        scale: 1,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'PNG 내보내기에 실패했습니다.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  /**
   * JPEG로 내보내기
   */
  const exportAsJPEG = useCallback(
    async (canvas: fabric.Canvas, filename?: string, quality: number = 0.9) => {
      setIsExporting(true);
      setError(null);

      try {
        const finalFilename = filename || generateFilename('edited-image', 'jpeg');
        exportAndDownload(canvas, finalFilename, {
          format: 'jpeg',
          quality,
          scale: 1,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'JPEG 내보내기에 실패했습니다.';
        setError(errorMessage);
        throw err;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  /**
   * 클립보드로 복사
   */
  const copyToClipboard = useCallback(async (canvas: fabric.Canvas) => {
    setIsExporting(true);
    setError(null);

    try {
      await copyCanvasToClipboard(canvas);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '클립보드 복사에 실패했습니다.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    isExporting,
    error,
    exportAsPNG,
    exportAsJPEG,
    copyToClipboard,
    isClipboardAvailable,
  };
}
