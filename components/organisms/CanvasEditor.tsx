/**
 * 메인 캔버스 편집기 컴포넌트
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { fabric } from 'fabric';
import { useFabricCanvas } from '@/hooks/useFabricCanvas';
import { TextRegion } from '@/types/canvas.types';
import { bakeTextMasksToBackground } from '@/lib/canvas/background-baker';
import { CanvasHistory } from '@/lib/canvas/history-manager';

export interface CanvasEditorProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  textRegions: TextRegion[];
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
  onTextSelect,
  onTextUpdate,
  onCanvasReady,
  onHistoryReady,
}: CanvasEditorProps) {
  const { canvas, canvasRef, isReady } = useFabricCanvas(imageWidth, imageHeight);
  const [backgroundImg, setBackgroundImg] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const historyRef = useRef<CanvasHistory | null>(null);

  // Canvas ready callback
  useEffect(() => {
    if (canvas && isReady && onCanvasReady) {
      onCanvasReady(canvas);
    }
  }, [canvas, isReady, onCanvasReady]);

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

    console.log('[CanvasEditor] History manager initialized with keyboard shortcuts');

    return () => {
      cleanup();
      historyRef.current = null;
    };
  }, [canvas, isReady, onHistoryReady]);

  // 배경 이미지 로드 (베이킹용, Fabric 오브젝트로 추가하지 않음!)
  useEffect(() => {
    if (!canvas || !imageUrl) {
      console.log('[CanvasEditor] Waiting for canvas or imageUrl', { canvas: !!canvas, imageUrl: !!imageUrl });
      return;
    }

    console.log('[CanvasEditor] Loading background image (for baking only, not as Fabric object)');
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

      console.log('[CanvasEditor] ✅ Image loaded:', {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.width,
        displayHeight: img.height,
      });

      // 기존 배경 오브젝트 제거 (이중 배경 방지)
      const existingBgObjects = canvas.getObjects().filter((obj: any) =>
        obj.layerName === 'background-image' || obj.type === 'image'
      );
      existingBgObjects.forEach((obj) => {
        console.log('[CanvasEditor] Removing existing background object:', obj.type);
        canvas.remove(obj);
      });

      setBackgroundImg(img);
      setIsLoading(false);
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

  // 텍스트 영역 렌더링 with Background Baking (No Mask Objects!)
  useEffect(() => {
    if (!canvas || !backgroundImg) {
      console.log('[CanvasEditor] Waiting for canvas or backgroundImg', { canvas: !!canvas, backgroundImg: !!backgroundImg });
      return;
    }

    if (textRegions.length === 0) {
      console.log('[CanvasEditor] No text regions to render');
      return;
    }

    console.log('[CanvasEditor] 🔥 Rendering', textRegions.length, 'text regions with background baking');

    let isMounted = true;

    const renderWithBaking = async () => {
      try {
        // Pause history tracking during programmatic setup
        if (historyRef.current) {
          historyRef.current.startProgrammaticUpdate();
        }

        // 기존 텍스트 레이어 제거
        const existingTexts = canvas.getObjects().filter((obj: any) => obj.layerName === 'editable-text');
        existingTexts.forEach((obj) => canvas.remove(obj));

        // Step 1: Create background canvas from image (naturalWidth/naturalHeight 사용)
        const bgCanvas = document.createElement('canvas');
        const bgCtx = bgCanvas.getContext('2d', { willReadFrequently: true });

        if (!bgCtx) {
          throw new Error('Failed to get canvas context');
        }

        // naturalWidth/naturalHeight를 사용하여 좌표계 정합성 보장
        bgCanvas.width = backgroundImg.naturalWidth;
        bgCanvas.height = backgroundImg.naturalHeight;
        bgCtx.drawImage(backgroundImg, 0, 0);

        console.log('[CanvasEditor] 📏 Background dimensions:', {
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          bgCanvasWidth: bgCanvas.width,
          bgCanvasHeight: bgCanvas.height,
          naturalWidth: backgroundImg.naturalWidth,
          naturalHeight: backgroundImg.naturalHeight,
        });

        // 스케일 factor 계산 (region bbox는 Fabric canvas 좌표계)
        const scaleX = bgCanvas.width / (canvas.width || 1);
        const scaleY = bgCanvas.height / (canvas.height || 1);

        console.log('[CanvasEditor] 📐 Scale factors:', { scaleX, scaleY });

        // 좌표계 변환된 textRegions 생성
        const scaledRegions = textRegions.map((region) => ({
          ...region,
          position: {
            x: region.position.x * scaleX,
            y: region.position.y * scaleY,
          },
          size: {
            width: region.size.width * scaleX,
            height: region.size.height * scaleY,
          },
        }));

        // Step 2: Bake text masks into background (NO FABRIC OBJECTS!)
        console.log('[CanvasEditor] 🔥 Baking text masks to background...');
        const bakedBackground = await bakeTextMasksToBackground(bgCanvas, scaledRegions, {
          method: 'smart',
        });

        if (!isMounted) return;

        // Step 3: Set baked background as canvas background
        console.log('[CanvasEditor] Setting baked background as canvas background');
        const bakedDataUrl = bakedBackground.toDataURL();

        console.log('[CanvasEditor] 🖼️ Baked background dataURL length:', bakedDataUrl.length);

        canvas.setBackgroundImage(
          bakedDataUrl,
          () => {
            if (!isMounted) return;

            canvas.renderAll();
            console.log('[CanvasEditor] ✅ Baked background set');

            // 디버그: 현재 캔버스 오브젝트 타입 출력
            const objectTypes = canvas.getObjects().map((o: any) => o.type);
            console.log('[CanvasEditor] 🔍 Canvas objects before adding text:', objectTypes);

            // Step 4: Add only text objects (no masks!)
            textRegions.forEach((region, index) => {
              if (index < 3) {
                console.log(`[CanvasEditor] Adding text object ${index}:`, {
                  text: region.text.substring(0, 30),
                  position: region.position,
                  fontSize: region.style.fontSize,
                });
              }

              const textObj = new fabric.IText(region.text, {
                left: region.position.x,
                top: region.position.y,
                fontSize: region.style.fontSize || 16,
                fontFamily: region.style.fontFamily || 'Pretendard, sans-serif',
                fill: region.style.color || '#000000',
                fontWeight: region.style.fontWeight || 'normal',
                fontStyle: region.style.fontStyle || 'normal',
                angle: region.style.rotation || 0,
                selectable: true,
                editable: true,
              });

              // Metadata for tracking
              (textObj as any).regionId = region.id;
              (textObj as any).layerName = 'editable-text';

              canvas.add(textObj);
            });

            canvas.renderAll();

            // Resume history tracking after setup is complete
            if (historyRef.current) {
              historyRef.current.endProgrammaticUpdate();
            }

            // 디버그: 최종 캔버스 오브젝트 타입 출력
            const finalObjectTypes = canvas.getObjects().map((o: any) => o.type);
            console.log('[CanvasEditor] 🔍 Final canvas objects:', finalObjectTypes);
            console.log('[CanvasEditor] ✅ Text objects added. Total objects:', canvas.getObjects().length);
            console.log('[CanvasEditor] 🎉 Background baking complete - NO MASK/IMAGE OBJECTS!');
          },
          {
            crossOrigin: 'anonymous',
          }
        );
      } catch (error) {
        console.error('[CanvasEditor] Failed to render with background baking:', error);

        // Resume history tracking even on error
        if (historyRef.current) {
          historyRef.current.endProgrammaticUpdate();
        }
      }
    };

    renderWithBaking();

    return () => {
      isMounted = false;
    };
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

  // 텍스트 수정 이벤트 (편집 완료 시에만)
  useEffect(() => {
    if (!canvas || !onTextUpdate) return;

    const handleTextChange = (e: fabric.IEvent) => {
      const target = e.target as fabric.IText;
      if (target && (target as any).regionId && target.text) {
        onTextUpdate((target as any).regionId, target.text);
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
