# Tesseract OCR 언어 데이터

이 디렉토리에 Tesseract 언어 모델 파일을 다운로드하세요.

## 다운로드 방법

### 한글 (Korean)
```bash
curl -L https://github.com/tesseract-ocr/tessdata/raw/main/kor.traineddata -o kor.traineddata
```

### 영어 (English)
```bash
curl -L https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata -o eng.traineddata
```

또는 수동으로 다운로드:
1. https://github.com/tesseract-ocr/tessdata 방문
2. `kor.traineddata` 파일 다운로드
3. `eng.traineddata` 파일 다운로드
4. 이 디렉토리(`public/tessdata/`)에 파일 저장

## 필요한 파일

- ✅ kor.traineddata (한글 인식용)
- ✅ eng.traineddata (영어 인식용)

## 참고

- Tesseract.js는 브라우저에서 자동으로 언어 파일을 다운로드할 수도 있지만, 로컬 파일을 사용하면 더 빠르고 안정적입니다.
- 파일 크기: 각 약 10-15MB
