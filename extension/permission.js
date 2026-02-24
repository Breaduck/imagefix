/**
 * Permission request page script
 * Handles one-time permission request for <all_urls>
 */

console.log('[Permission] Page loaded');

const grantBtn = document.getElementById('grant-btn');
const statusDiv = document.getElementById('status');

grantBtn.addEventListener('click', async () => {
  console.log('[Permission] User clicked grant button');

  grantBtn.disabled = true;
  grantBtn.textContent = '권한 요청 중...';

  try {
    // Request <all_urls> permission
    const granted = await chrome.permissions.request({
      origins: ['<all_urls>']
    });

    console.log('[Permission] Request result:', granted);

    // Send result to service worker
    chrome.runtime.sendMessage({
      type: 'CAPTURE_PERMISSION_RESULT',
      granted: granted
    });

    if (granted) {
      // Show success message
      statusDiv.className = 'status success';
      statusDiv.textContent = '✅ 권한이 승인되었습니다! 이 창을 닫고 슬라이드를 가져오세요.';
      statusDiv.style.display = 'block';

      grantBtn.style.display = 'none';

      // Auto-close after 2 seconds
      setTimeout(() => {
        window.close();
      }, 2000);
    } else {
      // Show error message
      statusDiv.className = 'status error';
      statusDiv.textContent = '❌ 권한이 거절되었습니다. 슬라이드 자동 캡처를 사용할 수 없습니다.';
      statusDiv.style.display = 'block';

      grantBtn.disabled = false;
      grantBtn.textContent = '다시 시도';
    }
  } catch (error) {
    console.error('[Permission] Error requesting permission:', error);

    statusDiv.className = 'status error';
    statusDiv.textContent = `❌ 오류: ${error.message}`;
    statusDiv.style.display = 'block';

    grantBtn.disabled = false;
    grantBtn.textContent = '다시 시도';
  }
});
