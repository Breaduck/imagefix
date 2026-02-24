'use client';

import { useState, useCallback } from 'react';
import { DropZone } from '@/components/molecules/DropZone';
import { DOMImportZone } from '@/components/molecules/DOMImportZone';
import { LinkImportZone } from '@/components/molecules/LinkImportZone';
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner';
import { EditorLayout } from '@/components/templates/EditorLayout';
import { PDFEditorLayout } from '@/components/templates/PDFEditorLayout';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useTextExtraction } from '@/hooks/useTextExtraction';
import { usePDFExtraction } from '@/hooks/usePDFExtraction';
import { useDOMImport } from '@/hooks/useDOMImport';
import { PDFPageData } from '@/types/pdf.types';
import { isTextLayerUsable, renderPDFPage, loadPDF } from '@/lib/pdf/pdf-text-extractor';
import { OCRProvider } from '@/lib/ocr/providers';

type FileType = 'image' | 'pdf' | 'dom';
type ImportMode = 'ocr' | 'dom' | 'link';

export default function Home() {
  const [importMode, setImportMode] = useState<ImportMode>('ocr');
  const [ocrProvider, setOcrProvider] = useState<OCRProvider>('tesseract');
  const [clovaApiKey, setClovaApiKey] = useState('');
  const { imageData, uploadImage, isUploading, clearImage } = useImageUpload();
  const { isProcessing: isOCRProcessing, progress: ocrProgress, error: ocrError, textRegions, extractText, clearResults: clearOCRResults } = useTextExtraction(ocrProvider);
  const { isProcessing: isPDFProcessing, progress: pdfProgress, error: pdfError, pageData, totalPages, currentPage, extractFromPDF, clearResults: clearPDFResults } = usePDFExtraction();
  const { isProcessing: isDOMProcessing, error: domError, result: domResult, importDOMFiles, clearResults: clearDOMResults } = useDOMImport();

  const [stage, setStage] = useState<'upload' | 'processing' | 'editing'>('upload');
  const [fileType, setFileType] = useState<FileType>('image');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Multi-slide support
  const [allSlides, setAllSlides] = useState<{ pagePngDataUrl: string; layersJson: any }[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const handleFileSelect = async (file: File) => {
    console.log('[HomePage] File selected:', file.name, file.type, file.size);

    try {
      // 파일 타입 확인
      const isPDF = file.type === 'application/pdf';
      setFileType(isPDF ? 'pdf' : 'image');
      console.log('[HomePage] File type:', isPDF ? 'PDF' : 'Image');

      if (isPDF) {
        // PDF 파일 저장
        setPdfFile(file);

        // PDF 처리 - 첫 페이지 자동 처리
        console.log('[HomePage] Starting PDF processing');
        setStage('processing');
        const result = await extractFromPDF(file, 1);
        console.log('[HomePage] PDF processing complete:', {
          pageNumber: result.pageNumber,
          textRegions: result.textRegions.length,
          totalPages: totalPages,
          currentPage: currentPage,
          viewportSize: `${result.viewport.width}x${result.viewport.height}`
        });

        // 텍스트 레이어 품질 확인
        const quality = isTextLayerUsable(result.textContent.items);
        console.log('[HomePage] Text layer quality:', quality);

        // 텍스트가 없거나 품질이 낮으면 OCR 제안
        if (!quality.usable || result.textRegions.length === 0) {
          const reason = !quality.usable
            ? quality.reason
            : 'No text regions after processing';

          const useOCR = confirm(
            `PDF 텍스트 레이어를 사용할 수 없습니다.\n` +
            `사유: ${reason}\n\n` +
            'OCR을 사용하여 텍스트를 추출하시겠습니까?\n' +
            '(시간이 조금 걸릴 수 있습니다)'
          );

          if (useOCR) {
            console.log('[HomePage] Converting PDF to high-res image for OCR');

            // OCR용 고해상도 렌더링 (scale 3.5)
            const pdf = await loadPDF(file);
            const page = await pdf.getPage(1);
            const highResCanvas = await renderPDFPage(page, 3.5);
            console.log(`[HomePage] OCR image size: ${highResCanvas.width}x${highResCanvas.height}px`);

            const imageUrl = highResCanvas.toDataURL('image/png');

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
        console.log('[HomePage] PDF ready for editing:', {
          fileType,
          hasPageData: !!pageData,
          totalPages,
          currentPage
        });
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

  const handleDOMFilesSelect = useCallback(async (pngFile: File, jsonFile: File) => {
    console.log('[HomePage] DOM files selected:', pngFile.name, jsonFile.name);

    try {
      setStage('processing');
      const result = await importDOMFiles(pngFile, jsonFile);
      console.log('[HomePage] DOM import complete:', {
        imageSize: `${result.imageWidth}x${result.imageHeight}`,
        textRegions: result.textRegions.length,
      });

      setFileType('dom');
      await new Promise(resolve => setTimeout(resolve, 100));
      setStage('editing');
    } catch (err) {
      console.error('[HomePage] DOM import error:', err);
      alert('DOM 파일 처리 중 오류가 발생했습니다: ' + (err instanceof Error ? err.message : String(err)));
      setStage('upload');
    }
  }, [importDOMFiles]);

  const handleLinkImportStart = useCallback((requestId: string, url: string) => {
    console.log('[HomePage] Link import started:', { requestId, url });
    // Don't unmount LinkImportZone - it needs to stay mounted to receive IMPORT_RESULT
    // LinkImportZone has its own loading UI via isImporting state
  }, []);

  const handleLinkImportComplete = useCallback(async (slides: { pagePngDataUrl: string; layersJson: any }[]) => {
    console.log('[HomePage] Link import complete:', slides.length, 'slides');

    if (slides.length === 0) {
      alert('슬라이드를 가져올 수 없습니다.');
      setStage('upload');
      return;
    }

    try {
      // Store all slides
      setAllSlides(slides);
      setCurrentSlideIndex(0);

      // Load the first slide
      const firstSlide = slides[0];

      // Convert data URL to File for importDOMFiles
      const pngBlob = await fetch(firstSlide.pagePngDataUrl).then(r => r.blob());
      const pngFile = new File([pngBlob], 'slide.png', { type: 'image/png' });

      const jsonBlob = new Blob([JSON.stringify(firstSlide.layersJson)], { type: 'application/json' });
      const jsonFile = new File([jsonBlob], 'layers.json', { type: 'application/json' });

      const result = await importDOMFiles(pngFile, jsonFile);
      console.log('[HomePage] First slide loaded:', {
        imageSize: `${result.imageWidth}x${result.imageHeight}`,
        textRegions: result.textRegions.length,
      });

      setFileType('dom');
      await new Promise(resolve => setTimeout(resolve, 100));
      setStage('editing');

      if (slides.length > 1) {
        console.log(`[HomePage] ${slides.length} slides available for navigation`);
      }
    } catch (err) {
      console.error('[HomePage] Link import rendering error:', err);
      alert('슬라이드 렌더링 중 오류가 발생했습니다: ' + (err instanceof Error ? err.message : String(err)));
      setStage('upload');
    }
  }, [importDOMFiles]);

  const handleLinkImportError = useCallback((error: string) => {
    console.error('[HomePage] Link import error:', error);
    alert('슬라이드 가져오기 실패: ' + error);
    setStage('upload');
  }, []);

  // Slide navigation handlers
  const handlePrevSlide = useCallback(async () => {
    if (currentSlideIndex === 0 || allSlides.length === 0) return;

    const newIndex = currentSlideIndex - 1;
    console.log('[HomePage] Navigating to slide', newIndex + 1);

    try {
      setStage('processing');
      const slide = allSlides[newIndex];

      // Convert data URL to File for importDOMFiles
      const pngBlob = await fetch(slide.pagePngDataUrl).then(r => r.blob());
      const pngFile = new File([pngBlob], `slide-${newIndex + 1}.png`, { type: 'image/png' });

      const jsonBlob = new Blob([JSON.stringify(slide.layersJson)], { type: 'application/json' });
      const jsonFile = new File([jsonBlob], `layers-${newIndex + 1}.json`, { type: 'application/json' });

      await importDOMFiles(pngFile, jsonFile);
      setCurrentSlideIndex(newIndex);

      await new Promise(resolve => setTimeout(resolve, 100));
      setStage('editing');
    } catch (err) {
      console.error('[HomePage] Error loading slide:', err);
      alert('슬라이드 로딩 중 오류가 발생했습니다: ' + (err instanceof Error ? err.message : String(err)));
      setStage('editing');
    }
  }, [currentSlideIndex, allSlides, importDOMFiles]);

  const handleNextSlide = useCallback(async () => {
    if (currentSlideIndex >= allSlides.length - 1 || allSlides.length === 0) return;

    const newIndex = currentSlideIndex + 1;
    console.log('[HomePage] Navigating to slide', newIndex + 1);

    try {
      setStage('processing');
      const slide = allSlides[newIndex];

      // Convert data URL to File for importDOMFiles
      const pngBlob = await fetch(slide.pagePngDataUrl).then(r => r.blob());
      const pngFile = new File([pngBlob], `slide-${newIndex + 1}.png`, { type: 'image/png' });

      const jsonBlob = new Blob([JSON.stringify(slide.layersJson)], { type: 'application/json' });
      const jsonFile = new File([jsonBlob], `layers-${newIndex + 1}.json`, { type: 'application/json' });

      await importDOMFiles(pngFile, jsonFile);
      setCurrentSlideIndex(newIndex);

      await new Promise(resolve => setTimeout(resolve, 100));
      setStage('editing');
    } catch (err) {
      console.error('[HomePage] Error loading slide:', err);
      alert('슬라이드 로딩 중 오류가 발생했습니다: ' + (err instanceof Error ? err.message : String(err)));
      setStage('editing');
    }
  }, [currentSlideIndex, allSlides, importDOMFiles]);

  const handleReset = () => {
    clearImage();
    clearOCRResults();
    clearPDFResults();
    clearDOMResults();
    setPdfFile(null);
    setStage('upload');
  };

  const handleRerunOCR = async () => {
    if (!imageData) {
      console.warn('[OCR] No image data available for re-run');
      return;
    }

    try {
      console.log('[OCR] Re-running OCR for current image');
      setStage('processing');
      await extractText(imageData.dataUrl, imageData.width, imageData.height);
      setStage('editing');
      console.log('[OCR] Re-run complete');
    } catch (err) {
      console.error('[OCR] Re-run failed:', err);
      alert('OCR 재실행 중 오류가 발생했습니다.');
      setStage('editing');
    }
  };

  const handlePageChange = async (newPage: number) => {
    const maxPages = pageData?.totalPages || totalPages;
    const current = pageData?.pageNumber || currentPage;

    console.log(`[Nav] click next: current=${current} total=${maxPages} loading=${isPDFProcessing} newPage=${newPage}`);
    console.log(`[PDF UI] page -> ${newPage}/${maxPages}`);

    if (!pdfFile) {
      console.warn('[PDF] No PDF file available');
      return;
    }

    // Clamp page number
    const clampedPage = Math.max(1, Math.min(maxPages, newPage));
    if (clampedPage !== newPage) {
      console.warn(`[PDF] Page ${newPage} out of bounds, clamped to ${clampedPage}`);
      return;
    }

    try {
      setStage('processing');
      console.log(`[PDF] Extracting page ${clampedPage}...`);
      const result = await extractFromPDF(pdfFile, clampedPage);
      console.log(`[Extract] page=${clampedPage} items=${result.textContent.items.length} regions=${result.textRegions.length}`);
      console.log(`[Nav] state: current=${result.pageNumber} total=${result.totalPages}`);

      await new Promise(resolve => setTimeout(resolve, 100));
      setStage('editing');
    } catch (err) {
      console.error('[HomePage] Error changing page:', err);
      alert('페이지 변경 중 오류가 발생했습니다.');
      setStage('editing');
    }
  };

  return (
    <main className={stage === 'editing' ? 'h-screen overflow-hidden' : 'min-h-screen'} key={stage}>
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

            {/* Import Mode Selection */}
            <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold mb-3">Import Method</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-start cursor-pointer p-3 border-2 rounded-lg transition-colors hover:border-blue-300 dark:hover:border-blue-600" style={{ borderColor: importMode === 'link' ? '#3b82f6' : 'transparent' }}>
                  <input
                    type="radio"
                    name="importMode"
                    value="link"
                    checked={importMode === 'link'}
                    onChange={(e) => setImportMode(e.target.value as ImportMode)}
                    className="mr-2 mt-1"
                  />
                  <div>
                    <span className="font-medium">🔗 Link Import</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Paste URL, auto-capture all slides</p>
                  </div>
                </label>
                <label className="flex items-start cursor-pointer p-3 border-2 rounded-lg transition-colors hover:border-blue-300 dark:hover:border-blue-600" style={{ borderColor: importMode === 'dom' ? '#3b82f6' : 'transparent' }}>
                  <input
                    type="radio"
                    name="importMode"
                    value="dom"
                    checked={importMode === 'dom'}
                    onChange={(e) => setImportMode(e.target.value as ImportMode)}
                    className="mr-2 mt-1"
                  />
                  <div>
                    <span className="font-medium">📁 File Import</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Upload PNG + JSON files</p>
                  </div>
                </label>
                <label className="flex items-start cursor-pointer p-3 border-2 rounded-lg transition-colors hover:border-blue-300 dark:hover:border-blue-600" style={{ borderColor: importMode === 'ocr' ? '#3b82f6' : 'transparent' }}>
                  <input
                    type="radio"
                    name="importMode"
                    value="ocr"
                    checked={importMode === 'ocr'}
                    onChange={(e) => setImportMode(e.target.value as ImportMode)}
                    className="mr-2 mt-1"
                  />
                  <div>
                    <span className="font-medium">🔍 OCR Import</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PDF/Image with OCR</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Upload Area */}
            <div className="mb-8">
              {importMode === 'link' ? (
                <LinkImportZone
                  onImportStart={handleLinkImportStart}
                  onImportComplete={handleLinkImportComplete}
                  onImportError={handleLinkImportError}
                  disabled={false}
                />
              ) : importMode === 'dom' ? (
                <DOMImportZone onFilesSelect={handleDOMFilesSelect} disabled={isDOMProcessing} />
              ) : (
                <>
                  <DropZone onFileSelect={handleFileSelect} disabled={isUploading} />
                  {isUploading && (
                    <div className="mt-4">
                      <LoadingSpinner message="이미지 로딩 중..." />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* OCR Provider Selection (only for OCR mode) */}
            {importMode === 'ocr' && (
              <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold mb-3">OCR 품질 선택</h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="ocrProvider"
                        value="tesseract"
                        checked={ocrProvider === 'tesseract'}
                        onChange={(e) => setOcrProvider(e.target.value as OCRProvider)}
                        className="mr-2"
                      />
                      <div>
                        <span className="font-medium">기본 OCR (Tesseract)</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">클라이언트 측 처리, 무료, 빠름</p>
                      </div>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="ocrProvider"
                        value="clova"
                        checked={ocrProvider === 'clova'}
                        onChange={(e) => setOcrProvider(e.target.value as OCRProvider)}
                        className="mr-2"
                      />
                      <div>
                        <span className="font-medium">고품질 OCR (CLOVA)</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">서버 측 처리, 높은 정확도, API 키 필요</p>
                      </div>
                    </label>
                  </div>

                  {/* CLOVA API Key Input */}
                  {ocrProvider === 'clova' && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <label className="block text-sm font-medium mb-2">CLOVA OCR API Key</label>
                      <input
                        type="password"
                        value={clovaApiKey}
                        onChange={(e) => setClovaApiKey(e.target.value)}
                        placeholder="CLOVA API 키를 입력하세요"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        CLOVA OCR API 키는 NAVER Cloud Platform에서 발급받을 수 있습니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold mb-3 text-lg">사용 방법</h3>
              {importMode === 'link' ? (
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li><strong>확장프로그램 설치</strong>: Chrome에서 /extension 폴더를 로드 (개발자 모드)</li>
                  <li><strong>URL 복사</strong>: NotebookLM 프레젠테이션 URL 복사</li>
                  <li><strong>붙여넣기</strong>: 위 입력칸에 URL 붙여넣고 "슬라이드 가져오기" 클릭</li>
                  <li><strong>자동 캡처</strong>: 모든 슬라이드가 자동으로 캡처되어 캔버스에 로드됩니다</li>
                  <li><strong>편집 & 내보내기</strong>: 텍스트 편집 후 PNG/JPG로 다운로드</li>
                </ol>
              ) : importMode === 'dom' ? (
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li><strong>Chrome Extension</strong>: Install the NotebookLM extension from /extension folder</li>
                  <li><strong>Export Slide</strong>: Open NotebookLM, click extension, export current slide as PNG + JSON</li>
                  <li><strong>Upload Files</strong>: Upload both files here (drag & drop or select individually)</li>
                  <li><strong>Edit Text</strong>: All text is 100% accurate and fully editable on canvas</li>
                  <li><strong>Export</strong>: Download as PNG/JPG or copy to clipboard</li>
                </ol>
              ) : (
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li><strong>PDF 업로드</strong>: NotebookLM PDF를 업로드하면 텍스트 레이어에서 직접 추출 (폰트 정보 포함)</li>
                  <li><strong>이미지 업로드</strong>: PDF 스크린샷이나 이미지는 OCR로 텍스트 추출 (한글 + 영문)</li>
                  <li>캔버스에서 텍스트를 직접 클릭하고 편집할 수 있습니다.</li>
                  <li>폰트 크기, 색상, 회전 각도를 조정할 수 있습니다.</li>
                  <li>편집이 완료되면 PNG/JPG로 다운로드하거나 클립보드에 복사하세요.</li>
                </ol>
              )}
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
              message={
                fileType === 'dom'
                  ? 'DOM 파일 처리 중...'
                  : fileType === 'pdf'
                    ? 'PDF 처리 중...'
                    : '텍스트 추출 중...'
              }
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
            {(pdfError || ocrError || domError) && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 max-w-md mx-auto">
                오류: {pdfError || ocrError || domError}
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
              key={`pdf-page-${pageData.pageNumber}`}
              pageData={pageData}
              currentPage={pageData.pageNumber}
              totalPages={pageData.totalPages}
              onPageChange={handlePageChange}
              onReset={handleReset}
            />
          ) : fileType === 'dom' && domResult ? (
            <EditorLayout
              key={`slide-${currentSlideIndex}-${domResult.imageUrl}`}
              imageUrl={domResult.imageUrl}
              imageWidth={domResult.imageWidth}
              imageHeight={domResult.imageHeight}
              textRegions={domResult.textRegions}
              onReset={handleReset}
              currentSlide={allSlides.length > 0 ? currentSlideIndex : undefined}
              totalSlides={allSlides.length > 0 ? allSlides.length : undefined}
              onPrevSlide={allSlides.length > 1 ? handlePrevSlide : undefined}
              onNextSlide={allSlides.length > 1 ? handleNextSlide : undefined}
            />
          ) : fileType === 'image' && imageData ? (
            <EditorLayout
              key={imageData.dataUrl}
              imageUrl={imageData.dataUrl}
              imageWidth={imageData.width}
              imageHeight={imageData.height}
              textRegions={textRegions}
              onReset={handleReset}
              onRerunOCR={handleRerunOCR}
            />
          ) : null}
        </>
      )}
    </main>
  );
}
