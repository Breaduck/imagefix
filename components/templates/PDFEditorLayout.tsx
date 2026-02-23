/**
 * PDF 편집기 레이아웃
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PDFCanvasEditor } from '@/components/organisms/PDFCanvasEditor';
import { TextSidebar } from '@/components/organisms/TextSidebar';
import { TextStyleControls } from '@/components/molecules/TextStyleControls';
import { ToolPanel } from '@/components/organisms/ToolPanel';
import { PDFPageData, PDFTextRegion } from '@/types/pdf.types';
import { TextRegion } from '@/types/canvas.types';
import { useExport } from '@/hooks/useExport';
import { fabric } from 'fabric';
import { CanvasHistory } from '@/lib/canvas/history-manager';

export interface PDFEditorLayoutProps {
  pageData: PDFPageData;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onReset: () => void;
}

export function PDFEditorLayout({ pageData, currentPage, totalPages, onPageChange, onReset }: PDFEditorLayoutProps) {
  // PDF TextRegion을 일반 TextRegion으로 변환
  const convertToTextRegions = useCallback((pdfRegions: PDFTextRegion[]): TextRegion[] => {
    return pdfRegions.map((region) => ({
      id: region.id,
      text: region.text,
      position: region.position,
      size: region.size,
      style: {
        fontSize: region.style.fontSize,
        fontFamily: region.fontInfo.webFont,
        color: region.style.color,
        rotation: region.style.rotation,
        align: 'left',
        lineHeight: 1.2,
        fontWeight: 'normal',
        fontStyle: 'normal',
        underline: false,
      },
      confidence: 100, // PDF는 신뢰도 100%
    }));
  }, []);

  const [textRegions, setTextRegions] = useState<TextRegion[]>(
    convertToTextRegions(pageData.textRegions)
  );

  // 🔥 페이지 변경 시 textRegions 업데이트
  useEffect(() => {
    console.log(`[PDFEditorLayout] Page changed to ${pageData.pageNumber}, updating text regions`);
    console.log(`[PDFEditorLayout] Total text regions: ${pageData.textRegions.length}`);
    setTextRegions(convertToTextRegions(pageData.textRegions));
  }, [pageData.pageNumber, pageData.textRegions, convertToTextRegions]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const historyRef = useRef<CanvasHistory | null>(null);

  const historyRefCallback = useCallback((history: CanvasHistory) => {
    historyRef.current = history;
  }, []);

  const { exportAsPNG, exportAsJPEG, copyToClipboard, isClipboardAvailable } = useExport();

  const selectedRegion = textRegions.find((r) => r.id === selectedRegionId) || null;

  const handleTextSelect = useCallback((regionId: string | null) => {
    setSelectedRegionId(regionId);
  }, []);

  const handleTextUpdate = useCallback((regionId: string, newText: string) => {
    setTextRegions((prev) =>
      prev.map((region) => (region.id === regionId ? { ...region, text: newText } : region))
    );
  }, []);

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

      const objects = canvas.getObjects();
      const textObject = objects.find(
        (obj: any) => obj.pdfRegionId === selectedRegionId
      ) as fabric.IText;

      if (textObject) {
        if (style.fontSize !== undefined) textObject.set({ fontSize: style.fontSize });
        if (style.color !== undefined) textObject.set({ fill: style.color });
        if (style.rotation !== undefined) textObject.set({ angle: style.rotation });
        if (style.fontFamily !== undefined) textObject.set({ fontFamily: style.fontFamily });
        if (style.fontWeight !== undefined) textObject.set({ fontWeight: style.fontWeight });
        if (style.fontStyle !== undefined) textObject.set({ fontStyle: style.fontStyle });
        if (style.underline !== undefined) textObject.set({ underline: style.underline });
        if (style.align !== undefined) textObject.set({ textAlign: style.align });
        canvas.renderAll();
      }
    },
    [selectedRegionId, canvas]
  );

  const handleRegionDelete = useCallback(
    (regionId: string) => {
      setTextRegions((prev) => prev.filter((r) => r.id !== regionId));

      if (canvas) {
        const objects = canvas.getObjects();
        const toRemove = objects.filter((obj: any) => obj.pdfRegionId === regionId);
        toRemove.forEach((obj) => canvas.remove(obj));
        canvas.renderAll();
      }

      if (selectedRegionId === regionId) {
        setSelectedRegionId(null);
      }
    },
    [canvas, selectedRegionId]
  );

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

  const handleUndo = useCallback(() => {
    if (historyRef.current) {
      historyRef.current.undo();
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyRef.current) {
      historyRef.current.redo();
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <ToolPanel
        onReset={onReset}
        onExport={handleExport}
        onCopy={handleCopy}
        onUndo={handleUndo}
        onRedo={handleRedo}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        disabled={!canvas}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
          <TextSidebar
            textRegions={textRegions}
            selectedRegionId={selectedRegionId}
            onRegionSelect={handleTextSelect}
            onRegionDelete={handleRegionDelete}
          />
        </div>

        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
          <PDFCanvasEditor
            pageData={pageData}
            onTextSelect={handleTextSelect}
            onTextUpdate={handleTextUpdate}
            onHistoryReady={historyRefCallback}
          />
        </div>

        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
          <TextStyleControls selectedRegion={selectedRegion} onStyleChange={handleStyleChange} />
        </div>
      </div>
    </div>
  );
}
