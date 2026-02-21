# Pretendard 폰트 파일

이 디렉토리에 Pretendard 폰트 파일을 다운로드하세요.

## 다운로드 방법

1. https://github.com/orioncactus/pretendard/releases 로 이동
2. 최신 릴리즈에서 `Pretendard-1.x.x.zip` 다운로드
3. 압축을 풀고 `web/variable/woff2/` 디렉토리에서 다음 파일을 복사:
   - `Pretendard-Regular.woff2`
   - `Pretendard-Medium.woff2`
   - `Pretendard-SemiBold.woff2`
   - `Pretendard-Bold.woff2`

4. 이 디렉토리(`public/fonts/`)에 파일을 붙여넣기

## 대안: CDN 사용 (빠른 테스트용)

폰트 파일을 다운로드하지 않고 CDN을 사용하려면 `app/layout.tsx` 파일을 수정하여 다음과 같이 변경:

```tsx
import { Inter } from 'next/font/google';

// 또는 Pretendard CDN 링크를 globals.css에 추가:
// @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
```
