/**
 * 텍스트 스타일 컨트롤 패널
 */

'use client';

import React from 'react';
import { TextRegion } from '@/types/canvas.types';

export interface TextStyleControlsProps {
  selectedRegion: TextRegion | null;
  onStyleChange: (style: Partial<TextRegion['style']>) => void;
}

export function TextStyleControls({ selectedRegion, onStyleChange }: TextStyleControlsProps) {
  if (!selectedRegion) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 text-center">텍스트를 선택하여 스타일을 편집하세요</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
      <h3 className="font-semibold text-lg mb-3">텍스트 스타일</h3>

      {/* Font Size */}
      <div>
        <label className="block text-sm font-medium mb-2">
          폰트 크기: {selectedRegion.style.fontSize}px
        </label>
        <input
          type="range"
          min="8"
          max="72"
          value={selectedRegion.style.fontSize}
          onChange={(e) => onStyleChange({ fontSize: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium mb-2">색상</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={selectedRegion.style.color}
            onChange={(e) => onStyleChange({ color: e.target.value })}
            className="h-10 w-20 rounded cursor-pointer"
          />
          <input
            type="text"
            value={selectedRegion.style.color}
            onChange={(e) => onStyleChange({ color: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="#000000"
          />
        </div>
      </div>

      {/* Rotation */}
      <div>
        <label className="block text-sm font-medium mb-2">
          회전: {selectedRegion.style.rotation}°
        </label>
        <input
          type="range"
          min="-180"
          max="180"
          value={selectedRegion.style.rotation}
          onChange={(e) => onStyleChange({ rotation: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Text Info */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500">
          위치: ({Math.round(selectedRegion.position.x)}, {Math.round(selectedRegion.position.y)})
        </p>
        <p className="text-xs text-gray-500">
          크기: {Math.round(selectedRegion.size.width)} x {Math.round(selectedRegion.size.height)}
        </p>
        <p className="text-xs text-gray-500">신뢰도: {selectedRegion.confidence.toFixed(1)}%</p>
      </div>
    </div>
  );
}
