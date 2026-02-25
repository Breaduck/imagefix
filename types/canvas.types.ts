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
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  underline: boolean;
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

/**
 * 비텍스트 객체 레이어 (이미지, 도형 등)
 * 모든 좌표는 원본 이미지 픽셀 기준
 */
export interface ObjectLayer {
  id: string;
  pngDataUrl: string; // RGBA PNG data URL
  x: number; // 원본 이미지 기준 x
  y: number; // 원본 이미지 기준 y
  width: number; // 원본 이미지 기준 width
  height: number; // 원본 이미지 기준 height
  fabricObject?: fabric.Image;
}

/**
 * 레이어 추출 API 응답
 */
export interface LayerExtractionResult {
  textLayers: TextRegion[];
  objectLayers: ObjectLayer[];
  stats: {
    textCount: number;
    objectCount: number;
    processingTimeMs: number;
  };
}
