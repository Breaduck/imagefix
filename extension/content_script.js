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

        // Merge text with space detection
        let mergedText = cluster[0].text;
        for (let i = 1; i < cluster.length; i++) {
          const prev = cluster[i - 1];
          const curr = cluster[i];

          const gap = curr.rectSlideLocal.x - (prev.rectSlideLocal.x + prev.rectSlideLocal.w);
          const avgFontSize = (prev.style.fontSizePx + curr.style.fontSizePx) / 2;

          // Korean: gap > fontSize*0.4, English: gap > fontSize*0.2
          const threshold = /[\u3131-\uD79D]/.test(curr.text) ? avgFontSize * 0.4 : avgFontSize * 0.2;

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
      });

      // Store elements for screenshot hiding
      window.__notebookLM_extractedElements = elements;

      return {
        success: true,
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

  // Expose API
  window.__notebookLMExtractor = {
    extract,
    hideTextForScreenshot,
    restoreTextStyles,
  };

  console.log('[NotebookLM Extractor] Ready');
})();
