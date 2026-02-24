/**
 * Webapp Bridge Content Script
 * Runs on ImageFix webapp to enable communication with extension
 *
 * Flow:
 * Webapp → window.postMessage → this bridge → chrome.runtime.sendMessage → service_worker
 * service_worker → chrome.tabs.sendMessage → this bridge → window.postMessage → Webapp
 */

(function () {
  'use strict';

  console.log('[Webapp Bridge] Loaded on:', window.location.origin);

  /**
   * Listen for messages from webapp (window.postMessage)
   */
  window.addEventListener('message', (event) => {
    // Only accept messages from same origin (security)
    if (event.source !== window) {
      return;
    }

    const message = event.data;

    // Handle PING (extension detection)
    if (message?.type === 'IMAGEFIX_PING' && message?.source === 'webapp') {
      console.log('[Webapp Bridge] Received PING from webapp');

      // Send PONG back to webapp
      window.postMessage(
        {
          type: 'IMAGEFIX_PONG',
          source: 'extension',
        },
        '*'
      );

      console.log('[Webapp Bridge] Sent PONG to webapp');
    }

    // Handle IMPORT_REQUEST (link import)
    if (message?.type === 'IMAGEFIX_IMPORT_REQUEST' && message?.source === 'webapp') {
      console.log('[Webapp Bridge] Received IMPORT_REQUEST:', {
        requestId: message.requestId,
        url: message.url,
      });

      // Forward to service worker
      chrome.runtime.sendMessage(
        {
          type: 'IMPORT_URL',
          requestId: message.requestId,
          url: message.url,
          sourceTabId: null, // Service worker will figure this out
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Webapp Bridge] Error sending to service worker:', chrome.runtime.lastError);
          } else {
            console.log('[Webapp Bridge] Forwarded to service worker:', response);
          }
        }
      );
    }
  });

  /**
   * Listen for messages from service worker (chrome.runtime.sendMessage)
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Webapp Bridge] Received from service worker:', request.type);

    // Forward progress updates to webapp
    if (request.type === 'IMAGEFIX_IMPORT_PROGRESS') {
      window.postMessage(
        {
          type: 'IMAGEFIX_IMPORT_PROGRESS',
          requestId: request.requestId,
          message: request.message,
        },
        '*'
      );
      sendResponse({ success: true });
    }

    // Forward import results to webapp
    if (request.type === 'IMAGEFIX_IMPORT_RESULT') {
      console.log('[Webapp Bridge] Forwarding result to webapp:', {
        requestId: request.requestId,
        slides: request.slides?.length,
      });

      window.postMessage(
        {
          type: 'IMAGEFIX_IMPORT_RESULT',
          requestId: request.requestId,
          slides: request.slides,
        },
        '*'
      );

      sendResponse({ success: true });
    }

    // Forward errors to webapp
    if (request.type === 'IMAGEFIX_IMPORT_ERROR') {
      console.log('[Webapp Bridge] Forwarding error to webapp:', request.message);

      window.postMessage(
        {
          type: 'IMAGEFIX_IMPORT_ERROR',
          requestId: request.requestId,
          message: request.message,
        },
        '*'
      );

      sendResponse({ success: true });
    }

    return false; // Synchronous response
  });

  console.log('[Webapp Bridge] Ready and listening');
})();
