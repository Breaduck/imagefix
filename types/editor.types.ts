/**
 * 편집기 관련 타입 정의
 */

import { fabric } from 'fabric';
import { TextRegion } from './canvas.types';

export type EditorStage =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'editing'
  | 'exporting';

export interface EditorImage {
  file: File | null;
  dataUrl: string | null;
  dimensions: { width: number; height: number };
  displayScale: number;
  originalScale: number;
}

export interface EditorState {
  stage: EditorStage;
  image: EditorImage;
  ocr: {
    isProcessing: boolean;
    progress: number;
    error: string | null;
  };
  textRegions: TextRegion[];
  selectedTextId: string | null;
  canvas: fabric.Canvas | null;
}

export interface ExportOptions {
  format: 'png' | 'jpeg';
  quality: number; // 0-1 for JPEG
  scale: number; // Export scale multiplier
}
