# NotebookLM 텍스트 편집기

이미지에서 텍스트를 추출하고, 원본 스타일을 유지하면서 편집 가능한 웹 애플리케이션입니다.

## 주요 기능

- 이미지 드래그 앤 드롭 업로드
- OCR 자동 텍스트 감지 (한글 + 영문)
- 캔버스에서 텍스트 직접 편집
- 원본 스타일 보존 (폰트 크기, 색상, 위치, 회전각도)
- PNG/JPG 다운로드 또는 클립보드 복사

## 기술 스택

- **프론트엔드**: React + Next.js 16
- **캔버스**: Fabric.js 5.3
- **OCR**: Tesseract.js (한글 + 영문)
- **폰트**: Pretendard
- **스타일링**: Tailwind CSS
- **언어**: TypeScript

## 설정 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. Pretendard 폰트 다운로드

`public/fonts/` 디렉토리에 다음 폰트 파일을 다운로드하세요:
- Pretendard-Regular.woff2
- Pretendard-Medium.woff2
- Pretendard-SemiBold.woff2
- Pretendard-Bold.woff2

다운로드 링크: https://github.com/orioncactus/pretendard/releases

### 3. Tesseract 언어 데이터 다운로드

`public/tessdata/` 디렉토리에 다음 언어 파일을 다운로드하세요:
- kor.traineddata (한글)
- eng.traineddata (영어)

다운로드 링크: https://github.com/tesseract-ocr/tessdata

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 을 열어 확인하세요.

## 프로젝트 구조

```
notebook-text-editor/
├── app/                      # Next.js App Router 페이지
├── components/               # React 컴포넌트
│   ├── atoms/               # 기본 컴포넌트 (Button, LoadingSpinner 등)
│   ├── molecules/           # 조합 컴포넌트 (DropZone, TextStyleControls 등)
│   ├── organisms/           # 복잡한 컴포넌트 (CanvasEditor, ImageUploader 등)
│   └── templates/           # 레이아웃 템플릿
├── hooks/                   # Custom React Hooks
├── lib/                     # 유틸리티 및 라이브러리
│   ├── ocr/                # OCR 관련 로직
│   ├── canvas/             # Fabric.js 캔버스 유틸리티
│   ├── style/              # 스타일 추출 알고리즘
│   ├── export/             # 내보내기 기능
│   └── utils/              # 기타 유틸리티
├── types/                   # TypeScript 타입 정의
└── public/                  # 정적 파일
    ├── fonts/              # Pretendard 폰트 파일
    └── tessdata/           # Tesseract OCR 언어 데이터
```

## 라이선스

ISC
