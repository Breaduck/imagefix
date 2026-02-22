/**
 * 상단 도구 패널
 */

'use client';

import React from 'react';
import { Button } from '@/components/atoms/Button';

export interface ToolPanelProps {
  onReset: () => void;
  onExport: (format: 'png' | 'jpeg') => void;
  onCopy: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  disabled?: boolean;
  // PDF 페이지 네비게이션 (선택적)
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function ToolPanel({
  onReset,
  onExport,
  onCopy,
  onUndo,
  onRedo,
  disabled = false,
  currentPage,
  totalPages,
  onPageChange
}: ToolPanelProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        {/* Undo/Redo 버튼 */}
        {onUndo && (
          <Button onClick={onUndo} variant="outline" size="sm" disabled={disabled} title="되돌리기 (Ctrl+Z)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          </Button>
        )}
        {onRedo && (
          <Button onClick={onRedo} variant="outline" size="sm" disabled={disabled} title="다시 실행 (Ctrl+Y)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
              />
            </svg>
          </Button>
        )}

        {/* 구분선 */}
        {(onUndo || onRedo) && <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />}

        <Button onClick={onReset} variant="outline" size="sm" disabled={disabled}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          새로 시작
        </Button>
      </div>

      {/* PDF 페이지 네비게이션 (중앙) */}
      {currentPage !== undefined && totalPages !== undefined && totalPages > 1 && onPageChange && (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => onPageChange(currentPage - 1)}
            variant="outline"
            size="sm"
            disabled={disabled || currentPage <= 1}
            title="이전 페이지"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>

          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <span className="text-sm font-medium">페이지</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  onPageChange(page);
                }
              }}
              className="w-12 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              disabled={disabled}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">/ {totalPages}</span>
          </div>

          <Button
            onClick={() => onPageChange(currentPage + 1)}
            variant="outline"
            size="sm"
            disabled={disabled || currentPage >= totalPages}
            title="다음 페이지"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={onCopy} variant="outline" size="sm" disabled={disabled}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          클립보드 복사
        </Button>

        <Button onClick={() => onExport('png')} variant="secondary" size="sm" disabled={disabled}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          PNG 다운로드
        </Button>

        <Button onClick={() => onExport('jpeg')} variant="secondary" size="sm" disabled={disabled}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          JPG 다운로드
        </Button>
      </div>
    </div>
  );
}
