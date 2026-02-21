/**
 * 캔버스 관련 타입 정의
 */

import { fabric } from 'fabric';
import { BoundingBox } from './ocr.types';

export interface TextStyle {
  fontSize: number;
  fontFamily: string; // Changed from 'Pretendard' to support PDF fonts
  color: string;
  rotation: number;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
}

export interface TextRegion {
  id: string;
  text: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: TextStyle;
  confidence: number;
  fabricObject?: fabric.Text;
}

export interface BackgroundMask {
  id: string;
  bbox: BoundingBox;
  fillColor: string;
  fabricObject?: fabric.Rect;
}

export interface CanvasState {
  canvas: fabric.Canvas | null;
  textRegions: TextRegion[];
  backgroundMasks: BackgroundMask[];
  selectedTextId: string | null;
}
