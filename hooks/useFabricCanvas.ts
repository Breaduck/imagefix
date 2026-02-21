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
    if (!canvasRef.current) return;

    // 캔버스 초기화
    const fabricCanvas = initCanvas(canvasRef.current, width, height);
    setCanvas(fabricCanvas);
    setIsReady(true);

    // 정리 함수
    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
    };
  }, [width, height]);

  return {
    canvas,
    canvasRef,
    isReady,
  };
}
