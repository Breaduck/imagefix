/**
 * PDF 전용 캔버스 편집기 컴포넌트
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { fabric } from 'fabric';
import { useFabricCanvas } from '@/hooks/useFabricCanvas';
import { PDFPageData, PDFTextRegion } from '@/types/pdf.types';
import { addPDFPageAsBackground, renderPDFTextRegions } from '@/lib/pdf/pdf-canvas-renderer';
import { CanvasHistory } from '@/lib/canvas/history-manager';

export interface PDFCanvasEditorProps {
  pageData: PDFPageData;
  onTextSelect?: (regionId: string | null) => void;
  onTextUpdate?: (regionId: string, newText: string) => void;
  onHistoryReady?: (history: CanvasHistory) => void;
}

export function PDFCanvasEditor({ pageData, onTextSelect, onTextUpdate, onHistoryReady }: PDFCanvasEditorProps) {
  const { canvas, canvasRef, isReady } = useFabricCanvas(
    pageData.viewport.width,
    pageData.viewport.height
  );
  const [isLoading, setIsLoading] = useState(true);
  const historyRef = useRef<CanvasHistory | null>(null);

  // 히스토리 매니저 초기화 및 키보드 단축키 설정
  useEffect(() => {
    if (!canvas || !isReady) return;

    // 히스토리 매니저 생성
    historyRef.current = new CanvasHistory(canvas);

    // 키보드 단축키 설정 (Ctrl+Z, Ctrl+Y)
    const cleanup = historyRef.current.setupKeyboardShortcuts();

    // 부모 컴포넌트에 히스토리 매니저 전달
    if (onHistoryReady && historyRef.current) {
      onHistoryReady(historyRef.current);
    }

    console.log('[PDFCanvasEditor] History manager initialized with keyboard shortcuts');

    return () => {
      cleanup();
      historyRef.current = null;
    };
  }, [canvas, isReady, onHistoryReady]);

  // PDF 페이지 렌더링
  useEffect(() => {
    if (!canvas || !pageData) return;

    console.log(`[PDFCanvasEditor] Rendering PDF page ${pageData.pageNumber}`);
    setIsLoading(true);
    let isMounted = true;

    // Pause history tracking during page change
    if (historyRef.current) {
      historyRef.current.startProgrammaticUpdate();
    }

    // 🔥 CRITICAL: Clear canvas before rendering new page
    console.log(`[PDFCanvasEditor] Clearing canvas (current objects: ${canvas.getObjects().length})`);
    canvas.clear();

    // 1. 배경 이미지 추가 (텍스트 제거 베이킹 포함)
    addPDFPageAsBackground(canvas, pageData.canvas, pageData.textRegions)
      .then(() => {
        if (!isMounted) return;
        console.log(`[PDFCanvasEditor] Background added for page ${pageData.pageNumber}`);

        // 2. 텍스트 영역 렌더링
        console.log(`[PDFCanvasEditor] Rendering ${pageData.textRegions.length} text regions`);
        renderPDFTextRegions(canvas, pageData.textRegions);

        // 캔버스 검증
        const objects = canvas.getObjects();
        const types = objects.map((o: any) => o.type);
        const bgInfo = canvas.backgroundImage ? 'set' : 'none';
        console.log(`[Canvas] objects=${types.join(',')} bg=${bgInfo}`);
        console.log(`[PDFCanvasEditor] ✅ Page ${pageData.pageNumber} rendered (total objects: ${canvas.getObjects().length})`);
        setIsLoading(false);

        // Resume history tracking and reset to current state as "first state"
        if (historyRef.current) {
          historyRef.current.endProgrammaticUpdate();
          historyRef.current.clear(); // 현재 상태를 첫 번째 상태로 설정
          console.log('[PDFCanvasEditor] History reset - current state is now the baseline');
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('[PDFCanvasEditor] Failed to render PDF page:', error);
        setIsLoading(false);

        // Resume history tracking even on error
        if (historyRef.current) {
          historyRef.current.endProgrammaticUpdate();
        }
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

  // 텍스트 수정 이벤트 (편집 완료 시에만)
  useEffect(() => {
    if (!canvas || !onTextUpdate) return;

    const handleTextChange = (e: fabric.IEvent) => {
      const target = e.target as fabric.IText;
      if (target && (target as any).pdfRegionId && target.text) {
        onTextUpdate((target as any).pdfRegionId, target.text);
      }
    };

    // 편집이 끝날 때만 업데이트 (편집 중에는 업데이트하지 않음)
    canvas.on('text:editing:exited', handleTextChange);

    return () => {
      canvas.off('text:editing:exited', handleTextChange);
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
