/**
 * DOM Import hook - handles PNG + JSON import from NotebookLM extension
 */

'use client';

import { useState, useCallback } from 'react';
import { TextRegion } from '@/types/canvas.types';
import { DOMImportData, DOMLayer } from '@/types/dom.types';

interface DOMImportResult {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  textRegions: TextRegion[];
  source: DOMImportData['source'];
}

export function useDOMImport() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DOMImportResult | null>(null);

  /**
   * Convert DOMLayer to TextRegion format
   */
  const convertDOMLayerToTextRegion = (
    layer: DOMLayer,
    scaleX: number,
    scaleY: number
  ): TextRegion => {
    // Parse RGBA color to hex
    const parseRgbaToHex = (rgba: string): string => {
      const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!match) return '#000000';

      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);

      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    // Parse font weight
    const parseFontWeight = (weight: string): 'normal' | 'bold' => {
      const numWeight = parseInt(weight);
      if (!isNaN(numWeight)) {
        return numWeight >= 600 ? 'bold' : 'normal';
      }
      return weight === 'bold' ? 'bold' : 'normal';
    };

    // Parse font style
    const parseFontStyle = (style: string): 'normal' | 'italic' => {
      return style === 'italic' ? 'italic' : 'normal';
    };

    // Map font family to fallback fonts
    const mapFontFamily = (fontFamily: string): string => {
      // Prefer Korean-friendly fonts, fallback to system fonts
      const fonts = ['Pretendard', 'Noto Sans KR', 'Inter', fontFamily, 'sans-serif'];
      return fonts.join(', ');
    };

    return {
      id: layer.id,
      text: layer.text,
      position: {
        x: layer.bbox.x * scaleX,
        y: layer.bbox.y * scaleY,
      },
      size: {
        width: layer.bbox.w * scaleX,
        height: layer.bbox.h * scaleY,
      },
      style: {
        fontSize: layer.style.fontSizePx * scaleY,
        fontFamily: mapFontFamily(layer.style.fontFamily),
        color: parseRgbaToHex(layer.style.colorRgba),
        rotation: layer.rotationDeg,
        align: (layer.style.textAlign || 'left') as 'left' | 'center' | 'right',
        lineHeight: layer.style.lineHeightPx > 0
          ? layer.style.lineHeightPx / layer.style.fontSizePx
          : 1.2,
        fontWeight: parseFontWeight(layer.style.fontWeight),
        fontStyle: parseFontStyle(layer.style.fontStyle),
        underline: false,
      },
      confidence: 1.0, // DOM extraction is 100% accurate
    };
  };

  /**
   * Import DOM layers from PNG + JSON files
   */
  const importDOMFiles = useCallback(async (pngFile: File, jsonFile: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      console.log('[DOM Import] Starting import:', {
        png: pngFile.name,
        json: jsonFile.name,
      });

      // Read JSON file
      const jsonText = await jsonFile.text();
      const data: DOMImportData = JSON.parse(jsonText);

      // Validate schema
      if (!data.version || !data.source || !Array.isArray(data.layers)) {
        throw new Error('Invalid DOM import schema');
      }

      console.log('[DOM Import] Schema validated:', {
        version: data.version,
        layers: data.layers.length,
        slideSize: `${data.source.slideW}x${data.source.slideH}`,
      });

      // Read PNG file
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read PNG file'));
        reader.readAsDataURL(pngFile);
      });

      // Get PNG dimensions
      const { width: pngWidth, height: pngHeight } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('Failed to load PNG image'));
        img.src = imageUrl;
      });

      console.log('[DOM Import] PNG loaded:', {
        pngSize: `${pngWidth}x${pngHeight}`,
        jsonSize: `${data.source.slideW}x${data.source.slideH}`,
      });

      // Calculate coordinate scaling
      const scaleX = pngWidth / data.source.slideW;
      const scaleY = pngHeight / data.source.slideH;

      console.log('[DOM Import] Coordinate scale:', {
        scaleX: scaleX.toFixed(3),
        scaleY: scaleY.toFixed(3),
      });

      // Convert DOMLayers to TextRegions
      const textRegions = data.layers.map((layer) =>
        convertDOMLayerToTextRegion(layer, scaleX, scaleY)
      );

      console.log('[DOM Import] Conversion complete:', {
        textRegions: textRegions.length,
        sampleRegion: textRegions[0] ? {
          text: textRegions[0].text.substring(0, 20),
          fontSize: textRegions[0].style.fontSize,
          position: textRegions[0].position,
        } : null,
      });

      const importResult: DOMImportResult = {
        imageUrl,
        imageWidth: pngWidth,
        imageHeight: pngHeight,
        textRegions,
        source: data.source,
      };

      setResult(importResult);
      setIsProcessing(false);

      return importResult;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[DOM Import] Error:', errorMsg, err);
      setError(errorMsg);
      setIsProcessing(false);
      throw err;
    }
  }, []);

  const clearResults = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isProcessing,
    error,
    result,
    importDOMFiles,
    clearResults,
  };
}
