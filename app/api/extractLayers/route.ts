/**
 * Layer Extraction API Route
 *
 * 슬라이드 이미지에서 텍스트 레이어와 비텍스트 객체 레이어를 추출합니다.
 *
 * MVP: OCR로 텍스트 추출, Mock으로 객체 레이어 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import { TextRegion, ObjectLayer, LayerExtractionResult } from '@/types/canvas.types';
import { convertOCRResultsToTextRegions, filterByConfidence, sortTextRegions } from '@/lib/ocr/text-detector';
import { createOCRProvider } from '@/lib/ocr/providers';

/**
 * Mock: 이미지에서 랜덤 bbox를 crop하여 ObjectLayer 생성
 */
async function generateMockObjectLayers(
  imagePngDataUrl: string,
  imageWidth: number,
  imageHeight: number,
  count: number = 3
): Promise<ObjectLayer[]> {
  console.log('[MockObjects] Generating', count, 'mock object layers');

  const objectLayers: ObjectLayer[] = [];

  // Canvas로 이미지 로드 (Node.js 환경에서는 canvas 라이브러리 필요, 브라우저에서는 Image)
  // MVP: 단순 bbox만 반환 (실제 crop은 클라이언트에서)

  // 랜덤하게 2-3개 영역 생성
  for (let i = 0; i < count; i++) {
    // 랜덤 위치 및 크기
    const width = Math.floor(imageWidth * (0.15 + Math.random() * 0.25)); // 15-40% width
    const height = Math.floor(imageHeight * (0.15 + Math.random() * 0.25)); // 15-40% height
    const x = Math.floor(Math.random() * (imageWidth - width));
    const y = Math.floor(Math.random() * (imageHeight - height));

    console.log(`[MockObjects] Object ${i}: x=${x}, y=${y}, w=${width}, h=${height}`);

    // 실제 crop은 클라이언트에서 수행하도록 원본 이미지 URL을 metadata로 포함
    // MVP: 단순 placeholder 이미지 사용
    const placeholderDataUrl = await createPlaceholderImage(width, height, i);

    objectLayers.push({
      id: `object-${i}-${Date.now()}`,
      pngDataUrl: placeholderDataUrl,
      x,
      y,
      width,
      height,
    });
  }

  return objectLayers;
}

/**
 * Placeholder 이미지 생성 (실제 crop 대신 사용)
 */
async function createPlaceholderImage(width: number, height: number, index: number): Promise<string> {
  // SVG placeholder 생성 (간단한 색상 박스)
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
  const color = colors[index % colors.length];

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}" opacity="0.6"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="Arial" font-size="24" fill="white" font-weight="bold">
        Object ${index + 1}
      </text>
    </svg>
  `.trim();

  // SVG를 dataURL로 변환
  const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  return svgDataUrl;
}

/**
 * 이미지 메타데이터 추출 (width, height)
 */
function extractImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // Data URL에서 이미지 크기 추출
    // Base64 디코딩 후 PNG 헤더 파싱 필요
    // MVP: 클라이언트가 width/height를 함께 보내도록 수정 필요

    // 임시: 기본값 반환
    console.warn('[ExtractLayers] Image dimensions not provided, using defaults');
    resolve({ width: 1920, height: 1080 });
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[ExtractLayers] Starting layer extraction');

    // 요청 본문 파싱
    const body = await request.json();
    const { slidePngDataUrl, imageWidth, imageHeight, provider = 'tesseract' } = body;

    if (!slidePngDataUrl) {
      return NextResponse.json(
        { error: 'slidePngDataUrl is required' },
        { status: 400 }
      );
    }

    console.log('[ExtractLayers] Image dataURL length:', slidePngDataUrl.length);
    console.log('[ExtractLayers] Image dimensions:', imageWidth, 'x', imageHeight);

    // 이미지 크기 확인
    const dimensions = imageWidth && imageHeight
      ? { width: imageWidth, height: imageHeight }
      : await extractImageDimensions(slidePngDataUrl);

    // Step 1: OCR로 텍스트 추출
    console.log('[ExtractLayers] Step 1: Running OCR with provider:', provider);
    const ocrProvider = createOCRProvider(provider);

    const ocrResults = await ocrProvider.recognize(slidePngDataUrl, {
      onProgress: (progress) => {
        // 진행률은 클라이언트에서 별도로 추적
        if (progress % 0.25 === 0) {
          console.log(`[ExtractLayers] OCR progress: ${(progress * 100).toFixed(0)}%`);
        }
      },
    });

    console.log(`[ExtractLayers] OCR complete: ${ocrResults.length} text regions found`);

    // OCR 결과를 TextRegion으로 변환
    let textLayers = convertOCRResultsToTextRegions(
      ocrResults,
      dimensions.width,
      dimensions.height
    );

    // 신뢰도 필터링 (15% 이상)
    textLayers = filterByConfidence(textLayers, 15);

    // 정렬
    textLayers = sortTextRegions(textLayers);

    console.log(`[ExtractLayers] After filtering: ${textLayers.length} text layers`);

    // Step 2: Mock 객체 레이어 생성
    console.log('[ExtractLayers] Step 2: Generating mock object layers');
    const objectLayers = await generateMockObjectLayers(
      slidePngDataUrl,
      dimensions.width,
      dimensions.height,
      3 // MVP: 3개 객체 생성
    );

    console.log(`[ExtractLayers] Generated ${objectLayers.length} object layers`);

    // Step 3: 응답 생성
    const processingTimeMs = Date.now() - startTime;

    const result: LayerExtractionResult = {
      textLayers,
      objectLayers,
      stats: {
        textCount: textLayers.length,
        objectCount: objectLayers.length,
        processingTimeMs,
      },
    };

    console.log('[ExtractLayers] ✅ Extraction complete:', {
      textCount: result.stats.textCount,
      objectCount: result.stats.objectCount,
      timeMs: processingTimeMs,
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[ExtractLayers] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Layer extraction failed',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
