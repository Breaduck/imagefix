/**
 * PDF 전용 캔버스 편집기 컴포넌트
 */

'use client';

import React, { useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { useFabricCanvas } from '@/hooks/useFabricCanvas';
import { PDFPageData, PDFTextRegion } from '@/types/pdf.types';
import { addPDFPageAsBackground, renderPDFTextRegions } from '@/lib/pdf/pdf-canvas-renderer';

export interface PDFCanvasEditorProps {
  pageData: PDFPageData;
  onTextSelect?: (regionId: string | null) => void;
  onTextUpdate?: (regionId: string, newText: string) => void;
}

export function PDFCanvasEditor({ pageData, onTextSelect, onTextUpdate }: PDFCanvasEditorProps) {
  const { canvas, canvasRef, isReady } = useFabricCanvas(
    pageData.viewport.width,
    pageData.viewport.height
  );
  const [isLoading, setIsLoading] = useState(true);

  // PDF 페이지 렌더링
  useEffect(() => {
    if (!canvas || !pageData) return;

    setIsLoading(true);
    let isMounted = true;

    // 1. 배경 이미지 추가
    addPDFPageAsBackground(canvas, pageData.canvas)
      .then(() => {
        if (!isMounted) return;
        // 2. 텍스트 영역 렌더링
        renderPDFTextRegions(canvas, pageData.textRegions);
        setIsLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Failed to render PDF page:', error);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [canvas, pageData]);

  // 텍스트 선택 이벤트
  useEffect(() => {
    if (!canvas || !onTextSelect) return;

    const handleSelection = (e: fabric.IEvent) => {
      const target = e.selected?.[0];
      if (target && (target as any).pdfRegionId) {
        onTextSelect((target as any).pdfRegionId);
      } else {
        onTextSelect(null);
      }
    };

    const handleDeselection = () => {
      onTextSelect(null);
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleDeselection);

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleDeselection);
    };
  }, [canvas, onTextSelect]);

  // 텍스트 수정 이벤트
  useEffect(() => {
    if (!canvas || !onTextUpdate) return;

    const handleTextChange = (e: fabric.IEvent) => {
      const target = e.target as fabric.Text;
      if (target && (target as any).pdfRegionId && target.text) {
        onTextUpdate((target as any).pdfRegionId, target.text);
      }
    };

    canvas.on('text:changed', handleTextChange);

    return () => {
      canvas.off('text:changed', handleTextChange);
    };
  }, [canvas, onTextUpdate]);

  return (
    <div className="relative">
      {!isReady && (
        <div className="flex items-center justify-center w-full min-h-[400px] bg-gray-100 rounded-lg">
          <p className="text-gray-500">캔버스 초기화 중...</p>
        </div>
      )}
      {isLoading && isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <p className="text-gray-500">PDF 렌더링 중...</p>
        </div>
      )}
      <div suppressHydrationWarning>
        <canvas
          ref={canvasRef}
          className="border border-gray-300 rounded-lg shadow-sm"
          suppressHydrationWarning
        />
      </div>
    </div>
  );
}
