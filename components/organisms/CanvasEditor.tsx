/**
 * 메인 캔버스 편집기 컴포넌트
 */

'use client';

import React, { useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { useFabricCanvas } from '@/hooks/useFabricCanvas';
import { TextRegion } from '@/types/canvas.types';
import { addBackgroundImage } from '@/lib/canvas/fabric-utils';
import { renderTextRegions } from '@/lib/canvas/text-renderer';
import { extractBackgroundColor } from '@/lib/style/color-extractor';

export interface CanvasEditorProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  textRegions: TextRegion[];
  onTextSelect?: (regionId: string | null) => void;
  onTextUpdate?: (regionId: string, newText: string) => void;
  onCanvasReady?: (canvas: fabric.Canvas) => void;
}

export function CanvasEditor({
  imageUrl,
  imageWidth,
  imageHeight,
  textRegions,
  onTextSelect,
  onTextUpdate,
  onCanvasReady,
}: CanvasEditorProps) {
  const { canvas, canvasRef, isReady } = useFabricCanvas(imageWidth, imageHeight);
  const [backgroundImg, setBackgroundImg] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Canvas ready callback
  useEffect(() => {
    if (canvas && isReady && onCanvasReady) {
      onCanvasReady(canvas);
    }
  }, [canvas, isReady, onCanvasReady]);

  // 배경 이미지 로드
  useEffect(() => {
    if (!canvas || !imageUrl) {
      console.log('[CanvasEditor] Waiting for canvas or imageUrl', { canvas: !!canvas, imageUrl: !!imageUrl });
      return;
    }

    console.log('[CanvasEditor] Loading background image');
    setIsLoading(true);

    let isMounted = true;

    // 이미지 엘리먼트 로드
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      if (!isMounted) {
        console.log('[CanvasEditor] Component unmounted, skipping image load');
        return;
      }

      console.log('[CanvasEditor] Image loaded, adding to canvas');
      setBackgroundImg(img);

      // 캔버스에 배경 이미지 추가
      addBackgroundImage(canvas, imageUrl)
        .then(() => {
          if (!isMounted) return;
          console.log('[CanvasEditor] Background image added successfully');
          setIsLoading(false);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.error('[CanvasEditor] Failed to add background image:', error);
          setIsLoading(false);
        });
    };

    img.onerror = (error) => {
      if (!isMounted) return;
      console.error('[CanvasEditor] Failed to load background image:', error);
      setIsLoading(false);
    };

    return () => {
      isMounted = false;
    };
  }, [canvas, imageUrl]);

  // 텍스트 영역 렌더링
  useEffect(() => {
    if (!canvas || !backgroundImg) {
      console.log('[CanvasEditor] Waiting for canvas or backgroundImg', { canvas: !!canvas, backgroundImg: !!backgroundImg });
      return;
    }

    if (textRegions.length === 0) {
      console.log('[CanvasEditor] No text regions to render');
      return;
    }

    console.log('[CanvasEditor] Rendering', textRegions.length, 'text regions');

    try {
      // 기존 텍스트 레이어 제거
      const existingTexts = canvas.getObjects().filter((obj: any) => obj.layerName === 'editable-text');
      const existingMasks = canvas.getObjects().filter((obj: any) => obj.layerName === 'background-mask');

      existingTexts.forEach((obj) => canvas.remove(obj));
      existingMasks.forEach((obj) => canvas.remove(obj));

      // 각 텍스트 영역에 대해 배경색 추출 및 렌더링
      textRegions.forEach((region) => {
        const backgroundColor = extractBackgroundColor(backgroundImg, {
          x0: region.position.x,
          y0: region.position.y,
          x1: region.position.x + region.size.width,
          y1: region.position.y + region.size.height,
        });

        renderTextRegions(canvas, [region], backgroundColor);
      });

      canvas.renderAll();
      console.log('[CanvasEditor] Text regions rendered successfully');
    } catch (error) {
      console.error('[CanvasEditor] Failed to render text regions:', error);
    }
  }, [canvas, backgroundImg, textRegions]);

  // 텍스트 선택 이벤트
  useEffect(() => {
    if (!canvas || !onTextSelect) return;

    const handleSelection = (e: fabric.IEvent) => {
      const target = e.selected?.[0];
      if (target && (target as any).regionId) {
        onTextSelect((target as any).regionId);
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
      if (target && (target as any).regionId && target.text) {
        onTextUpdate((target as any).regionId, target.text);
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
          <p className="text-gray-500">이미지 로딩 중...</p>
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
