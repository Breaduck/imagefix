# PDF 텍스트 추출 기능 가이드

## 개요

NotebookLM PDF에서 텍스트를 추출하고 편집할 수 있는 기능이 추가되었습니다.
**OCR 방식(이미지)과 PDF.js 방식(PDF 텍스트 레이어)을 모두 지원**합니다.

## 아키텍처

### 1. PDF 처리 파이프라인

```
PDF 파일 업로드
  ↓
PDF.js로 로드
  ↓
페이지 렌더링 (Canvas) → 배경 이미지로 사용
  ↓
TextContent 추출 (textItems + fontInfo)
  ↓
폰트 매핑 (PDF 폰트명 → 웹폰트)
  ↓
Transform 행렬 파싱 (위치, 크기, 회전)
  ↓
Fabric.js Text 객체 생성
  ↓
편집 가능한 캔버스
```

### 2. 폰트 탐지 및 매핑 시스템

#### 폰트 정규화 과정

1. **Subset Prefix 제거**
   ```typescript
   // PDF에서 추출: "ABCDEF+NotoSansKR-Regular"
   // 정규화 후: "NotoSansKR-Regular"
   removeSubsetPrefix(fontName);
   ```

2. **폰트명 정규화**
   ```typescript
   // "Noto-Sans-KR_Regular" → "notosanskrregular"
   normalizeFontName(fontName);
   ```

3. **매핑 테이블 조회**
   ```typescript
   FONT_MAPPING_TABLE['notosanskr']
   // → { webFont: 'Noto Sans KR', fallbacks: [...] }
   ```

#### 폰트 매핑 테이블 예시

| PDF 폰트명 | 웹폰트 | Fallbacks |
|-----------|--------|-----------|
| NotoSansKR | Noto Sans KR | Malgun Gothic, Apple SD Gothic Neo, sans-serif |
| Pretendard | Pretendard | Noto Sans KR, Malgun Gothic, sans-serif |
| Roboto | Roboto | Noto Sans KR, Arial, sans-serif |
| GoogleSans | Google Sans | Roboto, Noto Sans KR, sans-serif |
| Malgun | Malgun Gothic | Noto Sans KR, Apple SD Gothic Neo, sans-serif |
| TimesNewRoman | Times New Roman | Georgia, Noto Serif KR, serif |

전체 매핑 테이블: `lib/pdf/font-mapper.ts` 참조

### 3. 스타일 추출

#### Transform 행렬 파싱

PDF.js에서 제공하는 Transform 행렬 `[a, b, c, d, e, f]`:

```typescript
// a, d: 스케일 (폰트 크기)
const fontSize = Math.abs(d); // scaleY

// b, c: 회전/기울임
const rotation = Math.atan2(b, a) * (180 / Math.PI);

// e, f: 위치 (x, y)
const x = e;
const y = f; // PDF 좌표계 (좌하단 원점)
```

#### 좌표계 변환

```typescript
// PDF 좌표계 (좌하단 원점) → Canvas 좌표계 (좌상단 원점)
const canvasY = pageHeight - pdfY - fontSize;
```

### 4. 한글/영문 혼합 처리

#### 폰트 Fallback 체인

```typescript
// 한글 폰트 우선 순위
const KOREAN_FALLBACKS = [
  'Noto Sans KR',      // Google Fonts (웹폰트)
  'Pretendard',        // 오픈소스 한글 폰트
  'Malgun Gothic',     // Windows 기본 한글
  'Apple SD Gothic Neo', // macOS 기본 한글
  'sans-serif'         // 시스템 기본
];

// 영문 폰트 우선 순위
const ENGLISH_FALLBACKS = [
  'Roboto',            // Google Fonts
  'Arial',             // 범용 sans-serif
  'Helvetica',         // macOS 기본
  'sans-serif'
];
```

#### CSS font-family 생성

```typescript
// 예시 1: 한글 폰트
buildFontFamilyString(notoSansKR)
// → "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif

// 예시 2: 영문 폰트
buildFontFamilyString(roboto)
// → Roboto, "Noto Sans KR", Arial, sans-serif
```

**주의사항**:
- 공백이 포함된 폰트명은 자동으로 따옴표로 감싸짐
- 한글 폰트에도 영문 fallback을 포함하여 혼합 텍스트 대응
- CSS 우선순위: 앞쪽 폰트부터 순차 적용

## 주요 컴포넌트 및 파일

### 타입 정의
- `types/pdf.types.ts`: PDF 관련 타입 정의

### PDF 처리
- `lib/pdf/font-mapper.ts`: 폰트 매핑 테이블 및 정규화 ⭐
- `lib/pdf/pdf-text-extractor.ts`: PDF.js 텍스트 추출 ⭐
- `lib/pdf/pdf-canvas-renderer.ts`: Fabric.js 렌더링

### Hook
- `hooks/usePDFExtraction.ts`: PDF 처리 Hook

### 컴포넌트
- `components/organisms/PDFCanvasEditor.tsx`: PDF 캔버스 편집기
- `components/templates/PDFEditorLayout.tsx`: PDF 편집 레이아웃

## 코드 예시

### 1. PDF 텍스트 추출

```typescript
import { loadPDF, extractPDFPageData } from '@/lib/pdf/pdf-text-extractor';

// PDF 파일 로드
const pdf = await loadPDF(file);

// 첫 번째 페이지 추출
const page = await pdf.getPage(1);
const pageData = await extractPDFPageData(page, 1, 2.0);

console.log(pageData.textRegions); // 추출된 텍스트 영역
```

### 2. 폰트 매핑

```typescript
import { mapPDFFont, buildFontFamilyString } from '@/lib/pdf/font-mapper';

// PDF 폰트명 매핑
const fontInfo = mapPDFFont('ABCDEF+NotoSansKR-Regular');
/*
{
  originalName: 'ABCDEF+NotoSansKR-Regular',
  cleanName: 'NotoSansKR-Regular',
  webFont: 'Noto Sans KR',
  fallbacks: ['Malgun Gothic', 'Apple SD Gothic Neo', 'sans-serif']
}
*/

// CSS font-family 문자열 생성
const fontFamily = buildFontFamilyString(fontInfo);
// → "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif
```

### 3. Fabric.js 텍스트 객체 생성

```typescript
import { createTextObjectFromPDF } from '@/lib/pdf/pdf-canvas-renderer';

const textObject = createTextObjectFromPDF(pdfTextRegion);

// textObject.fontFamily
// → "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif
```

### 4. Transform 행렬 파싱

```typescript
// PDF TextItem transform: [a, b, c, d, e, f]
const transform = [12, 0, 0, 12, 100, 200];

const { x, y, fontSize, rotation } = parseTransform(transform);
/*
{
  x: 100,           // 위치 X
  y: 200,           // 위치 Y (PDF 좌표계)
  fontSize: 12,     // 폰트 크기
  rotation: 0       // 회전 각도 (도)
}
*/
```

## 폰트 매핑 확장 방법

새로운 폰트를 추가하려면 `lib/pdf/font-mapper.ts` 파일의 `FONT_MAPPING_TABLE`에 추가:

```typescript
export const FONT_MAPPING_TABLE = {
  // 기존 매핑...

  // 새 폰트 추가
  'myfontname': {
    webFont: 'My Custom Font',
    fallbacks: ['Noto Sans KR', 'Arial', 'sans-serif'],
  },
};
```

## 한글/영문 혼합 처리 주의사항

### 1. Fallback 순서

```typescript
// ✅ 올바른 예: 한글 폰트에도 영문 fallback 포함
"Noto Sans KR", "Roboto", "Malgun Gothic", sans-serif

// ❌ 잘못된 예: 영문 fallback 누락
"Noto Sans KR", "Malgun Gothic", sans-serif
// → 영문 텍스트가 의도하지 않은 폰트로 렌더링될 수 있음
```

### 2. 폰트 로딩 확인

```typescript
// 웹폰트 사용 시 @font-face 로딩 필요
// app/layout.tsx 또는 globals.css에 추가

@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR&display=swap');
```

### 3. 시스템 폰트 우선순위

```typescript
// Windows 우선
['Malgun Gothic', 'Noto Sans KR', ...]

// macOS 우선
['Apple SD Gothic Neo', 'Noto Sans KR', ...]

// 범용 (권장)
['Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', ...]
```

## 제약사항 및 알려진 이슈

### PDF.js 제약사항
- **색상 추출 제한**: PDF에서 텍스트 색상 추출은 복잡 (현재는 기본 검정색 사용)
- **복잡한 레이아웃**: 다단 레이아웃이나 표는 텍스트 순서가 섞일 수 있음
- **임베디드 폰트**: PDF에 임베디드된 폰트는 브라우저에서 직접 사용 불가

### 폰트 매핑 한계
- PDF 폰트명과 웹폰트가 1:1 매핑되지 않을 수 있음
- 특수 폰트는 매핑 테이블에 없으면 fallback 사용
- 폰트 스타일(Bold, Italic)은 폰트명에서 추출 시도

### 브라우저 호환성
- PDF.js Worker는 WASM 지원 필요
- 대용량 PDF는 메모리 부족 가능 (페이지별 처리 권장)

## 성능 최적화

### 1. 페이지별 처리
```typescript
// ✅ 권장: 페이지 하나씩 처리
const page = await pdf.getPage(1);

// ❌ 비권장: 전체 페이지 한번에 로드
const allPages = await extractAllPDFPages(pdf);
```

### 2. Scale 조정
```typescript
// 고해상도 (파일 크기 증가)
const pageData = await extractPDFPageData(page, 1, 3.0);

// 표준 해상도 (권장)
const pageData = await extractPDFPageData(page, 1, 2.0);

// 저해상도 (빠름, 품질 저하)
const pageData = await extractPDFPageData(page, 1, 1.0);
```

## 테스트 방법

1. **NotebookLM PDF 업로드**
   - NotebookLM에서 생성한 PDF 파일 업로드
   - 텍스트가 정확히 추출되는지 확인
   - 폰트가 올바르게 매핑되는지 확인

2. **한글/영문 혼합 텍스트**
   - "Hello 안녕하세요" 같은 혼합 텍스트 확인
   - Fallback 폰트가 제대로 적용되는지 확인

3. **스타일 편집**
   - 폰트 크기, 색상, 회전 변경 테스트
   - 텍스트 이동 및 삭제 테스트

4. **내보내기**
   - PNG/JPG 다운로드 확인
   - 클립보드 복사 확인

## 추가 개선 사항 (향후)

- [ ] PDF 텍스트 색상 추출 (복잡한 파싱 필요)
- [ ] 멀티 페이지 지원 (페이지 선택 UI)
- [ ] PDF 임베디드 폰트 추출 및 사용
- [ ] 표(Table) 레이아웃 보존
- [ ] PDF 주석(Annotation) 지원
- [ ] OCR Fallback (텍스트 레이어 없는 PDF 대응)

---

**구현 완료일**: 2026-02-22
**PDF.js 버전**: 3.11.174
