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

type ExtensionState = 'CHECKING' | 'NOT_INSTALLED' | 'INSTALLED_BUT_NO_PERMISSION' | 'CONNECTED';

interface DiagnosticLog {
  timestamp: string;
  event: string;
  details: any;
}

export function LinkImportZone({
  onImportStart,
  onImportComplete,
  onImportError,
  disabled,
}: LinkImportZoneProps) {
  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [extensionState, setExtensionState] = useState<ExtensionState>('CHECKING');
  const [extensionVersion, setExtensionVersion] = useState<string>('');
  const [progress, setProgress] = useState('');
  const [diagnosticLogs, setDiagnosticLogs] = useState<DiagnosticLog[]>([]);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Add diagnostic log
  const addLog = useCallback((event: string, details: any = {}) => {
    const log: DiagnosticLog = {
      timestamp: new Date().toISOString(),
      event,
      details,
    };
    setDiagnosticLogs((prev) => [...prev.slice(-19), log]); // Keep last 20 logs
    console.log(`[Diagnostic] ${event}`, details);
  }, []);

  // Check if extension is installed and has permissions
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkExtension = () => {
      const requestId = `ping_${Date.now()}`;

      addLog('PING_SENT', { requestId, origin: window.location.origin });

      // Send ping with requestId
      window.postMessage({
        type: 'IMAGEFIX_PING',
        source: 'webapp',
        requestId,
      }, '*');

      // Wait for pong (timeout after 1.5 seconds)
      timeoutId = setTimeout(() => {
        addLog('PING_TIMEOUT', { reason: 'No PONG received within 1.5s' });
        setExtensionState('NOT_INSTALLED');
      }, 1500);
    };

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;

      // Handle PONG (extension detected)
      if (data?.type === 'IMAGEFIX_PONG' && data?.source === 'extension') {
        clearTimeout(timeoutId);

        addLog('PONG_RECEIVED', {
          version: data.version,
          hasNotebookLMPermission: data.hasNotebookLMPermission,
          hasWebappPermission: data.hasWebappPermission,
        });

        setExtensionVersion(data.version || 'unknown');

        // Check permission status
        if (data.hasNotebookLMPermission) {
          setExtensionState('CONNECTED');
          addLog('STATE_CHANGE', { state: 'CONNECTED', reason: 'All permissions OK' });
        } else {
          setExtensionState('INSTALLED_BUT_NO_PERMISSION');
          addLog('STATE_CHANGE', { state: 'INSTALLED_BUT_NO_PERMISSION', reason: 'Missing NotebookLM permission' });
        }
      }
      // Handle import progress
      else if (data?.type === 'IMAGEFIX_IMPORT_PROGRESS') {
        addLog('IMPORT_PROGRESS', { message: data.message });
        setProgress(data.message);
      }
      // Handle import result
      else if (data?.type === 'IMAGEFIX_IMPORT_RESULT') {
        const slides = data.slides || [];
        addLog('IMPORT_SUCCESS', { slideCount: slides.length });
        setIsImporting(false);
        setProgress('');
        onImportComplete(slides);
      }
      // Handle import error
      else if (data?.type === 'IMAGEFIX_IMPORT_ERROR') {
        addLog('IMPORT_ERROR', { message: data.message });
        setIsImporting(false);
        setProgress('');
        onImportError(data.message);
      }
    };

    window.addEventListener('message', handleMessage);
    checkExtension();

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutId);
    };
  }, [onImportComplete, onImportError, addLog]);

  // Auto-open setup modal when NOT_INSTALLED detected
  useEffect(() => {
    if (extensionState === 'NOT_INSTALLED' && !showSetupModal) {
      setShowSetupModal(true);
    }
  }, [extensionState, showSetupModal]);

  // Manual connection test
  const handleTestConnection = useCallback(() => {
    setIsTesting(true);
    setExtensionState('CHECKING');

    const requestId = `test_${Date.now()}`;
    addLog('MANUAL_TEST_STARTED', { requestId });

    let timeoutId: NodeJS.Timeout;

    const handleTestMessage = (event: MessageEvent) => {
      const data = event.data;

      if (data?.type === 'IMAGEFIX_PONG' && data?.source === 'extension') {
        clearTimeout(timeoutId);
        window.removeEventListener('message', handleTestMessage);

        setExtensionVersion(data.version || 'unknown');

        if (data.hasNotebookLMPermission) {
          setExtensionState('CONNECTED');
          addLog('MANUAL_TEST_SUCCESS', { state: 'CONNECTED' });
          alert('✅ 연결 성공! 확장프로그램이 정상 작동 중입니다.');
        } else {
          setExtensionState('INSTALLED_BUT_NO_PERMISSION');
          addLog('MANUAL_TEST_PARTIAL', { state: 'INSTALLED_BUT_NO_PERMISSION' });
          alert('⚠️ 확장프로그램은 설치되었지만 NotebookLM 권한이 필요합니다.');
        }
        setIsTesting(false);
      }
    };

    window.addEventListener('message', handleTestMessage);

    window.postMessage({
      type: 'IMAGEFIX_PING',
      source: 'webapp',
      requestId,
    }, '*');

    timeoutId = setTimeout(() => {
      window.removeEventListener('message', handleTestMessage);
      setExtensionState('NOT_INSTALLED');
      addLog('MANUAL_TEST_TIMEOUT', { reason: 'No PONG received' });
      setShowSetupModal(true);
      setIsTesting(false);
      alert('❌ 확장프로그램이 설치되지 않았거나 연결할 수 없습니다. 설치 가이드를 확인하세요.');
    }, 1000);
  }, [addLog]);

  const handleImport = useCallback(() => {
    if (!url.trim()) {
      addLog('IMPORT_FAILED', { reason: 'Empty URL' });
      alert('NotebookLM URL을 입력해주세요.');
      return;
    }

    if (extensionState !== 'CONNECTED') {
      addLog('IMPORT_FAILED', { reason: 'Extension not ready', state: extensionState });
      if (extensionState === 'NOT_INSTALLED') {
        alert('확장프로그램이 설치되지 않았습니다. 먼저 설치해주세요.');
      } else if (extensionState === 'INSTALLED_BUT_NO_PERMISSION') {
        alert('확장프로그램에 NotebookLM 접근 권한이 없습니다. 확장프로그램 설정을 확인해주세요.');
      }
      return;
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    addLog('IMPORT_STARTED', { requestId, url: url.substring(0, 50) + '...' });
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
  }, [url, extensionState, onImportStart, addLog]);

  // Copy diagnostic logs to clipboard
  const handleCopyDiagnostics = useCallback(() => {
    const diagnosticText = [
      '=== ImageFix Extension Diagnostics ===',
      `Generated: ${new Date().toISOString()}`,
      `Origin: ${window.location.origin}`,
      `Extension State: ${extensionState}`,
      `Extension Version: ${extensionVersion || 'unknown'}`,
      '',
      '=== Recent Logs (last 20) ===',
      ...diagnosticLogs.map((log) =>
        `[${log.timestamp}] ${log.event}: ${JSON.stringify(log.details)}`
      ),
    ].join('\n');

    navigator.clipboard.writeText(diagnosticText).then(() => {
      alert('진단 로그가 클립보드에 복사되었습니다.');
    }).catch((err) => {
      console.error('Failed to copy diagnostics:', err);
      alert('클립보드 복사 실패. 콘솔을 확인하세요.');
    });
  }, [diagnosticLogs, extensionState, extensionVersion]);

  return (
    <div className="space-y-4">
      {/* One-Click Connection Test Button */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            확장프로그램 상태:
          </span>
          {extensionState === 'CHECKING' && (
            <span className="text-sm text-gray-500 dark:text-gray-400">확인 중...</span>
          )}
          {extensionState === 'NOT_INSTALLED' && (
            <span className="text-sm text-red-600 dark:text-red-400 font-semibold">미설치</span>
          )}
          {extensionState === 'INSTALLED_BUT_NO_PERMISSION' && (
            <span className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold">권한 필요</span>
          )}
          {extensionState === 'CONNECTED' && (
            <span className="text-sm text-green-600 dark:text-green-400 font-semibold">연결됨</span>
          )}
        </div>
        <button
          onClick={handleTestConnection}
          disabled={isTesting}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isTesting ? '테스트 중...' : '🔍 연결 테스트'}
        </button>
      </div>

      {/* Extension Status Banner - NOT_INSTALLED */}
      {extensionState === 'NOT_INSTALLED' && (
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                확장프로그램 설치 필요
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                링크만 붙여넣으면 자동으로 슬라이드를 캡처할 수 있습니다. 1회 설치 후 영구 사용!
              </p>

              {/* CTA Button */}
              <a
                href="https://chrome.google.com/webstore/detail/EXTENSION_ID_PLACEHOLDER"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                ImageFix Link Import Companion 설치하기
              </a>

              {/* 3-Step Guide */}
              <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">
                  설치 후 사용법 (3단계):
                </p>
                <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold mr-2">1</span>
                    NotebookLM URL 복사
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold mr-2">2</span>
                    여기에 붙여넣기
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold mr-2">3</span>
                    클릭 → 완료! (자동 캡처)
                  </li>
                </ol>
              </div>

              {/* Developer mode link (small) */}
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                개발자이신가요?{' '}
                <a
                  href="/extension/README.md"
                  target="_blank"
                  className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                >
                  개발자 모드로 설치하기
                </a>
                {' | '}
                <button
                  onClick={handleCopyDiagnostics}
                  className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                >
                  진단 로그 복사
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Extension Status Banner - INSTALLED_BUT_NO_PERMISSION */}
      {extensionState === 'INSTALLED_BUT_NO_PERMISSION' && (
        <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                ⚠️ 권한 설정 필요
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                확장프로그램은 설치되었지만 NotebookLM 접근 권한이 없어 슬라이드를 캡처할 수 없습니다.
              </p>

              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg mb-4">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">
                  ⚠️ 권한은 자동으로 수정할 수 없습니다. 아래 단계를 직접 따라 해주세요:
                </p>

                <div className="space-y-3">
                  {/* Step 1 - Clickable */}
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        Chrome 확장 페이지 열기
                      </p>
                      <a
                        href="chrome://extensions/"
                        onClick={(e) => {
                          e.preventDefault();
                          window.open('chrome://extensions/', '_blank');
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                      >
                        👉 클릭: chrome://extensions/ 열기
                      </a>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        "ImageFix Link Import Companion" 찾기
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        목록에서 확장 프로그램을 찾으세요
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        "세부정보" 버튼 클릭
                      </p>
                    </div>
                  </div>

                  {/* Step 4 - Critical */}
                  <div className="flex items-start space-x-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-600 rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      4
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        "사이트 액세스" 섹션 찾기
                      </p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                        다음 권한을 허용으로 변경:
                      </p>
                      <ul className="text-xs text-gray-700 dark:text-gray-300 mt-2 ml-2 space-y-1">
                        <li>✓ <code className="px-1 bg-gray-200 dark:bg-gray-600 rounded">notebooklm.google.com</code></li>
                        <li>✓ <code className="px-1 bg-gray-200 dark:bg-gray-600 rounded">imagefix-dun.vercel.app</code></li>
                      </ul>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      5
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        이 페이지 새로고침
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">Ctrl + Shift + R</kbd> (하드 리프레시)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Connection Button */}
              <button
                onClick={handleTestConnection}
                className="w-full px-4 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors"
              >
                ✅ 권한 설정 완료 - 연결 테스트하기
              </button>

              {/* Diagnostic button */}
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                문제가 해결되지 않나요?{' '}
                <button
                  onClick={handleCopyDiagnostics}
                  className="text-yellow-600 dark:text-yellow-400 underline hover:no-underline font-semibold"
                >
                  진단 로그 복사
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Extension Status Banner - CONNECTED */}
      {extensionState === 'CONNECTED' && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">
                ImageFix Link Import Companion 연결됨 {extensionVersion && `(v${extensionVersion})`}
              </span>
            </div>
            <button
              onClick={handleCopyDiagnostics}
              className="text-xs text-green-600 dark:text-green-400 hover:underline"
              title="진단 로그 복사"
            >
              진단
            </button>
          </div>
        </div>
      )}

      {/* Extension Status Banner - CHECKING */}
      {extensionState === 'CHECKING' && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm font-medium">확장프로그램 확인 중...</span>
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
        disabled={disabled || isImporting || extensionState !== 'CONNECTED' || !url.trim()}
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

      {/* Setup Guide Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                🚀 확장프로그램 설치 가이드
              </h2>
              <button
                onClick={() => setShowSetupModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Option 1: Web Store (if available) */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  방법 1: Chrome 웹 스토어에서 설치 (권장)
                </h3>
                <a
                  href="https://chrome.google.com/webstore/detail/EXTENSION_ID_PLACEHOLDER"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  웹 스토어에서 설치하기
                </a>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  클릭 한 번으로 자동 설치되며, 모든 권한이 자동으로 설정됩니다.
                </p>
              </div>

              {/* Option 2: Load Unpacked */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  방법 2: 개발자 모드로 설치 (고급)
                </h3>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">Chrome 확장 페이지 열기</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        주소창에 <code className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">chrome://extensions/</code> 입력
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">개발자 모드 활성화</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        우측 상단 "개발자 모드" 토글을 켭니다
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">확장 프로그램 로드</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        "압축 해제된 확장 프로그램을 로드합니다" 클릭 → <code className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">extension</code> 폴더 선택
                      </p>
                    </div>
                  </div>

                  {/* Step 4 - Critical */}
                  <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center font-bold">
                      4
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">⚠️ 권한 설정 (중요!)</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        확장 프로그램 "세부정보" 클릭 → "사이트 액세스" 섹션에서:
                      </p>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 mt-2 ml-4 space-y-1">
                        <li>✓ <code className="px-1 bg-gray-200 dark:bg-gray-600 rounded">notebooklm.google.com</code> 허용</li>
                        <li>✓ <code className="px-1 bg-gray-200 dark:bg-gray-600 rounded">imagefix-dun.vercel.app</code> 허용</li>
                      </ul>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                        💡 이 단계를 건너뛰면 확장이 작동하지 않습니다!
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                      5
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">페이지 새로고침</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        이 페이지를 <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">Ctrl + Shift + R</kbd> (하드 리프레시)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Connection Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setShowSetupModal(false);
                    handleTestConnection();
                  }}
                  className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  ✅ 설치 완료 - 연결 테스트하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
