/**
 * Text Extraction API Route
 *
 * OCR을 사용해 슬라이드 이미지에서 텍스트 레이어만 추출합니다.
 * 객체 레이어는 /api/extractObjects를 별도로 호출하세요.
 */

import { NextRequest, NextResponse } from 'next/server';
import { TextRegion } from '@/types/canvas.types';
import { convertOCRResultsToTextRegions, filterByConfidence, sortTextRegions } from '@/lib/ocr/text-detector';
import { createOCRProvider } from '@/lib/ocr/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

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

    if (!imageWidth || !imageHeight) {
      return NextResponse.json(
        { error: 'imageWidth and imageHeight are required' },
        { status: 400 }
      );
    }

    console.log('[ExtractLayers] Image dataURL length:', slidePngDataUrl.length);
    console.log('[ExtractLayers] Image dimensions:', imageWidth, 'x', imageHeight);

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
      imageWidth,
      imageHeight
    );

    // 신뢰도 필터링 (15% 이상)
    textLayers = filterByConfidence(textLayers, 15);

    // 정렬
    textLayers = sortTextRegions(textLayers);

    console.log(`[ExtractLayers] After filtering: ${textLayers.length} text layers`);

    // textMaskBoxes 생성 (text regions를 bbox로 변환 - 객체 추출시 사용)
    const textMaskBoxes = textLayers.map((region) => ({
      x: region.position.x,
      y: region.position.y,
      width: region.size.width,
      height: region.size.height,
    }));

    const processingTimeMs = Date.now() - startTime;

    console.log('[ExtractLayers] ✅ Text extraction complete:', {
      textCount: textLayers.length,
      timeMs: processingTimeMs,
    });

    return NextResponse.json({
      textLayers,
      textMaskBoxes, // 클라이언트가 객체 추출에 사용
      stats: {
        textCount: textLayers.length,
        processingTimeMs,
      },
    });

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
