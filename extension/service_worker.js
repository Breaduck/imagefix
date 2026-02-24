/**
 * Service Worker (MV3) for NotebookLM extension
 * Handles screenshot capture and file downloads
 */

console.log('[Service Worker] Loaded');

// Store active import sessions
const importSessions = new Map();

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Get extension status (version + permissions)
  if (request.type === 'GET_EXTENSION_STATUS') {
    handleGetExtensionStatus()
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ version: 'unknown', hasNotebookLMPermission: false, error: err.message }));
    return true;
  }

  // Legacy: from popup
  if (request.action === 'captureAndExport') {
    handleCaptureAndExport(request.data, request.tabId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));

    return true; // Keep channel open for async response
  }

  // New: Link import from webapp
  if (request.type === 'IMPORT_URL') {
    handleImportURL(request)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Capture request from content script
  if (request.type === 'CAPTURE_VISIBLE_TAB') {
    handleCaptureVisibleTab(request, sender.tab)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Export progress
  if (request.type === 'EXPORT_PROGRESS') {
    forwardProgressToWebapp(request);
    sendResponse({ success: true });
    return false;
  }

  // Export complete
  if (request.type === 'EXPORT_COMPLETE') {
    handleExportComplete(request)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Open capture permission page
  if (request.type === 'OPEN_CAPTURE_PERMISSION') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('permission.html'),
      active: true
    });
    sendResponse({ success: true });
    return false;
  }
});

/**
 * Get extension status (version + permissions)
 */
async function handleGetExtensionStatus() {
  try {
    // Get manifest for version
    const manifest = chrome.runtime.getManifest();
    const version = manifest.version;

    // Check if we have NotebookLM permission
    const hasNotebookLMPermission = await chrome.permissions.contains({
      origins: ['https://notebooklm.google.com/*']
    });

    console.log('[Service Worker] Extension status:', { version, hasNotebookLMPermission });

    return {
      version,
      hasNotebookLMPermission,
    };
  } catch (error) {
    console.error('[Service Worker] Error getting extension status:', error);
    return {
      version: 'unknown',
      hasNotebookLMPermission: false,
      error: error.message,
    };
  }
}

/**
 * Main capture and export logic
 */
async function handleCaptureAndExport(data, tabId) {
  try {
    console.log('[Service Worker] Starting capture and export');

    // Step 1: Hide text in the page
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.__notebookLMExtractor?.hideTextForScreenshot(),
    });

    // Wait a bit for render
    await sleep(500);

    // Step 2: Capture visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
    });

    console.log('[SW] capture ok len=', dataUrl.substring(0, 30) + '...');

    // Step 3: Restore text
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.__notebookLMExtractor?.restoreTextStyles(),
    });

    // Step 4: Crop to slide area (delegate to content script)
    const { slideX, slideY, slideW, slideH, dpr } = data.source;

    const croppedDataUrl = await requestCropFromContentScript(tabId, dataUrl, {
      x: slideX,
      y: slideY,
      width: slideW,
      height: slideH,
    }, dpr);

    console.log('[Service Worker] Image cropped');

    // Step 5: Download files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Download page.png
    await downloadDataUrl(croppedDataUrl, `notebooklm-slide-${timestamp}.png`);

    // Download layers.json
    const json = JSON.stringify(data, null, 2);
    const jsonBlob = new Blob([json], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    await downloadUrl(jsonUrl, `notebooklm-layers-${timestamp}.json`);

    console.log('[Service Worker] Export complete');

    return {
      success: true,
      message: 'Export complete',
    };
  } catch (err) {
    console.error('[Service Worker] Error:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Request crop from content script (no DOM in service worker)
 */
async function requestCropFromContentScript(tabId, fullPngDataUrl, slideRect, dpr) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      {
        type: 'IMAGEFIX_CROP_IMAGE',
        fullPngDataUrl,
        slideRect,
        dpr,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response || !response.success) {
          reject(new Error(response?.error || 'Crop failed'));
        } else {
          resolve(response.croppedDataUrl);
        }
      }
    );
  });
}

/**
 * Download data URL as file
 */
async function downloadDataUrl(dataUrl, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: dataUrl,
        filename,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(downloadId);
        }
      }
    );
  });
}

/**
 * Download blob URL as file
 */
async function downloadUrl(url, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url,
        filename,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(downloadId);
        }
      }
    );
  });
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Handle import URL request from webapp
 */
async function handleImportURL(request) {
  try {
    const { requestId, url, sourceTabId } = request;

    console.log('[Service Worker] Opening NotebookLM URL:', url);

    // Check if we have capture permission
    const hasPermission = await chrome.permissions.contains({
      origins: ['<all_urls>']
    });

    console.log('[SW] contains(<all_urls>)=', hasPermission);

    if (!hasPermission) {
      console.log('[SW] Missing capture permission, sending error to webapp');

      // Find webapp tab
      let webappTabId = sourceTabId;
      if (!webappTabId) {
        const tabs = await chrome.tabs.query({
          url: ['http://localhost:*/*', 'https://imagefix-dun.vercel.app/*']
        });
        if (tabs.length > 0) {
          webappTabId = tabs[0].id;
        }
      }

      // Send error to webapp
      if (webappTabId) {
        await chrome.scripting.executeScript({
          target: { tabId: webappTabId },
          func: (error) => {
            window.postMessage(error, '*');
          },
          args: [{
            type: 'IMAGEFIX_IMPORT_ERROR',
            requestId: requestId,
            code: 'CAPTURE_PERMISSION_REQUIRED',
            message: '첫 1회 캡처 권한 허용이 필요합니다.',
          }],
        });
      }

      return {
        success: false,
        error: 'Permission required',
      };
    }

    // Open URL in new tab
    const tab = await chrome.tabs.create({
      url,
      active: true,
    });

    // Store session
    importSessions.set(requestId, {
      requestId,
      notebookLMTabId: tab.id,
      sourceTabId: sourceTabId || null,
      url,
      createdAt: Date.now(),
    });

    // Wait for tab to load
    await waitForTabLoad(tab.id);

    console.log('[Service Worker] Tab loaded, injecting content script...');

    // Ensure content script is loaded (should auto-inject via manifest, but double-check)
    await sleep(1000);

    // Trigger multi-slide export
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'RUN_MULTI_SLIDE_EXPORT',
      requestId,
      sourceTabId,
    });

    console.log('[Service Worker] Multi-slide export initiated:', response);

    return {
      success: true,
      message: 'Export started',
    };
  } catch (err) {
    console.error('[Service Worker] Import URL error:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Wait for tab to finish loading
 */
function waitForTabLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Tab load timeout'));
    }, 30000); // 30s timeout

    const listener = (updatedTabId, changeInfo, tab) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(tab);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * Handle capture visible tab request
 */
async function handleCaptureVisibleTab(request, tab) {
  try {
    const { slideRect, dpr } = request;

    console.log('[Service Worker] Capturing visible tab:', tab.id);

    // Capture visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
    });

    console.log('[SW] capture ok len=', dataUrl.substring(0, 30) + '...');

    // Crop to slide area (delegate to content script)
    const croppedDataUrl = await requestCropFromContentScript(tab.id, dataUrl, slideRect, dpr);

    return {
      success: true,
      dataUrl: croppedDataUrl,
    };
  } catch (err) {
    console.error('[Service Worker] Capture error:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Forward progress to webapp
 */
async function forwardProgressToWebapp(request) {
  const { requestId, sourceTabId, message } = request;

  // Find webapp tab (if sourceTabId not available, find by URL pattern)
  let webappTabId = sourceTabId;

  if (!webappTabId) {
    const tabs = await chrome.tabs.query({ url: '*://localhost:*/*' });
    if (tabs.length > 0) {
      webappTabId = tabs[0].id;
    }
  }

  if (webappTabId) {
    try {
      await chrome.tabs.sendMessage(webappTabId, {
        type: 'IMAGEFIX_IMPORT_PROGRESS',
        requestId,
        message,
      });
    } catch (err) {
      // Tab might not have content script, use executeScript to post message
      await chrome.scripting.executeScript({
        target: { tabId: webappTabId },
        func: (msg) => {
          window.postMessage(msg, '*');
        },
        args: [{
          type: 'IMAGEFIX_IMPORT_PROGRESS',
          requestId,
          message,
        }],
      });
    }
  }
}

/**
 * Handle export complete
 */
async function handleExportComplete(request) {
  try {
    const { requestId, sourceTabId, slides } = request;

    console.log('[Service Worker] Export complete:', slides.length, 'slides');

    const session = importSessions.get(requestId);
    if (!session) {
      console.warn('[Service Worker] Session not found:', requestId);
      return { success: false, error: 'Session not found' };
    }

    // Find webapp tab
    let webappTabId = sourceTabId;

    if (!webappTabId) {
      const tabs = await chrome.tabs.query({
        url: ['http://localhost:*/*', 'https://imagefix-dun.vercel.app/*']
      });
      if (tabs.length > 0) {
        webappTabId = tabs[0].id;
      }
    }

    // Check if we got any slides
    if (slides.length === 0) {
      console.error('[Service Worker] No slides captured');

      if (webappTabId) {
        await chrome.scripting.executeScript({
          target: { tabId: webappTabId },
          func: (error) => {
            window.postMessage(error, '*');
          },
          args: [{
            type: 'IMAGEFIX_IMPORT_ERROR',
            requestId,
            code: 'NO_SLIDES_CAPTURED',
            message: '슬라이드를 캡처하지 못했습니다. NotebookLM 페이지가 올바른지 확인해주세요.',
          }],
        });

        console.log('[SW] result slides=0 -> error sent');
      }

      // Close NotebookLM tab
      if (session.notebookLMTabId) {
        await chrome.tabs.remove(session.notebookLMTabId);
      }

      // Clean up session
      importSessions.delete(requestId);

      return {
        success: false,
        error: 'No slides captured',
      };
    }

    // Send results to webapp
    if (webappTabId) {
      await chrome.scripting.executeScript({
        target: { tabId: webappTabId },
        func: (result) => {
          window.postMessage(result, '*');
        },
        args: [{
          type: 'IMAGEFIX_IMPORT_RESULT',
          requestId,
          slides,
        }],
      });

      console.log('[SW] result slides=', slides.length);
    }

    // Close NotebookLM tab
    if (session.notebookLMTabId) {
      await chrome.tabs.remove(session.notebookLMTabId);
      console.log('[Service Worker] Closed NotebookLM tab');
    }

    // Clean up session
    importSessions.delete(requestId);

    return {
      success: true,
      slideCount: slides.length,
    };
  } catch (err) {
    console.error('[Service Worker] Export complete error:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}
