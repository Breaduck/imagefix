/**
 * PDF 파일 업로드 처리 Hook
 */

'use client';

import { useState, useCallback } from 'react';

export interface PDFUploadData {
  file: File;
}

export interface UsePDFUploadReturn {
  pdfData: PDFUploadData | null;
  isUploading: boolean;
  error: string | null;
  uploadPDF: (file: File) => Promise<PDFUploadData>;
  clearPDF: () => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function usePDFUpload(): UsePDFUploadReturn {
  const [pdfData, setPDFData] = useState<PDFUploadData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'PDF 파일만 업로드 가능합니다.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return '파일 크기가 너무 큽니다. 50MB 이하의 파일을 업로드하세요.';
    }

    return null;
  };

  const uploadPDF = useCallback(async (file: File): Promise<PDFUploadData> => {
    setIsUploading(true);
    setError(null);

    try {
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      console.log(`[usePDFUpload] PDF uploaded: ${file.name}, size: ${file.size} bytes`);

      const data: PDFUploadData = { file };
      setPDFData(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'PDF 업로드 중 오류가 발생했습니다.';
      console.error('[usePDFUpload] Error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const clearPDF = useCallback(() => {
    setPDFData(null);
    setError(null);
  }, []);

  return {
    pdfData,
    isUploading,
    error,
    uploadPDF,
    clearPDF,
  };
}
