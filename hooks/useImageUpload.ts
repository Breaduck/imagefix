/**
 * 이미지 업로드 처리를 위한 React Hook
 */

'use client';

import { useState, useCallback } from 'react';

export interface ImageData {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
}

export interface UseImageUploadReturn {
  imageData: ImageData | null;
  isUploading: boolean;
  error: string | null;
  uploadImage: (file: File) => Promise<ImageData>;
  clearImage: () => void;
}

const MAX_IMAGE_SIZE = 4096; // 최대 이미지 크기 (px)
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export function useImageUpload(): UseImageUploadReturn {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 파일 유효성 검사
   */
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return '지원하지 않는 파일 형식입니다. PNG, JPG, WEBP 파일을 업로드하세요.';
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB 제한
      return '파일 크기가 너무 큽니다. 10MB 이하의 파일을 업로드하세요.';
    }

    return null;
  };

  /**
   * 이미지를 로드하고 크기 정보를 추출
   */
  const loadImage = (file: File): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();

        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // 이미지가 너무 크면 다운스케일
          if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
            const scale = MAX_IMAGE_SIZE / Math.max(width, height);
            width = Math.floor(width * scale);
            height = Math.floor(height * scale);
          }

          resolve({
            file,
            dataUrl,
            width,
            height,
          });
        };

        img.onerror = () => {
          reject(new Error('이미지를 로드할 수 없습니다.'));
        };

        img.src = dataUrl;
      };

      reader.onerror = () => {
        reject(new Error('파일을 읽을 수 없습니다.'));
      };

      reader.readAsDataURL(file);
    });
  };

  /**
   * 이미지 업로드 처리
   */
  const uploadImage = useCallback(async (file: File): Promise<ImageData> => {
    setIsUploading(true);
    setError(null);

    try {
      // 파일 유효성 검사
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // 이미지 로드
      const data = await loadImage(file);

      console.log(`[useImageUpload] Image loaded: ${data.width}x${data.height}`);

      setImageData(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '이미지 업로드 중 오류가 발생했습니다.';
      console.error('[useImageUpload] Error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * 이미지 초기화
   */
  const clearImage = useCallback(() => {
    setImageData(null);
    setError(null);
  }, []);

  return {
    imageData,
    isUploading,
    error,
    uploadImage,
    clearImage,
  };
}
