/**
 * 메인 캔버스 편집기 컴포넌트
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { fabric } from 'fabric';
import { useFabricCanvas } from '@/hooks/useFabricCanvas';
import { TextRegion, ObjectLayer } from '@/types/canvas.types';
import { CanvasHistory } from '@/lib/canvas/history-manager';

export interface CanvasEditorProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  textRegions: TextRegion[];
  objectLayers?: ObjectLayer[];
  onTextSelect?: (regionId: string | null) => void;
  onTextUpdate?: (regionId: string, newText: string) => void;
  onCanvasReady?: (canvas: fabric.Canvas) => void;
  onHistoryReady?: (history: CanvasHistory) => void;
}

export function CanvasEditor({
  imageUrl,
  imageWidth,
  imageHeight,
  textRegions,
  objectLayers = [],
  onTextSelect,
  onTextUpdate,
  onCanvasReady,
  onHistoryReady,
}: CanvasEditorProps) {
  const { canvas, canvasRef, isReady } = useFabricCanvas(imageWidth, imageHeight);
  const [isLoading, setIsLoading] = useState(true);
  const historyRef = useRef<CanvasHistory | null>(null);

  // Track latest values without triggering re-renders
  const textRegionsRef = useRef(textRegions);
  const objectLayersRef = useRef(objectLayers);

  // Update refs when props change
  textRegionsRef.current = textRegions;
  objectLayersRef.current = objectLayers;

  // Canvas ready callback
  useEffect(() => {
    if (canvas && isReady && onCanvasReady) {
      onCanvasReady(canvas);
    }
  }, [canvas, isReady, onCanvasReady]);

  // 히스토리 매니저 초기화 및 키보드 단축키 설정
  useEffect(() => {
    if (!canvas || !isReady) return;

    historyRef.current = new CanvasHistory(canvas);
    const cleanup = historyRef.current.setupKeyboardShortcuts();

    if (onHistoryReady && historyRef.current) {
      onHistoryReady(historyRef.current);
    }

    return () => {
      cleanup();
      historyRef.current = null;
    };
  }, [canvas, isReady, onHistoryReady]);

  // 레이어 렌더링 (배경 이미지 + 객체 + 텍스트)
  useEffect(() => {
    if (!canvas || !imageUrl) return;

    let isMounted = true;
    setIsLoading(true);

    const renderLayers = async () => {
      try {
        if (historyRef.current) {
          historyRef.current.startProgrammaticUpdate();
        }

        // 기존 오브젝트 제거
        canvas.clear();

        // 스케일 계산 (source image -> canvas)
        const scaleX = (canvas.width || imageWidth) / imageWidth;
        const scaleY = (canvas.height || imageHeight) / imageHeight;

        console.log(`[Layer] scaleX=${scaleX.toFixed(3)} scaleY=${scaleY.toFixed(3)} canvasW/H=${canvas.width}/${canvas.height} srcW/H=${imageWidth}/${imageHeight}`);

        // 1. 배경 이미지 로드 및 추가
        fabric.Image.fromURL(
          imageUrl,
          (img) => {
            if (!isMounted) return;

            img.set({
              left: 0,
              top: 0,
              scaleX: scaleX,
              scaleY: scaleY,
              selectable: false,
              evented: false,
              opacity: 0.35,
            });

            (img as any).layerName = 'background-image';
            canvas.add(img);
            canvas.sendToBack(img);

            // 2. objectLayers 렌더링 (use ref for latest value)
            let objectsAdded = 0;
            const objectPromises = objectLayersRef.current.map((obj) => {
              return new Promise<void>((resolve) => {
                fabric.Image.fromURL(
                  obj.pngDataUrl,
                  (objImg) => {
                    if (!isMounted) {
                      resolve();
                      return;
                    }

                    const scaledLeft = obj.x * scaleX;
                    const scaledTop = obj.y * scaleY;
                    const scaledWidth = obj.width * scaleX;
                    const scaledHeight = obj.height * scaleY;

                    objImg.set({
                      left: scaledLeft,
                      top: scaledTop,
                      scaleX: scaledWidth / (objImg.width || 1),
                      scaleY: scaledHeight / (objImg.height || 1),
                      selectable: true,
                      evented: true,
                    });

                    (objImg as any).layerName = 'object-layer';
                    (objImg as any).objectId = obj.id;
                    canvas.add(objImg);
                    objectsAdded++;
                    resolve();
                  },
                  { crossOrigin: 'anonymous' }
                );
              });
            });

            Promise.all(objectPromises).then(() => {
              if (!isMounted) return;

              // 3. textRegions 렌더링 (use ref for latest value)
              const editableRegions = textRegionsRef.current.filter((r) => r.confidence >= 60);

              editableRegions.forEach((region) => {
                const scaledLeft = region.position.x * scaleX;
                const scaledTop = region.position.y * scaleY;
                const scaledWidth = region.size.width * scaleX;
                const scaledHeight = region.size.height * scaleY;

                // 배경 박스
                const bgRect = new fabric.Rect({
                  left: scaledLeft,
                  top: scaledTop,
                  width: scaledWidth,
                  height: scaledHeight,
                  fill: 'rgba(255, 255, 255, 0.8)',
                  selectable: false,
                  evented: false,
                });

                (bgRect as any).layerName = 'text-bg';
                (bgRect as any).regionId = region.id;
                canvas.add(bgRect);

                // 텍스트 객체
                const scaledFontSize = Math.max(10, Math.min(96, (region.style.fontSize || 16) * scaleY));

                const textObj = new fabric.IText(region.text, {
                  left: scaledLeft,
                  top: scaledTop,
                  fontSize: scaledFontSize,
                  fontFamily: region.style.fontFamily || 'Pretendard, sans-serif',
                  fill: region.style.color || '#000000',
                  fontWeight: region.style.fontWeight || 'normal',
                  fontStyle: region.style.fontStyle || 'normal',
                  angle: region.style.rotation || 0,
                  selectable: true,
                  editable: true,
                });

                (textObj as any).layerName = 'editable-text';
                (textObj as any).regionId = region.id;
                canvas.add(textObj);
              });

              console.log(`[Layer] render objects=${objectLayersRef.current.length} texts=${editableRegions.length}`);
              console.log(`[Layer] done objectsOnCanvas=${objectsAdded}`);

              canvas.renderAll();
              setIsLoading(false);

              if (historyRef.current) {
                historyRef.current.endProgrammaticUpdate();
              }
            });
          },
          { crossOrigin: 'anonymous' }
        );
      } catch (error) {
        console.error('[CanvasEditor] Failed to render layers:', error);
        setIsLoading(false);

        if (historyRef.current) {
          historyRef.current.endProgrammaticUpdate();
        }
      }
    };

    renderLayers();

    return () => {
      isMounted = false;
    };
    // Only re-render when canvas or imageUrl changes
    // textRegions and objectLayers are tracked via refs to prevent infinite loops
  }, [canvas, imageUrl]);

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
      const target = e.target as fabric.IText;
      if (target && (target as any).regionId && target.text) {
        onTextUpdate((target as any).regionId, target.text);
      }
    };

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
