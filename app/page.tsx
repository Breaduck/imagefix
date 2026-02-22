'use client';

import { useState } from 'react';
import { DropZone } from '@/components/molecules/DropZone';
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner';
import { EditorLayout } from '@/components/templates/EditorLayout';
import { PDFEditorLayout } from '@/components/templates/PDFEditorLayout';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useTextExtraction } from '@/hooks/useTextExtraction';
import { usePDFExtraction } from '@/hooks/usePDFExtraction';
import { PDFPageData } from '@/types/pdf.types';

type FileType = 'image' | 'pdf';

export default function Home() {
  const { imageData, uploadImage, isUploading, clearImage } = useImageUpload();
  const { isProcessing: isOCRProcessing, progress: ocrProgress, error: ocrError, textRegions, extractText, clearResults: clearOCRResults } = useTextExtraction();
  const { isProcessing: isPDFProcessing, progress: pdfProgress, error: pdfError, pageData, extractFromPDF, clearResults: clearPDFResults } = usePDFExtraction();

  const [stage, setStage] = useState<'upload' | 'processing' | 'editing'>('upload');
  const [fileType, setFileType] = useState<FileType>('image');

  const handleFileSelect = async (file: File) => {
    console.log('[HomePage] File selected:', file.name, file.type, file.size);

    try {
      // 파일 타입 확인
      const isPDF = file.type === 'application/pdf';
      setFileType(isPDF ? 'pdf' : 'image');
      console.log('[HomePage] File type:', isPDF ? 'PDF' : 'Image');

      if (isPDF) {
        // PDF 처리 - 첫 페이지 자동 처리
        console.log('[HomePage] Starting PDF processing');
        setStage('processing');
        const result = await extractFromPDF(file, 1);
        console.log('[HomePage] PDF processing complete, text regions:', result.textRegions.length);

        // 텍스트가 없으면 OCR 제안
        if (result.textRegions.length === 0) {
          const useOCR = confirm(
            'PDF에서 텍스트 레이어를 찾을 수 없습니다.\n' +
            '이미지 기반 PDF이거나 스캔된 문서일 수 있습니다.\n\n' +
            'OCR을 사용하여 텍스트를 추출하시겠습니까?\n' +
            '(시간이 조금 걸릴 수 있습니다)'
          );

          if (useOCR) {
            console.log('[HomePage] Converting PDF to image for OCR');

            // PDF 페이지를 이미지로 변환하고 uploadImage 사용
            const imageUrl = result.canvas.toDataURL('image/png');

            // Blob으로 변환
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const imageFile = new File([blob], 'pdf-page.png', { type: 'image/png' });

            // 이미지로 업로드 (OCR 경로)
            const data = await uploadImage(imageFile);
            console.log('[HomePage] PDF converted to image:', data.width, 'x', data.height);

            // 파일 타입을 이미지로 변경
            setFileType('image');

            console.log('[HomePage] Starting OCR on PDF page');
            const regions = await extractText(data.dataUrl, data.width, data.height);
            console.log('[HomePage] OCR complete, text regions:', regions.length);

            await new Promise(resolve => setTimeout(resolve, 100));
            setStage('editing');
            return;
          } else {
            setStage('upload');
            return;
          }
        }

        // DOM 정리를 위한 짧은 딜레이
        await new Promise(resolve => setTimeout(resolve, 100));
        setStage('editing');
      } else {
        // 이미지 처리 (기존 OCR)
        console.log('[HomePage] Starting image upload');
        const data = await uploadImage(file);
        console.log('[HomePage] Image uploaded:', data.width, 'x', data.height);

        setStage('processing');
        console.log('[HomePage] Starting OCR processing');
        const regions = await extractText(data.dataUrl, data.width, data.height);
        console.log('[HomePage] OCR complete, text regions:', regions.length);

        // DOM 정리를 위한 짧은 딜레이
        await new Promise(resolve => setTimeout(resolve, 100));
        setStage('editing');
      }
    } catch (err) {
      console.error('[HomePage] Error processing file:', err);
      alert('파일 처리 중 오류가 발생했습니다: ' + (err instanceof Error ? err.message : String(err)));
      setStage('upload');
    }
  };

  const handleReset = () => {
    clearImage();
    clearOCRResults();
    clearPDFResults();
    setStage('upload');
  };

  return (
    <main className="h-screen overflow-hidden" key={stage}>
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
                <li><strong>PDF 업로드</strong>: NotebookLM PDF를 업로드하면 텍스트 레이어에서 직접 추출 (폰트 정보 포함)</li>
                <li><strong>이미지 업로드</strong>: PDF 스크린샷이나 이미지는 OCR로 텍스트 추출 (한글 + 영문)</li>
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
            <LoadingSpinner
              size="lg"
              message={fileType === 'pdf' ? 'PDF 처리 중...' : '텍스트 추출 중...'}
            />
            {((fileType === 'pdf' ? pdfProgress : ocrProgress) > 0) && (
              <div className="mt-6">
                <div className="w-96 mx-auto">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${fileType === 'pdf' ? pdfProgress : ocrProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {Math.round(fileType === 'pdf' ? pdfProgress : ocrProgress)}%
                  </p>
                </div>
              </div>
            )}
            {(pdfError || ocrError) && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 max-w-md mx-auto">
                오류: {pdfError || ocrError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editing Stage */}
      {stage === 'editing' && (
        <>
          {fileType === 'pdf' && pageData ? (
            <PDFEditorLayout
              key={pageData.imageUrl}
              pageData={pageData}
              onReset={handleReset}
            />
          ) : fileType === 'image' && imageData ? (
            <EditorLayout
              key={imageData.dataUrl}
              imageUrl={imageData.dataUrl}
              imageWidth={imageData.width}
              imageHeight={imageData.height}
              textRegions={textRegions}
              onReset={handleReset}
            />
          ) : null}
        </>
      )}
    </main>
  );
}
