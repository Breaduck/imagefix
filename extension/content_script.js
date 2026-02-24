/**
 * Content script for NotebookLM DOM extraction
 * Runs on https://notebooklm.google.com/*
 */

(function () {
  'use strict';

  console.log('[NotebookLM Extractor] Content script loaded');

  /**
   * Find the slide container element
   */
  function findSlideContainer() {
    // Heuristic: find the largest visible element that looks like a slide
    // NotebookLM typically renders slides in a centered canvas-like container

    // Try common selectors first
    const candidates = [
      document.querySelector('[role="main"] canvas'),
      document.querySelector('.slide-container'),
      document.querySelector('[class*="slide"]'),
      document.querySelector('[class*="canvas"]'),
    ].filter(Boolean);

    // Find largest visible element
    let bestCandidate = null;
    let maxArea = 0;

    const allElements = document.querySelectorAll('div, section, main, article');

    for (const el of allElements) {
      const rect = el.getBoundingClientRect();

      // Must be visible and reasonably sized
      if (
        rect.width < 400 ||
        rect.height < 300 ||
        rect.top < 0 ||
        rect.left < 0
      ) {
        continue;
      }

      const style = window.getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        parseFloat(style.opacity) < 0.1
      ) {
        continue;
      }

      const area = rect.width * rect.height;
      if (area > maxArea) {
        maxArea = area;
        bestCandidate = el;
      }
    }

    return bestCandidate;
  }

  /**
   * Extract text nodes with computed styles within slide container
   */
  function extractTextElements(slideEl, slideRect) {
    const elements = [];
    const selectors = 'span, p, h1, h2, h3, h4, h5, h6, li, a, button, div, text';

    const candidates = slideEl.querySelectorAll(selectors);

    let idCounter = 0;

    for (const el of candidates) {
      const text = el.innerText?.trim() || el.textContent?.trim();
      if (!text || text.length === 0) continue;

      const rect = el.getBoundingClientRect();

      // Filter out tiny or invisible elements
      if (rect.width < 2 || rect.height < 2) continue;

      const style = window.getComputedStyle(el);

      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        parseFloat(style.opacity) < 0.01
      ) {
        continue;
      }

      // Check if rect intersects slideRect
      if (
        rect.right < slideRect.left ||
        rect.left > slideRect.right ||
        rect.bottom < slideRect.top ||
        rect.top > slideRect.bottom
      ) {
        continue;
      }

      // Parse rotation from transform
      let rotationDeg = 0;
      const transform = style.transform;
      if (transform && transform !== 'none') {
        try {
          const matrix = new DOMMatrixReadOnly(transform);
          const angle = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
          rotationDeg = Math.abs(angle) < 0.5 ? 0 : angle;
        } catch (e) {
          // Ignore transform parse errors
        }
      }

      elements.push({
        id: `el-${idCounter++}`,
        element: el,
        text,
        rectViewport: {
          x: rect.x,
          y: rect.y,
          w: rect.width,
          h: rect.height,
        },
        rectSlideLocal: {
          x: rect.x - slideRect.x,
          y: rect.y - slideRect.y,
          w: rect.width,
          h: rect.height,
        },
        style: {
          fontFamily: style.fontFamily,
          fontSizePx: parseFloat(style.fontSize),
          fontWeight: style.fontWeight,
          fontStyle: style.fontStyle,
          colorRgba: style.color,
          letterSpacingPx: parseFloat(style.letterSpacing) || 0,
          lineHeightPx: parseFloat(style.lineHeight) || parseFloat(style.fontSize),
          textAlign: style.textAlign,
          transform: style.transform,
        },
        rotationDeg,
      });
    }

    console.log(`[Extractor] Found ${elements.length} text elements`);
    return elements;
  }

  /**
   * Merge elements into line-level layers
   */
  function mergeIntoLines(elements) {
    if (elements.length === 0) return [];

    // Group by rotation (±3°)
    const rotationGroups = {};

    for (const el of elements) {
      const rotKey = Math.round(el.rotationDeg / 3) * 3;
      if (!rotationGroups[rotKey]) rotationGroups[rotKey] = [];
      rotationGroups[rotKey].push(el);
    }

    const lines = [];
    let lineId = 0;

    for (const rotKey in rotationGroups) {
      const group = rotationGroups[rotKey];

      // Sort by y, then x
      group.sort((a, b) => {
        const dy = a.rectSlideLocal.y - b.rectSlideLocal.y;
        if (Math.abs(dy) > 5) return dy;
        return a.rectSlideLocal.x - b.rectSlideLocal.x;
      });

      // Cluster by y-center
      const clusters = [];
      let currentCluster = [group[0]];

      for (let i = 1; i < group.length; i++) {
        const prev = currentCluster[currentCluster.length - 1];
        const curr = group[i];

        const prevCenter = prev.rectSlideLocal.y + prev.rectSlideLocal.h / 2;
        const currCenter = curr.rectSlideLocal.y + curr.rectSlideLocal.h / 2;

        const tolerance = Math.max(prev.style.fontSizePx, curr.style.fontSizePx) * 0.5;

        if (Math.abs(currCenter - prevCenter) < tolerance) {
          currentCluster.push(curr);
        } else {
          clusters.push(currentCluster);
          currentCluster = [curr];
        }
      }
      clusters.push(currentCluster);

      // Build line from each cluster
      for (const cluster of clusters) {
        // Sort by x
        cluster.sort((a, b) => a.rectSlideLocal.x - b.rectSlideLocal.x);

        // Merge text with improved space detection
        let mergedText = cluster[0].text;
        for (let i = 1; i < cluster.length; i++) {
          const prev = cluster[i - 1];
          const curr = cluster[i];

          const gap = curr.rectSlideLocal.x - (prev.rectSlideLocal.x + prev.rectSlideLocal.w);
          const avgFontSize = (prev.style.fontSizePx + curr.style.fontSizePx) / 2;

          // Estimate average character width (assuming ~0.5-0.6 of fontSize for proportional fonts)
          const avgCharWidth = avgFontSize * 0.55;

          // Improved threshold: merge if gap < 1.5x character width
          // This handles both tight spacing and normal word spacing better
          const threshold = avgCharWidth * 1.5;

          if (gap > threshold) {
            mergedText += ' ';
          }
          mergedText += curr.text;
        }

        // Calculate union bbox
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;

        for (const el of cluster) {
          minX = Math.min(minX, el.rectSlideLocal.x);
          minY = Math.min(minY, el.rectSlideLocal.y);
          maxX = Math.max(maxX, el.rectSlideLocal.x + el.rectSlideLocal.w);
          maxY = Math.max(maxY, el.rectSlideLocal.y + el.rectSlideLocal.h);
        }

        // Representative style (use first element)
        const repr = cluster[0];

        lines.push({
          id: `line-${lineId++}`,
          type: 'text-line',
          text: mergedText,
          bbox: {
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY,
          },
          style: {
            fontFamily: repr.style.fontFamily,
            fontSizePx: repr.style.fontSizePx,
            fontWeight: repr.style.fontWeight,
            fontStyle: repr.style.fontStyle,
            colorRgba: repr.style.colorRgba,
            letterSpacingPx: repr.style.letterSpacingPx,
            lineHeightPx: repr.style.lineHeightPx,
            textAlign: repr.style.textAlign,
          },
          rotationDeg: parseFloat(rotKey),
          elements: cluster.map((el) => el.id),
        });
      }
    }

    console.log(`[Extractor] Merged into ${lines.length} lines`);
    return lines;
  }

  /**
   * Main extraction function
   */
  function extract() {
    try {
      console.log('[Extractor] Starting extraction...');

      // Find slide container
      const slideEl = findSlideContainer();
      if (!slideEl) {
        return {
          success: false,
          error: 'Slide container not found. NotebookLM DOM may have changed.',
        };
      }

      const slideRect = slideEl.getBoundingClientRect();
      console.log('[Extractor] Slide rect:', slideRect);

      // Extract text elements
      const elements = extractTextElements(slideEl, slideRect);

      if (elements.length === 0) {
        return {
          success: false,
          error: 'No text elements found in slide.',
        };
      }

      // Merge into lines
      const layers = mergeIntoLines(elements);

      // Detect canvas-rendered slides (low quality extraction)
      const totalTextLength = layers.reduce((sum, layer) => sum + (layer.text?.length || 0), 0);
      const isLikelyCanvasRendered = layers.length < 5 || totalTextLength < 20;

      if (isLikelyCanvasRendered) {
        console.warn('[Extractor] Low quality extraction detected:', {
          layers: layers.length,
          totalTextLength,
          reason: layers.length < 5 ? 'Too few text layers (< 5)' : 'Too little text content (< 20 chars)',
        });
      }

      // Build export data
      const data = {
        version: 1,
        source: {
          url: window.location.href,
          title: document.title,
          dpr: window.devicePixelRatio || 1,
          slideW: Math.round(slideRect.width),
          slideH: Math.round(slideRect.height),
          slideX: Math.round(slideRect.x),
          slideY: Math.round(slideRect.y),
          createdAt: new Date().toISOString(),
          isLikelyCanvasRendered, // Quality warning
        },
        layers,
        _elements: elements.map((el) => ({
          id: el.id,
          text: el.text,
          rect: el.rectSlideLocal,
        })),
      };

      console.log('[Extractor] Extraction complete:', {
        elements: elements.length,
        layers: layers.length,
        quality: isLikelyCanvasRendered ? 'LOW (likely canvas-rendered)' : 'OK',
      });

      // Store elements for screenshot hiding
      window.__notebookLM_extractedElements = elements;

      return {
        success: true,
        // Flattened structure for easier access
        elements,
        layers: data.layers,
        source: data.source,
        slideRect: {
          x: slideRect.x,
          y: slideRect.y,
          width: slideRect.width,
          height: slideRect.height,
        },
        dpr: data.source.dpr,
        // Full data for compatibility
        data,
      };
    } catch (err) {
      console.error('[Extractor] Error:', err);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Hide text for clean screenshot
   */
  function hideTextForScreenshot() {
    const elements = window.__notebookLM_extractedElements || [];
    const originals = [];

    for (const item of elements) {
      const el = item.element;
      if (!el) continue;

      // Store original styles
      originals.push({
        element: el,
        color: el.style.color,
        textShadow: el.style.textShadow,
        fill: el.style.fill,
      });

      // Hide text
      el.style.setProperty('color', 'transparent', 'important');
      el.style.setProperty('text-shadow', 'none', 'important');

      // SVG text
      if (el.tagName === 'text') {
        el.style.setProperty('fill', 'transparent', 'important');
      }
    }

    console.log(`[Extractor] Hid ${originals.length} text elements`);
    window.__notebookLM_originalStyles = originals;

    return originals;
  }

  /**
   * Restore original text styles
   */
  function restoreTextStyles() {
    const originals = window.__notebookLM_originalStyles || [];

    for (const orig of originals) {
      const el = orig.element;
      if (!el) continue;

      el.style.color = orig.color;
      el.style.textShadow = orig.textShadow;
      if (el.tagName === 'text') {
        el.style.fill = orig.fill;
      }
    }

    console.log(`[Extractor] Restored ${originals.length} text elements`);
    window.__notebookLM_originalStyles = null;
  }

  /**
   * Detect slide navigation controls and total slide count
   */
  function detectSlideInfo() {
    // Try to find slide navigation elements
    // Common patterns: "Slide 1 of 10", navigation buttons, etc.

    const textContent = document.body.innerText;
    const match = textContent.match(/Slide\s+(\d+)\s+of\s+(\d+)/i) ||
                  textContent.match(/(\d+)\s*\/\s*(\d+)/);

    if (match) {
      return {
        currentSlide: parseInt(match[1]),
        totalSlides: parseInt(match[2]),
      };
    }

    // Fallback: try to count slide thumbnails in sidebar
    const thumbnails = document.querySelectorAll('[class*="thumbnail"], [class*="slide-preview"]');
    if (thumbnails.length > 0) {
      return {
        currentSlide: 1, // Assume first slide
        totalSlides: thumbnails.length,
      };
    }

    return {
      currentSlide: 1,
      totalSlides: 1, // Assume single slide if can't detect
    };
  }

  /**
   * Navigate to next slide
   */
  function navigateToNextSlide() {
    // Try common keyboard shortcuts
    const nextButtons = [
      document.querySelector('[aria-label*="next" i], [aria-label*="다음" i]'),
      document.querySelector('button[class*="next"]'),
      ...Array.from(document.querySelectorAll('button, [role="button"]')).filter(
        (el) => el.innerText?.toLowerCase().includes('next') || el.innerText?.includes('다음')
      ),
    ].filter(Boolean);

    if (nextButtons[0]) {
      nextButtons[0].click();
      return true;
    }

    // Fallback: keyboard shortcut (arrow right)
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      code: 'ArrowRight',
      bubbles: true,
    });
    document.dispatchEvent(event);
    return true;
  }

  /**
   * Calculate hash of slide content for duplicate detection
   */
  function calculateSlideHash(extractionResult) {
    if (!extractionResult || !extractionResult.layers) {
      return null;
    }

    // Create hash from text content
    const textContent = extractionResult.layers
      .map((layer) => layer.text || '')
      .join('|');

    // Simple hash function (djb2)
    let hash = 5381;
    for (let i = 0; i < textContent.length; i++) {
      hash = (hash * 33) ^ textContent.charCodeAt(i);
    }

    return hash >>> 0; // Convert to unsigned 32-bit integer
  }

  /**
   * Wait for slide transition to complete
   * Uses multiple detection strategies:
   * 1. Slide number change in UI
   * 2. Text content hash change
   * 3. DOM mutation detection
   * Falls back to timeout if detection fails
   */
  async function waitForSlideTransition(expectedSlideNumber, previousHash, maxWaitMs = 2000) {
    const startTime = Date.now();
    const pollInterval = 100; // Check every 100ms

    while (Date.now() - startTime < maxWaitMs) {
      await sleep(pollInterval);

      // Strategy 1: Check if slide number changed in UI
      const currentSlideInfo = detectSlideInfo();
      if (currentSlideInfo.currentSlide === expectedSlideNumber) {
        console.log('[Content Script] Slide transition detected (slide number changed)');
        // Wait a bit more for render to settle
        await sleep(200);
        return true;
      }

      // Strategy 2: Check if text content hash changed
      const slideEl = findSlideContainer();
      if (slideEl) {
        const currentText = slideEl.innerText || '';
        let currentHash = 5381;
        for (let i = 0; i < currentText.length; i++) {
          currentHash = (currentHash * 33) ^ currentText.charCodeAt(i);
        }
        currentHash = currentHash >>> 0;

        if (currentHash !== previousHash && currentHash !== 5381) {
          console.log('[Content Script] Slide transition detected (content hash changed)');
          // Wait a bit more for render to settle
          await sleep(200);
          return true;
        }
      }

      // Continue polling
    }

    // Timeout fallback
    console.warn('[Content Script] Slide transition detection timeout, using fallback delay');
    return false;
  }

  /**
   * Listen for messages from webapp via window.postMessage
   */
  window.addEventListener('message', (event) => {
    // Only accept messages from same origin or extension
    if (event.data?.type === 'IMAGEFIX_PING' && event.data?.source === 'webapp') {
      console.log('[Content Script] Received PING from webapp');
      window.postMessage({ type: 'IMAGEFIX_PONG', source: 'extension' }, '*');
    }

    if (event.data?.type === 'IMAGEFIX_IMPORT_REQUEST' && event.data?.source === 'webapp') {
      console.log('[Content Script] Received import request from webapp:', event.data);

      // Forward to service worker
      chrome.runtime.sendMessage({
        type: 'IMPORT_URL',
        requestId: event.data.requestId,
        url: event.data.url,
        sourceTabId: chrome.devtools?.inspectedWindow?.tabId, // May not be available
      });
    }
  });

  /**
   * Listen for messages from service worker
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'RUN_MULTI_SLIDE_EXPORT') {
      handleMultiSlideExport(request.requestId, request.sourceTabId)
        .then((result) => sendResponse(result))
        .catch((err) => {
          console.error('[Content Script] Multi-slide export error:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true; // Keep channel open for async
    }
  });

  /**
   * Handle multi-slide export (sequential) with duplicate detection
   */
  async function handleMultiSlideExport(requestId, sourceTabId) {
    try {
      console.log('[Content Script] Starting multi-slide export');

      // Detect slide info
      const slideInfo = detectSlideInfo();
      console.log('[Content Script] Detected:', slideInfo);

      const slides = [];
      const capturedHashes = new Set(); // Track captured slide hashes

      for (let i = 0; i < slideInfo.totalSlides; i++) {
        console.log(`[Content Script] Exporting slide ${i + 1}/${slideInfo.totalSlides}`);

        // Send progress
        chrome.runtime.sendMessage({
          type: 'EXPORT_PROGRESS',
          requestId,
          sourceTabId,
          message: `슬라이드 ${i + 1}/${slideInfo.totalSlides} 캡처 중...`,
        });

        // Retry logic: max 2 attempts per slide
        let attempt = 0;
        let slideSuccessfullyCaptured = false;
        const maxAttempts = 2;

        while (attempt < maxAttempts && !slideSuccessfullyCaptured) {
          attempt++;

          if (attempt > 1) {
            console.log(`[Content Script] Retry attempt ${attempt}/${maxAttempts} for slide ${i + 1}`);
          }

          // Wait for slide to settle
          await sleep(500);

          // Extract current slide
          const extractionResult = extract();
          if (!extractionResult.success) {
            console.warn('[Content Script] Extraction failed:', extractionResult.error);
            if (attempt < maxAttempts) {
              await sleep(500); // Wait before retry
              continue;
            } else {
              break; // Give up after max attempts
            }
          }

          // Calculate hash for duplicate detection
          const slideHash = calculateSlideHash(extractionResult);

          // Check if we already captured this slide (duplicate detection)
          if (slideHash && capturedHashes.has(slideHash)) {
            console.warn(`[Content Script] Duplicate slide detected (hash: ${slideHash}), skipping`);
            if (attempt < maxAttempts) {
              await sleep(500); // Wait before retry
              continue;
            } else {
              break; // Give up after max attempts
            }
          }

          // Hide text
          const elements = extractionResult.elements;
          hideTextForScreenshot(elements);

          // Wait for render
          await sleep(300);

          // Request screenshot from service worker
          const captureResult = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
              {
                type: 'CAPTURE_VISIBLE_TAB',
                requestId,
                slideRect: extractionResult.slideRect,
                dpr: extractionResult.dpr,
              },
              resolve
            );
          });

          // Restore text
          restoreTextStyles();

          if (captureResult.success) {
            // Add to captured set
            if (slideHash) {
              capturedHashes.add(slideHash);
            }

            slides.push({
              slideNumber: i + 1,
              pagePngDataUrl: captureResult.dataUrl,
              layersJson: {
                version: 1,
                source: extractionResult.source,
                layers: extractionResult.layers,
              },
            });

            slideSuccessfullyCaptured = true;
            console.log(`[Content Script] Slide ${i + 1} captured successfully (hash: ${slideHash})`);
          } else {
            console.warn('[Content Script] Screenshot capture failed');
            if (attempt < maxAttempts) {
              await sleep(500); // Wait before retry
            }
          }
        }

        // Navigate to next slide (if not last)
        if (i < slideInfo.totalSlides - 1) {
          // Store current content hash before navigation
          const slideEl = findSlideContainer();
          let previousHash = 5381;
          if (slideEl) {
            const currentText = slideEl.innerText || '';
            for (let j = 0; j < currentText.length; j++) {
              previousHash = (previousHash * 33) ^ currentText.charCodeAt(j);
            }
            previousHash = previousHash >>> 0;
          }

          navigateToNextSlide();

          // Wait for transition to complete (smart detection + fallback)
          const transitionDetected = await waitForSlideTransition(i + 2, previousHash, 2000);
          if (!transitionDetected) {
            // Fallback: use fixed delay
            await sleep(400);
          }
        }
      }

      console.log(`[Content Script] Export complete: ${slides.length} slides captured, ${capturedHashes.size} unique`);

      // Send results back to webapp via service worker
      chrome.runtime.sendMessage({
        type: 'EXPORT_COMPLETE',
        requestId,
        sourceTabId,
        slides,
      });

      return {
        success: true,
        slideCount: slides.length,
      };
    } catch (err) {
      console.error('[Content Script] Multi-slide export error:', err);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Expose API
  window.__notebookLMExtractor = {
    extract,
    hideTextForScreenshot,
    restoreTextStyles,
    detectSlideInfo,
    navigateToNextSlide,
  };

  console.log('[NotebookLM Extractor] Ready');
})();
