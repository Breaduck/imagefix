/**
 * PDF 편집기 레이아웃
 */

'use client';

import React, { useState, useCallback } from 'react';
import { PDFCanvasEditor } from '@/components/organisms/PDFCanvasEditor';
import { TextSidebar } from '@/components/organisms/TextSidebar';
import { TextStyleControls } from '@/components/molecules/TextStyleControls';
import { ToolPanel } from '@/components/organisms/ToolPanel';
import { PDFPageData, PDFTextRegion } from '@/types/pdf.types';
import { TextRegion } from '@/types/canvas.types';
import { useExport } from '@/hooks/useExport';
import { fabric } from 'fabric';

export interface PDFEditorLayoutProps {
  pageData: PDFPageData;
  onReset: () => void;
}

export function PDFEditorLayout({ pageData, onReset }: PDFEditorLayoutProps) {
  // PDF TextRegion을 일반 TextRegion으로 변환
  const convertToTextRegions = (pdfRegions: PDFTextRegion[]): TextRegion[] => {
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
      },
      confidence: 100, // PDF는 신뢰도 100%
    }));
  };

  const [textRegions, setTextRegions] = useState<TextRegion[]>(
    convertToTextRegions(pageData.textRegions)
  );
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);

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
      ) as fabric.Text;

      if (textObject) {
        if (style.fontSize !== undefined) textObject.set({ fontSize: style.fontSize });
        if (style.color !== undefined) textObject.set({ fill: style.color });
        if (style.rotation !== undefined) textObject.set({ angle: style.rotation });
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

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <ToolPanel onReset={onReset} onExport={handleExport} onCopy={handleCopy} disabled={!canvas} />

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
          />
        </div>

        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
          <TextStyleControls selectedRegion={selectedRegion} onStyleChange={handleStyleChange} />
        </div>
      </div>
    </div>
  );
}
