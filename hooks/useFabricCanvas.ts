/**
 * Fabric.js 캔버스 관리를 위한 React Hook
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { initCanvas, clearCanvas } from '@/lib/canvas/fabric-utils';

export interface UseFabricCanvasReturn {
  canvas: fabric.Canvas | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isReady: boolean;
}

export function useFabricCanvas(
  width: number = 800,
  height: number = 600
): UseFabricCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) {
      console.log('[useFabricCanvas] Canvas ref not ready');
      return;
    }

    // 이미 초기화된 경우 스킵
    if (canvas) {
      console.log('[useFabricCanvas] Canvas already initialized, skipping');
      return;
    }

    console.log('[useFabricCanvas] Initializing canvas:', width, 'x', height);

    try {
      // 캔버스 초기화
      const fabricCanvas = initCanvas(canvasRef.current, width, height);
      setCanvas(fabricCanvas);
      setIsReady(true);
      console.log('[useFabricCanvas] Canvas initialized successfully');
    } catch (error) {
      console.error('[useFabricCanvas] Failed to initialize canvas:', error);
    }
  }, [width, height]);

  // 컴포넌트 언마운트 시에만 정리
  useEffect(() => {
    return () => {
      if (canvas) {
        console.log('[useFabricCanvas] Component unmounting, disposing canvas');
        canvas.dispose();
      }
    };
  }, [canvas]);

  return {
    canvas,
    canvasRef,
    isReady,
  };
}
