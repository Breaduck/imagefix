# Link Import Feature

**간단한 URL 붙여넣기로 NotebookLM 슬라이드 전체 자동 캡처!**

## 🧪 Web Store 없이 테스트하기 (Load unpacked)

크롬 웹스토어에 업로드하기 전에 로컬에서 100% 동작 확인이 가능합니다.

### 1단계: 확장프로그램 설치 (개발자 모드)

```bash
1. Chrome 열기
2. chrome://extensions/ 이동
3. 우측 상단 "개발자 모드" 토글 켜기
4. "압축 해제된 확장 프로그램을 로드합니다" 클릭
5. notebook-text-editor/extension 폴더 선택
6. 확장프로그램이 로드되면 ID 확인 (예: abcdefghijklmnop...)
```

### 2단계: 사이트 액세스 권한 설정

**중요**: Load unpacked 방식은 기본적으로 모든 사이트 접근이 차단됩니다.

```bash
1. chrome://extensions/ 에서 "ImageFix Link Import Companion" 찾기
2. "세부정보" 클릭
3. "사이트 액세스" 섹션에서:
   - "notebooklm.google.com" 추가 → "허용"
   - "imagefix-dun.vercel.app" 추가 → "허용"
   - "localhost" (개발 중이라면) → "허용"
4. 저장
```

### 3단계: 웹앱 새로고침 (Hard Refresh)

```bash
1. https://imagefix-dun.vercel.app 열기
2. Ctrl+Shift+R (Windows) 또는 Cmd+Shift+R (Mac) - 하드 리프레시
3. F12 눌러서 개발자 도구 열기
4. Console 탭 확인
```

### 4단계: 연결 확인

**기대 로그 (Console):**

```
[Webapp Bridge] Loaded on: https://imagefix-dun.vercel.app
[Webapp Bridge] Ready and listening
[LinkImport] Extension detected: { version: "1.1.0", hasNotebookLMPermission: true }
```

**기대 화면:**

✅ "ImageFix Link Import Companion 연결됨 (v1.1.0)" 녹색 배너가 보여야 함

**만약 "확장프로그램 설치 필요" 파란색 배너가 보인다면:**

- PING/PONG 통신 실패 → 2단계(사이트 액세스 권한) 다시 확인
- Console에서 `[Webapp Bridge] Loaded` 로그가 없다면 → manifest.json의 content_scripts 확인
- 진단 로그 복사 버튼 클릭 → GitHub Issue에 첨부

### 5단계: 실제 테스트

```bash
1. NotebookLM 프레젠테이션 URL 복사
   예: https://notebooklm.google.com/notebook/abc123/audio
2. 웹앱에 붙여넣기
3. "슬라이드 가져오기" 클릭
4. Console 로그 확인:
   [Webapp Bridge] Received IMPORT_REQUEST: { requestId: "req_...", url: "..." }
   [SW] IMPORT_URL recv url=...
   [SW] tab created id=123
   [CS] extracted layers=15 slideRect=...
   [SW] closing tab id=123
   [LinkImport] Received results: 5 slides
```

### 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| "확장프로그램 설치 필요" 배너 | PONG 못 받음 | 사이트 액세스 권한 확인, 하드 리프레시 |
| "권한 설정 필요" 배너 | NotebookLM 권한 없음 | chrome://extensions에서 notebooklm.google.com 허용 |
| Console에 `[Webapp Bridge]` 없음 | content_script 주입 실패 | manifest.json 확인, 확장 재로드 |
| 슬라이드 캡처 실패 | NotebookLM 로그인 필요 | Chrome에서 NotebookLM 먼저 로그인 |

---

## 개요

기존 방식 (복잡):
1. NotebookLM 열기
2. 확장프로그램 클릭
3. 파일 2개 다운로드
4. 웹앱에 파일 2개 업로드

새로운 방식 (간단):
1. NotebookLM URL 복사
2. 웹앱에 붙여넣기
3. 클릭 → 끝! (자동 캡처)

## 사용 방법

### 1단계: 확장프로그램 설치

```bash
1. Chrome 열기
2. chrome://extensions/ 이동
3. "개발자 모드" 켜기 (우측 상단)
4. "압축해제된 확장 프로그램 로드" 클릭
5. notebook-text-editor/extension 폴더 선택
6. 완료!
```

### 2단계: 웹앱에서 URL 붙여넣기

```bash
1. http://localhost:3000 열기
2. "🔗 Link Import" 모드 선택
3. NotebookLM 프레젠테이션 URL 붙여넣기
   예: https://notebooklm.google.com/notebook/abc123/...
4. "슬라이드 가져오기" 버튼 클릭
5. 자동으로 모든 슬라이드가 캡처되고 캔버스에 로드됨!
```

## 작동 원리

### 전체 흐름

```
웹앱 (https://imagefix-dun.vercel.app)
  ↓ (1) postMessage: IMPORT_REQUEST
Webapp Bridge (content script on webapp)
  ↓ (2) chrome.runtime.sendMessage
Chrome Extension (Service Worker)
  ↓ (2) chrome.tabs.create(notebooklm URL)
새 탭: NotebookLM (자동 열림)
  ↓ (3) Content Script 실행
  ↓ (4) 슬라이드 1/N 추출 + 캡처
  ↓ (5) 다음 슬라이드로 이동
  ↓ (6) 슬라이드 2/N 추출 + 캡처
  ↓ ... (반복)
  ↓ (7) 모든 슬라이드 완료
Service Worker
  ↓ (8) postMessage: IMPORT_RESULT (PNG + JSON)
  ↓ (9) NotebookLM 탭 자동 닫기
웹앱
  ↓ (10) Fabric 캔버스에 렌더링
완료! ✅
```

### 기술적 세부사항

#### 1. 웹앱 → 확장프로그램 통신

**webapp (https://imagefix-dun.vercel.app):**
```javascript
window.postMessage({
  type: 'IMAGEFIX_IMPORT_REQUEST',
  requestId: 'req_12345',
  url: 'https://notebooklm.google.com/...',
  source: 'webapp'
}, '*');
```

**webapp_bridge.js (content script injected into webapp):**
```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'IMAGEFIX_IMPORT_REQUEST') {
    chrome.runtime.sendMessage({
      type: 'IMPORT_URL',
      requestId: event.data.requestId,
      url: event.data.url
    });
  }
});
```

#### 2. 탭 자동 열기 및 대기

**extension service_worker:**
```javascript
const tab = await chrome.tabs.create({ url, active: true });
await waitForTabLoad(tab.id);
```

#### 3. 다중 슬라이드 순차 추출

**extension content_script:**
```javascript
const slideInfo = detectSlideInfo(); // "Slide 1 of 10"
for (let i = 0; i < slideInfo.totalSlides; i++) {
  // Extract current slide
  const result = extract();

  // Hide text
  hideTextForScreenshot(result.elements);

  // Capture screenshot
  const screenshot = await captureVisibleTab();

  // Restore text
  restoreTextStyles();

  // Navigate to next
  if (i < totalSlides - 1) {
    navigateToNextSlide(); // Click next button or ArrowRight key
    await sleep(800);
  }
}
```

#### 4. 결과 전송 및 탭 닫기

**extension service_worker:**
```javascript
// Send to webapp
await chrome.scripting.executeScript({
  target: { tabId: webappTabId },
  func: (result) => window.postMessage(result, '*'),
  args: [{
    type: 'IMAGEFIX_IMPORT_RESULT',
    requestId,
    slides: [...]
  }]
});

// Close NotebookLM tab
await chrome.tabs.remove(notebookLMTabId);
```

#### 5. 웹앱에서 렌더링

**webapp:**
```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'IMAGEFIX_IMPORT_RESULT') {
    const slides = event.data.slides;
    // Convert to DOM import format
    const firstSlide = slides[0];
    await importDOMFiles(firstSlide.pagePngDataUrl, firstSlide.layersJson);
  }
});
```

## 로그 예시

### 성공 케이스

```
[Web] Link import started: req_abc123
[Ext SW] Opening NotebookLM URL: https://notebooklm.google.com/...
[Ext SW] Tab loaded, injecting content script...
[Ext CS] Starting multi-slide export
[Ext CS] Detected: { currentSlide: 1, totalSlides: 5 }
[Ext CS] Exporting slide 1/5
[Ext SW] Capturing visible tab: 12345
[Ext CS] Exporting slide 2/5
[Ext SW] Capturing visible tab: 12345
[Ext CS] Exporting slide 3/5
...
[Ext CS] Export complete: 5 slides
[Ext SW] Results sent to webapp
[Ext SW] Closed NotebookLM tab
[Web] Link import complete: 5 slides
[Web] First slide loaded: 1920x1080, 24 text regions
```

### 에러 케이스

```
[Web] Link import started: req_xyz789
[Ext SW] Opening NotebookLM URL: https://notebooklm.google.com/...
[Ext CS] Slide container not found. NotebookLM DOM may have changed.
[Ext SW] Export failed: Slide container not found
[Web] Link import error: Slide container not found
```

## 확장프로그램 미설치 감지

웹앱은 PING/PONG으로 확장프로그램 설치 여부를 확인합니다:

```javascript
// Webapp sends PING
window.postMessage({ type: 'IMAGEFIX_PING', source: 'webapp' }, '*');

// Extension responds with PONG
window.postMessage({ type: 'IMAGEFIX_PONG', source: 'extension' }, '*');

// If no PONG within 1 second → show install banner
```

## 권한

확장프로그램에 필요한 권한:

```json
{
  "permissions": [
    "activeTab",    // 현재 탭 접근
    "scripting",    // 스크립트 주입
    "downloads",    // 파일 다운로드 (레거시 모드)
    "storage",      // 설정 저장
    "tabs"          // 탭 열기/닫기
  ],
  "host_permissions": [
    "https://notebooklm.google.com/*"
  ]
}
```

## 제한사항

### 현재 MVP

- **한 슬라이드만 표시**: 다중 슬라이드를 캡처하지만, 웹앱에서는 첫 번째 슬라이드만 표시됩니다.
  - 향후 업데이트: 슬라이드 네비게이션 UI 추가 예정

- **NotebookLM 로그인 필요**: NotebookLM은 로그인이 필요하므로, 미리 Chrome에서 로그인해야 합니다.

- **탭이 잠깐 열림**: 캡처 중 NotebookLM 탭이 자동으로 열렸다가 닫힙니다 (백그라운드 처리 불가).

### 알려진 이슈

- **슬라이드 감지 실패**: NotebookLM DOM 구조가 변경되면 슬라이드 개수를 감지하지 못할 수 있습니다.
  - Fallback: 단일 슬라이드로 처리

- **네비게이션 실패**: "다음 슬라이드" 버튼을 찾지 못하면 ArrowRight 키보드 단축키를 시도합니다.

## 트러블슈팅

### "확장프로그램 설치 필요" 경고

→ 확장프로그램이 설치되지 않았거나 비활성화 상태입니다.
- `chrome://extensions/` 에서 확장프로그램이 활성화되어 있는지 확인하세요.

### "Slide container not found"

→ NotebookLM DOM 구조가 변경되었거나 슬라이드가 로드되지 않았습니다.
- NotebookLM 페이지를 새로고침하고 슬라이드가 완전히 로드될 때까지 기다린 후 재시도하세요.

### "NotebookLM 로그인 후 다시 시도"

→ NotebookLM에 로그인되지 않았습니다.
- Chrome에서 NotebookLM에 로그인한 후 재시도하세요.

### 슬라이드 개수가 1개로 감지됨

→ 슬라이드 개수 감지 로직이 실패했습니다.
- NotebookLM UI가 업데이트되었을 수 있습니다.
- 이 경우 파일 업로드 방식 ("📁 File Import")을 사용하세요.

## 향후 개선 계획

1. **다중 슬라이드 편집 UI**: 슬라이드 썸네일, 페이지 네비게이션
2. **백그라운드 캡처**: 탭을 보이지 않게 처리 (offscreen API 사용)
3. **배치 내보내기**: 여러 프레젠테이션을 한번에 처리
4. **프리뷰 모드**: 캡처 전 슬라이드 미리보기
5. **캡처 설정**: DPI, 품질, 슬라이드 범위 지정

## 코드 구조

### Webapp

- `components/molecules/LinkImportZone.tsx`: URL 입력 UI + 확장프로그램 통신
- `app/page.tsx`: Link Import 모드 통합
- `hooks/useDOMImport.ts`: DOM 데이터 → Fabric 렌더링 (재사용)

### Extension

- `manifest.json`: 권한, content_scripts, service_worker 설정
- `content_script.js`:
  - `detectSlideInfo()`: 슬라이드 개수 감지
  - `navigateToNextSlide()`: 다음 슬라이드 이동
  - `handleMultiSlideExport()`: 순차 추출 로직
  - postMessage 리스너 (webapp ↔ extension)
- `service_worker.js`:
  - `handleImportURL()`: 탭 열기
  - `handleCaptureVisibleTab()`: 스크린샷 캡처
  - `handleExportComplete()`: 결과 전송 + 탭 닫기

## 데이터 형식

### 요청 (webapp → extension)

```javascript
{
  type: 'IMAGEFIX_IMPORT_REQUEST',
  requestId: 'req_1234567890_abc',
  url: 'https://notebooklm.google.com/notebook/...',
  source: 'webapp'
}
```

### 응답 (extension → webapp)

```javascript
{
  type: 'IMAGEFIX_IMPORT_RESULT',
  requestId: 'req_1234567890_abc',
  slides: [
    {
      slideNumber: 1,
      pagePngDataUrl: 'data:image/png;base64,...',
      layersJson: {
        version: 1,
        source: { url, title, dpr, slideW, slideH, createdAt },
        layers: [
          {
            id: 'layer_1',
            type: 'text-line',
            text: '안녕하세요',
            bbox: { x: 100, y: 200, w: 300, h: 50 },
            style: { fontFamily, fontSizePx, color, ... },
            rotationDeg: 0
          },
          ...
        ]
      }
    },
    ...
  ]
}
```

## 보안

- **데이터 전송**: 브라우저 → 웹앱 (로컬)만. 외부 서버 전송 없음.
- **권한 최소화**: 필요한 권한만 요청 (tabs, activeTab, scripting).
- **Origin 검증**: postMessage는 같은 origin 또는 확장프로그램만 수신.

## 성능

- **단일 슬라이드**: ~2-3초
- **10개 슬라이드**: ~15-20초
- **병목**: 슬라이드 네비게이션 애니메이션 대기 (800ms per slide)

## 참고 링크

- [Chrome Extension Messaging API](https://developer.chrome.com/docs/extensions/mv3/messaging/)
- [window.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [chrome.tabs API](https://developer.chrome.com/docs/extensions/reference/tabs/)
