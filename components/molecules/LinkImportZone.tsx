/**
 * Link Import Zone - paste NotebookLM URL for automatic import
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';

export interface LinkImportZoneProps {
  onImportStart: (requestId: string, url: string) => void;
  onImportComplete: (data: { pagePngDataUrl: string; layersJson: any }[]) => void;
  onImportError: (error: string) => void;
  disabled?: boolean;
}

export function LinkImportZone({
  onImportStart,
  onImportComplete,
  onImportError,
  disabled,
}: LinkImportZoneProps) {
  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(null);
  const [progress, setProgress] = useState('');

  // Check if extension is installed
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkExtension = () => {
      // Send ping
      window.postMessage({ type: 'IMAGEFIX_PING', source: 'webapp' }, '*');

      // Wait for pong
      timeoutId = setTimeout(() => {
        setExtensionInstalled(false);
      }, 1000);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'IMAGEFIX_PONG') {
        clearTimeout(timeoutId);
        setExtensionInstalled(true);
      } else if (event.data?.type === 'IMAGEFIX_IMPORT_PROGRESS') {
        setProgress(event.data.message);
      } else if (event.data?.type === 'IMAGEFIX_IMPORT_RESULT') {
        // Multi-slide result
        const slides = event.data.slides || [];
        console.log('[LinkImport] Received results:', slides.length, 'slides');
        setIsImporting(false);
        setProgress('');
        onImportComplete(slides);
      } else if (event.data?.type === 'IMAGEFIX_IMPORT_ERROR') {
        console.error('[LinkImport] Error:', event.data.message);
        setIsImporting(false);
        setProgress('');
        onImportError(event.data.message);
      }
    };

    window.addEventListener('message', handleMessage);
    checkExtension();

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutId);
    };
  }, [onImportComplete, onImportError]);

  const handleImport = useCallback(() => {
    if (!url.trim()) {
      alert('NotebookLM URL을 입력해주세요.');
      return;
    }

    if (!extensionInstalled) {
      alert('확장프로그램이 설치되지 않았습니다. 먼저 설치해주세요.');
      return;
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('[LinkImport] Sending import request:', { requestId, url });
    setIsImporting(true);
    setProgress('확장프로그램에 요청 전송 중...');

    onImportStart(requestId, url);

    window.postMessage(
      {
        type: 'IMAGEFIX_IMPORT_REQUEST',
        requestId,
        url: url.trim(),
        source: 'webapp',
      },
      '*'
    );
  }, [url, extensionInstalled, onImportStart]);

  return (
    <div className="space-y-4">
      {/* Extension Status Banner */}
      {extensionInstalled === false && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                확장프로그램 설치 필요
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                링크 붙여넣기 기능을 사용하려면 Chrome 확장프로그램을 설치해야 합니다.
              </p>
              <a
                href="/extension/README.md"
                target="_blank"
                className="text-sm font-medium text-yellow-800 dark:text-yellow-200 underline hover:no-underline"
              >
                설치 가이드 보기 →
              </a>
            </div>
          </div>
        </div>
      )}

      {extensionInstalled === true && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">확장프로그램 연결됨</span>
          </div>
        </div>
      )}

      {/* URL Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          NotebookLM 프레젠테이션 URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://notebooklm.google.com/notebook/..."
          disabled={disabled || isImporting}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:bg-gray-800 dark:text-white"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isImporting) {
              handleImport();
            }
          }}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          프레젠테이션 URL을 붙여넣으면 모든 슬라이드가 자동으로 캡처됩니다.
        </p>
      </div>

      {/* Import Button */}
      <button
        onClick={handleImport}
        disabled={disabled || isImporting || !extensionInstalled || !url.trim()}
        className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isImporting ? '가져오는 중...' : '슬라이드 가져오기'}
      </button>

      {/* Progress */}
      {isImporting && progress && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center space-x-3">
            <svg className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-blue-700 dark:text-blue-300">{progress}</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm space-y-2">
        <h4 className="font-semibold">사용 방법:</h4>
        <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
          <li>NotebookLM 프레젠테이션 URL 복사</li>
          <li>위 입력칸에 붙여넣기</li>
          <li>"슬라이드 가져오기" 버튼 클릭</li>
          <li>자동으로 모든 슬라이드가 캡처되어 로드됩니다</li>
        </ol>
      </div>
    </div>
  );
}
