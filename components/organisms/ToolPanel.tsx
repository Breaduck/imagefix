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
  disabled?: boolean;
}

export function ToolPanel({ onReset, onExport, onCopy, disabled = false }: ToolPanelProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
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
