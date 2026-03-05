/**
 * 에디터 전체 레이아웃
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { fabric } from 'fabric';
import { CanvasEditor } from '@/components/organisms/CanvasEditor';
import { TextSidebar } from '@/components/organisms/TextSidebar';
import { TextStyleControls } from '@/components/molecules/TextStyleControls';
import { ToolPanel } from '@/components/organisms/ToolPanel';
import { TextRegion, ObjectLayer } from '@/types/canvas.types';
import { useExport } from '@/hooks/useExport';
import { useLayerExtraction } from '@/hooks/useLayerExtraction';
import { CanvasHistory } from '@/lib/canvas/history-manager';
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner';

export interface EditorLayoutProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  textRegions: TextRegion[];
  onReset: () => void;
  onRerunOCR?: () => void;
  // Multi-slide navigation (optional)
  currentSlide?: number;
  totalSlides?: number;
  onPrevSlide?: () => void;
  onNextSlide?: () => void;
}

export function EditorLayout({
  imageUrl,
  imageWidth,
  imageHeight,
  textRegions: initialTextRegions,
  onReset,
  onRerunOCR,
  currentSlide,
  totalSlides,
  onPrevSlide,
  onNextSlide,
}: EditorLayoutProps) {
  const [textRegions, setTextRegions] = useState<TextRegion[]>(initialTextRegions);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [objectLayers, setObjectLayers] = useState<ObjectLayer[]>([]);
  const historyRef = useRef<CanvasHistory | null>(null);

  const canvasRefCallback = useCallback((fabricCanvas: fabric.Canvas | null) => {
    setCanvas(fabricCanvas);
  }, []);

  const historyRefCallback = useCallback((history: CanvasHistory) => {
    historyRef.current = history;
  }, []);

  const { exportAsPNG, exportAsJPEG, copyToClipboard, isClipboardAvailable } = useExport();
  const { isProcessing: isExtractingLayers, extractLayers, error: extractionError, result: extractionResult } = useLayerExtraction();

  const selectedRegion = textRegions.find((r) => r.id === selectedRegionId) || null;

  // 텍스트 선택 핸들러
  const handleTextSelect = useCallback((regionId: string | null) => {
    setSelectedRegionId(regionId);
  }, []);

  // 텍스트 업데이트 핸들러
  const handleTextUpdate = useCallback((regionId: string, newText: string) => {
    setTextRegions((prev) =>
      prev.map((region) => (region.id === regionId ? { ...region, text: newText } : region))
    );
  }, []);

  // 스타일 변경 핸들러
  const handleStyleChange = useCallback(
    (style: Partial<TextRegion['style']>) => {
      if (!selectedRegionId || !canvas) return;

      setTextRegions((prev) =>
        prev.map((region) =>
          region.id === selectedRegionId
            ? { ...region, style: { ...region.style, ...style } }
            : region
        )
      );

      // Fabric.js 객체 업데이트
      const objects = canvas.getObjects();
      const textObject = objects.find((obj: any) => obj.regionId === selectedRegionId) as fabric.IText;

      if (textObject) {
        if (style.fontSize !== undefined) textObject.set({ fontSize: style.fontSize });
        if (style.color !== undefined) textObject.set({ fill: style.color });
        if (style.rotation !== undefined) textObject.set({ angle: style.rotation });
        if (style.fontFamily !== undefined) textObject.set({ fontFamily: style.fontFamily });
        if (style.fontWeight !== undefined) textObject.set({ fontWeight: style.fontWeight });
        if (style.fontStyle !== undefined) textObject.set({ fontStyle: style.fontStyle });
        if (style.underline !== undefined) textObject.set({ underline: style.underline });
        if (style.align !== undefined) textObject.set({ textAlign: style.align });

        textObject.setCoords();
        canvas.renderAll();
      }
    },
    [selectedRegionId, canvas]
  );

  // 텍스트 삭제 핸들러
  const handleRegionDelete = useCallback(
    (regionId: string) => {
      setTextRegions((prev) => prev.filter((r) => r.id !== regionId));

      if (canvas) {
        const objects = canvas.getObjects();
        const toRemove = objects.filter((obj: any) => obj.regionId === regionId);
        toRemove.forEach((obj) => canvas.remove(obj));
        canvas.renderAll();
      }

      if (selectedRegionId === regionId) {
        setSelectedRegionId(null);
      }
    },
    [canvas, selectedRegionId]
  );

  // 내보내기 핸들러
  const handleExport = useCallback(
    async (format: 'png' | 'jpeg') => {
      if (!canvas) return;

      try {
        if (format === 'png') {
          await exportAsPNG(canvas);
        } else {
          await exportAsJPEG(canvas);
        }
      } catch (error) {
        console.error('Export failed:', error);
        alert('이미지 내보내기에 실패했습니다.');
      }
    },
    [canvas, exportAsPNG, exportAsJPEG]
  );

  // 클립보드 복사 핸들러
  const handleCopy = useCallback(async () => {
    if (!canvas) return;

    if (!isClipboardAvailable) {
      alert('클립보드 기능은 HTTPS 환경에서만 사용 가능합니다.');
      return;
    }

    try {
      await copyToClipboard(canvas);
      alert('이미지가 클립보드에 복사되었습니다!');
    } catch (error) {
      console.error('Copy failed:', error);
      alert('클립보드 복사에 실패했습니다.');
    }
  }, [canvas, copyToClipboard, isClipboardAvailable]);

  // Undo 핸들러
  const handleUndo = useCallback(() => {
    if (historyRef.current) {
      historyRef.current.undo();
    }
  }, []);

  // Redo 핸들러
  const handleRedo = useCallback(() => {
    if (historyRef.current) {
      historyRef.current.redo();
    }
  }, []);

  // 레이어 추출 핸들러
  const handleExtractLayers = useCallback(async () => {
    if (!imageUrl) {
      alert('이미지가 로드되지 않았습니다.');
      return;
    }

    try {
      console.log('[EditorLayout] Starting layer extraction');
      console.log('[EditorLayout] Image URL length:', imageUrl.length);

      const result = await extractLayers(imageUrl, imageWidth, imageHeight);

      console.log('[EditorLayout] ✅ Extraction complete:', {
        textCount: result.stats.textCount,
        objectCount: result.stats.objectCount,
        reason: result.stats.reason,
      });

      // 추출된 레이어를 state에 저장
      setObjectLayers(result.objectLayers);
      setTextRegions(result.textLayers);
    } catch (error) {
      console.error('[EditorLayout] Layer extraction failed:', error);
    }
  }, [imageUrl, imageWidth, imageHeight, extractLayers]);

  // Auto-extract layers on mount
  useEffect(() => {
    if (imageUrl && !extractionResult && !isExtractingLayers) {
      handleExtractLayers();
    }
  }, [imageUrl, extractionResult, isExtractingLayers, handleExtractLayers]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Tool Panel */}
      <ToolPanel
        onReset={onReset}
        onExport={handleExport}
        onCopy={handleCopy}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onRerunOCR={onRerunOCR}
        disabled={!canvas}
      />

      {/* Layer Extraction Button */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b border-purple-200 dark:border-purple-800 px-4 py-3">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handleExtractLayers}
            disabled={isExtractingLayers}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {isExtractingLayers ? (
              <span className="flex items-center space-x-2">
                <LoadingSpinner />
                <span>레이어 추출 중...</span>
              </span>
            ) : (
              '🎨 레이어 추출 (텍스트 + 객체)'
            )}
          </button>
          {extractionResult && extractionResult.stats.reason === 'SEGMENTER_NOT_CONFIGURED' && (
            <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg font-medium">
              ⚠️ 세그멘테이션 서버 미설정: 객체는 0개가 정상입니다. (텍스트 정렬만 확인하세요)
            </div>
          )}
          {extractionResult && !extractionResult.stats.reason && objectLayers.length > 0 && (
            <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg font-medium">
              ✅ 추출 완료: 텍스트 {textRegions.length}개, 객체 {objectLayers.length}개
            </div>
          )}
          {extractionError && (
            <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg font-medium">
              ❌ 오류: {extractionError}
            </div>
          )}
        </div>
      </div>

      {/* Slide Navigation (if multi-slide) */}
      {totalSlides && totalSlides > 1 && currentSlide !== undefined && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={onPrevSlide}
              disabled={currentSlide === 0}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← 이전 슬라이드
            </button>

            <div className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold">
              {currentSlide + 1} / {totalSlides}
            </div>

            <button
              onClick={onNextSlide}
              disabled={currentSlide >= totalSlides - 1}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              다음 슬라이드 →
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
          <TextSidebar
            textRegions={textRegions}
            selectedRegionId={selectedRegionId}
            onRegionSelect={handleTextSelect}
            onRegionDelete={handleRegionDelete}
          />
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
          <div className="max-w-full max-h-full">
            <CanvasEditor
              imageUrl={imageUrl}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              textRegions={textRegions}
              objectLayers={objectLayers.length > 0 ? objectLayers : undefined}
              onTextSelect={handleTextSelect}
              onTextUpdate={handleTextUpdate}
              onCanvasReady={canvasRefCallback}
              onHistoryReady={historyRefCallback}
            />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
          <TextStyleControls selectedRegion={selectedRegion} onStyleChange={handleStyleChange} />
        </div>
      </div>
    </div>
  );
}
