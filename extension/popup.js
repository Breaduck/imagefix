/**
 * Popup UI handler
 */

const exportBtn = document.getElementById('exportBtn');
const statusEl = document.getElementById('status');
const statsEl = document.getElementById('stats');
const layerCountEl = document.getElementById('layerCount');
const slideSizeEl = document.getElementById('slideSize');

function showStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = type;
}

exportBtn.addEventListener('click', async () => {
  exportBtn.disabled = true;
  showStatus('Extracting slide data...', 'info');
  statsEl.style.display = 'none';

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('notebooklm.google.com')) {
      showStatus('Please open a NotebookLM slide page', 'error');
      exportBtn.disabled = false;
      return;
    }

    // Inject and execute content script
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractSlideData,
    });

    if (!result || !result.result) {
      showStatus('Failed to extract slide data', 'error');
      exportBtn.disabled = false;
      return;
    }

    const { success, error, data } = result.result;

    if (!success) {
      showStatus(error || 'Extraction failed', 'error');
      exportBtn.disabled = false;
      return;
    }

    // Show stats
    layerCountEl.textContent = data.layers.length;
    slideSizeEl.textContent = `${data.slideW}x${data.slideH}`;
    statsEl.style.display = 'block';

    // Warning for low layer count
    if (data.layers.length < 5) {
      showStatus('⚠️ Low layer count. DOM text might not be available. Consider using OCR track.', 'info');
    } else {
      showStatus(`✓ Extracted ${data.layers.length} text layers`, 'success');
    }

    // Request screenshot from service worker
    showStatus('Capturing screenshot...', 'info');
    const response = await chrome.runtime.sendMessage({
      action: 'captureAndExport',
      data: data,
      tabId: tab.id,
    });

    if (response.success) {
      showStatus(`✓ Exported! Check downloads.`, 'success');
    } else {
      showStatus(response.error || 'Export failed', 'error');
    }
  } catch (err) {
    console.error('[Popup] Error:', err);
    showStatus(`Error: ${err.message}`, 'error');
  } finally {
    exportBtn.disabled = false;
  }
});

/**
 * This function will be injected into the page
 * (defined here for serialization, executed in page context)
 */
function extractSlideData() {
  try {
    // Import extraction logic from content script context
    // This will be the main extraction function
    return window.__notebookLMExtractor?.extract() || {
      success: false,
      error: 'Extractor not loaded. Refresh page and try again.',
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}
