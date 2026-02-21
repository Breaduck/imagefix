/**
 * 텍스트 목록 사이드바
 */

'use client';

import React from 'react';
import { TextRegion } from '@/types/canvas.types';

export interface TextSidebarProps {
  textRegions: TextRegion[];
  selectedRegionId: string | null;
  onRegionSelect: (regionId: string) => void;
  onRegionDelete: (regionId: string) => void;
}

export function TextSidebar({
  textRegions,
  selectedRegionId,
  onRegionSelect,
  onRegionDelete,
}: TextSidebarProps) {
  if (textRegions.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-500 text-center">추출된 텍스트가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg mb-3">텍스트 목록 ({textRegions.length})</h3>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {textRegions.map((region) => (
          <div
            key={region.id}
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedRegionId === region.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
            }`}
            onClick={() => onRegionSelect(region.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{region.text}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <span>{region.style.fontSize}px</span>
                  <span>•</span>
                  <span
                    className="inline-block w-3 h-3 rounded border border-gray-300"
                    style={{ backgroundColor: region.style.color }}
                  />
                  <span>•</span>
                  <span>{region.confidence.toFixed(0)}%</span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRegionDelete(region.id);
                }}
                className="flex-shrink-0 text-red-500 hover:text-red-700 transition-colors"
                title="삭제"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
