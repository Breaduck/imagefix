/**
 * Service Worker (MV3) for NotebookLM extension
 * Handles screenshot capture and file downloads
 */

console.log('[Service Worker] Loaded');

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureAndExport') {
    handleCaptureAndExport(request.data, request.tabId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));

    return true; // Keep channel open for async response
  }
});

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

    // Step 3: Restore text
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.__notebookLMExtractor?.restoreTextStyles(),
    });

    console.log('[Service Worker] Screenshot captured');

    // Step 4: Crop to slide area
    const { slideX, slideY, slideW, slideH, dpr } = data.source;

    const croppedDataUrl = await cropImage(dataUrl, {
      sx: slideX * dpr,
      sy: slideY * dpr,
      sw: slideW * dpr,
      sh: slideH * dpr,
      dw: slideW,
      dh: slideH,
    });

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
 * Crop image from dataUrl
 */
function cropImage(dataUrl, { sx, sy, sw, sh, dw, dh }) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = new OffscreenCanvas(dw, dh);
      const ctx = canvas.getContext('2d');

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);

      canvas.convertToBlob({ type: 'image/png' }).then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    img.onerror = reject;
    img.src = dataUrl;
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
