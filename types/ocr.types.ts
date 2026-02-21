/**
 * OCR 관련 타입 정의
 */

export interface BoundingBox {
  x0: number; // Top-left X
  y0: number; // Top-left Y
  x1: number; // Bottom-right X
  y1: number; // Bottom-right Y
}

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface Baseline {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  hasDropCap: boolean;
}

export interface OCRResult {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  baseline: Baseline;
  words: OCRWord[];
}

export interface OCRProgress {
  status: string;
  progress: number;
}
