/**
 * PDF 텍스트 추출을 위한 React Hook
 */

'use client';

import { useState, useCallback } from 'react';
import { loadPDF, extractPDFPageData } from '@/lib/pdf/pdf-text-extractor';
import { PDFPageData } from '@/types/pdf.types';

export interface UsePDFExtractionReturn {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  pageData: PDFPageData | null;
  totalPages: number;
  currentPage: number;
  extractFromPDF: (file: File, pageNumber?: number) => Promise<PDFPageData>;
  clearResults: () => void;
}

export function usePDFExtraction(): UsePDFExtractionReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pageData, setPageData] = useState<PDFPageData | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * PDF에서 텍스트 추출
   */
  const extractFromPDF = useCallback(
    async (file: File, pageNumber: number = 1): Promise<PDFPageData> => {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      setPageData(null);

      try {
        console.log('[usePDFExtraction] Loading PDF...');
        setProgress(20);

        // PDF 로드
        const pdf = await loadPDF(file);
        setProgress(40);

        console.log(`[usePDFExtraction] PDF loaded. Pages: ${pdf.numPages}`);

        // 총 페이지 수 저장
        setTotalPages(pdf.numPages);

        // 페이지 범위 확인
        if (pageNumber < 1 || pageNumber > pdf.numPages) {
          throw new Error(`Invalid page number. PDF has ${pdf.numPages} pages.`);
        }

        setProgress(60);

        // 페이지 추출
        const page = await pdf.getPage(pageNumber);
        const data = await extractPDFPageData(page, pageNumber, 2.0);

        setProgress(100);

        console.log(
          `[usePDFExtraction] Extracted ${data.textRegions.length} text regions from page ${pageNumber}`
        );

        if (data.textRegions.length === 0) {
          console.warn('[usePDFExtraction] No text regions found! PDF may be image-based.');
          console.warn('[usePDFExtraction] Consider using OCR instead by converting PDF to image.');
        }

        setPageData(data);
        setCurrentPage(pageNumber);
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'PDF 처리 중 오류가 발생했습니다.';
        console.error('[usePDFExtraction] Error:', err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  /**
   * 결과 초기화
   */
  const clearResults = useCallback(() => {
    setPageData(null);
    setProgress(0);
    setError(null);
    setTotalPages(0);
    setCurrentPage(1);
  }, []);

  return {
    isProcessing,
    progress,
    error,
    pageData,
    totalPages,
    currentPage,
    extractFromPDF,
    clearResults,
  };
}
