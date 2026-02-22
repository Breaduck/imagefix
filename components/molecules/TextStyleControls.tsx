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
  // 모든 마우스 이벤트에서 캔버스 선택 해제 방지
  const preventCanvasDeselect = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  if (!selectedRegion) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 text-center">텍스트를 선택하여 스타일을 편집하세요</p>
      </div>
    );
  }

  return (
    <div
      className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4"
      onMouseDown={preventCanvasDeselect}
      onMouseMove={preventCanvasDeselect}
      onMouseUp={preventCanvasDeselect}
      onClick={preventCanvasDeselect}
      onPointerDown={preventCanvasDeselect}
      onPointerMove={preventCanvasDeselect}
      onPointerUp={preventCanvasDeselect}
    >
      <h3 className="font-semibold text-lg mb-3">텍스트 스타일</h3>

      {/* Font Family */}
      <div>
        <label className="block text-sm font-medium mb-2">폰트</label>
        <select
          value={selectedRegion.style.fontFamily}
          onChange={(e) => onStyleChange({ fontFamily: e.target.value })}
          onMouseDown={preventCanvasDeselect}
          onClick={preventCanvasDeselect}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="Pretendard">Pretendard</option>
          <option value="Noto Sans KR">Noto Sans KR</option>
          <option value="Malgun Gothic">맑은 고딕</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>
      </div>

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
          onMouseDown={preventCanvasDeselect}
          onMouseMove={preventCanvasDeselect}
          onMouseUp={preventCanvasDeselect}
          className="w-full"
        />
      </div>

      {/* Text Formatting */}
      <div>
        <label className="block text-sm font-medium mb-2">서식</label>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => onStyleChange({
              fontWeight: selectedRegion.style.fontWeight === 'bold' ? 'normal' : 'bold'
            })}
            onMouseDown={preventCanvasDeselect}
            className={`flex-1 px-3 py-2 border rounded-lg font-bold transition-colors ${
              selectedRegion.style.fontWeight === 'bold'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
            title="굵게 (Ctrl+B)"
          >
            B
          </button>
          <button
            onClick={() => onStyleChange({
              fontStyle: selectedRegion.style.fontStyle === 'italic' ? 'normal' : 'italic'
            })}
            onMouseDown={preventCanvasDeselect}
            className={`flex-1 px-3 py-2 border rounded-lg italic transition-colors ${
              selectedRegion.style.fontStyle === 'italic'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
            title="기울임 (Ctrl+I)"
          >
            I
          </button>
          <button
            onClick={() => onStyleChange({
              underline: !selectedRegion.style.underline
            })}
            onMouseDown={preventCanvasDeselect}
            className={`flex-1 px-3 py-2 border rounded-lg underline transition-colors ${
              selectedRegion.style.underline
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
            title="밑줄 (Ctrl+U)"
          >
            U
          </button>
        </div>

        {/* Text Alignment */}
        <div className="flex gap-2">
          <button
            onClick={() => onStyleChange({ align: 'left' })}
            onMouseDown={preventCanvasDeselect}
            className={`flex-1 px-3 py-2 border rounded-lg transition-colors ${
              selectedRegion.style.align === 'left'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
            title="왼쪽 정렬"
          >
            <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4h14v2H3V4zm0 4h10v2H3V8zm0 4h14v2H3v-2zm0 4h10v2H3v-2z" />
            </svg>
          </button>
          <button
            onClick={() => onStyleChange({ align: 'center' })}
            onMouseDown={preventCanvasDeselect}
            className={`flex-1 px-3 py-2 border rounded-lg transition-colors ${
              selectedRegion.style.align === 'center'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
            title="가운데 정렬"
          >
            <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4h14v2H3V4zm2 4h10v2H5V8zm-2 4h14v2H3v-2zm2 4h10v2H5v-2z" />
            </svg>
          </button>
          <button
            onClick={() => onStyleChange({ align: 'right' })}
            onMouseDown={preventCanvasDeselect}
            className={`flex-1 px-3 py-2 border rounded-lg transition-colors ${
              selectedRegion.style.align === 'right'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
            title="오른쪽 정렬"
          >
            <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4h14v2H3V4zm4 4h10v2H7V8zm-4 4h14v2H3v-2zm4 4h10v2H7v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium mb-2">색상</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={selectedRegion.style.color}
            onChange={(e) => onStyleChange({ color: e.target.value })}
            onMouseDown={preventCanvasDeselect}
            onMouseMove={preventCanvasDeselect}
            onMouseUp={preventCanvasDeselect}
            onClick={preventCanvasDeselect}
            className="h-10 w-20 rounded cursor-pointer"
          />
          <input
            type="text"
            value={selectedRegion.style.color}
            onChange={(e) => onStyleChange({ color: e.target.value })}
            onMouseDown={preventCanvasDeselect}
            onClick={preventCanvasDeselect}
            onFocus={(e) => e.target.select()}
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
          onMouseDown={preventCanvasDeselect}
          onMouseMove={preventCanvasDeselect}
          onMouseUp={preventCanvasDeselect}
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
