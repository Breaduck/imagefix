/**
 * DOM Import types (from NotebookLM extension)
 */

export interface DOMLayerStyle {
  fontFamily: string;
  fontSizePx: number;
  fontWeight: string;
  fontStyle: string;
  colorRgba: string;
  letterSpacingPx: number;
  lineHeightPx: number;
  textAlign: string;
}

export interface DOMLayer {
  id: string;
  type: 'text-line';
  text: string;
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  style: DOMLayerStyle;
  rotationDeg: number;
  elements?: string[];
}

export interface DOMImportSource {
  url: string;
  title: string;
  dpr: number;
  slideW: number;
  slideH: number;
  slideX?: number;
  slideY?: number;
  createdAt: string;
}

export interface DOMImportData {
  version: number;
  source: DOMImportSource;
  layers: DOMLayer[];
}
