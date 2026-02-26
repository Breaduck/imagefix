/**
 * Layer Extraction API Route
 *
 * 슬라이드 이미지에서 텍스트 레이어와 비텍스트 객체 레이어를 추출합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { TextRegion, ObjectLayer, LayerExtractionResult } from '@/types/canvas.types';
import { convertOCRResultsToTextRegions, filterByConfidence, sortTextRegions } from '@/lib/ocr/text-detector';
import { createOCRProvider } from '@/lib/ocr/providers';

/**
 * Call external segmentation server to extract object layers
 */
async function extractObjectLayers(
  imagePngDataUrl: string,
  textMaskBoxes: Array<{ x: number; y: number; width: number; height: number }>,
  opts?: Record<string, any>
): Promise<{ objectLayers: ObjectLayer[]; reason?: string }> {
  const SEGMENTER_URL = process.env.SEGMENTER_URL;
  const SEGMENTER_TOKEN = process.env.SEGMENTER_TOKEN;

  if (!SEGMENTER_URL) {
    console.log('[ExtractLayers] SEGMENTER_URL not configured');
    return { objectLayers: [], reason: 'SEGMENTER_NOT_CONFIGURED' };
  }

  try {
    console.log('[ExtractLayers] Calling segmenter at:', SEGMENTER_URL);
    console.log('[ExtractLayers] textMaskBoxes count:', textMaskBoxes.length);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (SEGMENTER_TOKEN) {
      headers['Authorization'] = `Bearer ${SEGMENTER_TOKEN}`;
    }

    const response = await fetch(`${SEGMENTER_URL}/extract`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imagePngDataUrl,
        textMaskBoxes,
        opts,
      }),
    });

    if (!response.ok) {
      console.error('[ExtractLayers] Segmenter returned error:', response.status);
      return { objectLayers: [], reason: 'SEGMENTER_BAD_RESPONSE' };
    }

    const data = await response.json();

    // Validate response shape
    if (!Array.isArray(data.objectLayers)) {
      console.error('[ExtractLayers] Invalid segmenter response shape');
      return { objectLayers: [], reason: 'SEGMENTER_BAD_RESPONSE' };
    }

    console.log('[ExtractLayers] Segmenter returned', data.objectLayers.length, 'objects');
    return { objectLayers: data.objectLayers };

  } catch (error) {
    console.error('[ExtractLayers] Segmenter call failed:', error);
    return { objectLayers: [], reason: 'SEGMENTER_BAD_RESPONSE' };
  }
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

    // Step 2: 객체 레이어 추출 (segmenter 사용 또는 빈 배열)
    console.log('[ExtractLayers] Step 2: Extracting object layers');

    // textMaskBoxes 생성 (text regions를 bbox로 변환)
    const textMaskBoxes = textLayers.map((region) => ({
      x: region.position.x,
      y: region.position.y,
      width: region.size.width,
      height: region.size.height,
    }));

    const { objectLayers, reason } = await extractObjectLayers(
      slidePngDataUrl,
      textMaskBoxes
    );

    console.log(`[ExtractLayers] Extracted ${objectLayers.length} object layers`);
    if (reason) {
      console.log(`[ExtractLayers] Reason: ${reason}`);
    }

    // Step 3: 응답 생성
    const processingTimeMs = Date.now() - startTime;

    const result: LayerExtractionResult = {
      textLayers,
      objectLayers,
      stats: {
        textCount: textLayers.length,
        objectCount: objectLayers.length,
        processingTimeMs,
        ...(reason && { reason }),
      } as any,
    };

    console.log('[ExtractLayers] ✅ Extraction complete:', {
      textCount: result.stats.textCount,
      objectCount: result.stats.objectCount,
      timeMs: processingTimeMs,
      reason: reason || 'none',
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
