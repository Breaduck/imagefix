'use client';

import { useState } from 'react';
import { DropZone } from '@/components/molecules/DropZone';
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner';
import { EditorLayout } from '@/components/templates/EditorLayout';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useTextExtraction } from '@/hooks/useTextExtraction';

export default function Home() {
  const { imageData, uploadImage, isUploading, clearImage } = useImageUpload();
  const { isProcessing, progress, error, textRegions, extractText, clearResults } = useTextExtraction();

  const [stage, setStage] = useState<'upload' | 'processing' | 'editing'>('upload');

  const handleFileSelect = async (file: File) => {
    try {
      const data = await uploadImage(file);
      setStage('processing');

      // OCR + 스타일 추출
      await extractText(data.dataUrl, data.width, data.height);
      setStage('editing');
    } catch (err) {
      console.error('Error processing image:', err);
      setStage('upload');
    }
  };

  const handleReset = () => {
    clearImage();
    clearResults();
    setStage('upload');
  };

  return (
    <main className="h-screen overflow-hidden">
      {/* Upload Stage */}
      {stage === 'upload' && (
        <div className="min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <header className="mb-8 text-center">
              <h1 className="text-4xl font-bold mb-4">NotebookLM 텍스트 편집기</h1>
              <p className="text-gray-600 dark:text-gray-400">
                이미지에서 텍스트를 추출하고 편집할 수 있는 웹 애플리케이션
              </p>
            </header>

            {/* Upload Area */}
            <div className="mb-8">
              <DropZone onFileSelect={handleFileSelect} disabled={isUploading} />
              {isUploading && (
                <div className="mt-4">
                  <LoadingSpinner message="이미지 로딩 중..." />
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold mb-3 text-lg">사용 방법</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>NotebookLM PDF 스크린샷 또는 텍스트가 포함된 이미지를 업로드하세요.</li>
                <li>OCR이 자동으로 텍스트를 추출합니다 (한글 + 영문 지원).</li>
                <li>캔버스에서 텍스트를 직접 클릭하고 편집할 수 있습니다.</li>
                <li>폰트 크기, 색상, 회전 각도를 조정할 수 있습니다.</li>
                <li>편집이 완료되면 PNG/JPG로 다운로드하거나 클립보드에 복사하세요.</li>
              </ol>

              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold mb-2">
                  ⚠️ 첫 실행 전 필수 설정
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Tesseract 언어 데이터 파일이 필요합니다:
                </p>
                <code className="block mt-2 text-xs bg-gray-800 text-green-400 p-2 rounded">
                  cd public/tessdata
                  <br />
                  curl -L https://github.com/tesseract-ocr/tessdata/raw/main/kor.traineddata -o
                  kor.traineddata
                  <br />
                  curl -L https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata -o
                  eng.traineddata
                </code>
              </div>
            </div>

            {/* Features */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-blue-600 dark:text-blue-400 mb-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold mb-1">OCR 텍스트 추출</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  한글과 영문을 자동으로 인식합니다
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-green-600 dark:text-green-400 mb-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold mb-1">실시간 편집</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  캔버스에서 직접 텍스트를 수정합니다
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-purple-600 dark:text-purple-400 mb-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold mb-1">손쉬운 내보내기</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  PNG, JPG 다운로드 또는 클립보드 복사
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Stage */}
      {stage === 'processing' && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" message="텍스트 추출 중..." />
            {progress > 0 && (
              <div className="mt-6">
                <div className="w-96 mx-auto">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{Math.round(progress)}%</p>
                </div>
              </div>
            )}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 max-w-md mx-auto">
                오류: {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editing Stage */}
      {stage === 'editing' && imageData && (
        <EditorLayout
          imageUrl={imageData.dataUrl}
          imageWidth={imageData.width}
          imageHeight={imageData.height}
          textRegions={textRegions}
          onReset={handleReset}
        />
      )}
    </main>
  );
}
