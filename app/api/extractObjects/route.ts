/**
 * Object Extraction API Route
 *
 * Modal SAM2를 사용해 이미지에서 객체 레이어만 추출합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectLayer } from '@/types/canvas.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Call Modal SAM2 to extract object layers
 */
async function extractObjectLayers(
  imagePngDataUrl: string,
  textMaskBoxes: Array<{ x: number; y: number; width: number; height: number }>,
  opts?: Record<string, any>
): Promise<{ objectLayers: ObjectLayer[]; reason?: string; code?: string; retryAfterMs?: number }> {
  const SEGMENTER_URL = process.env.SEGMENTER_URL;
  const SEGMENTER_TOKEN = process.env.SEGMENTER_TOKEN;

  if (!SEGMENTER_URL) {
    console.log('[ExtractObjects] SEGMENTER_URL not configured');
    return { objectLayers: [], reason: 'SEGMENTER_NOT_CONFIGURED' };
  }

  try {
    // Step 1: Check health with 1.5s timeout
    console.log('[ExtractObjects] Checking segmenter health...');
    const healthController = new AbortController();
    const healthTimeoutId = setTimeout(() => healthController.abort(), 1500);

    const healthResponse = await fetch(`${SEGMENTER_URL}/health`, {
      method: 'GET',
      signal: healthController.signal,
    });

    clearTimeout(healthTimeoutId);

    if (!healthResponse.ok) {
      console.error('[ExtractObjects] Health check failed:', healthResponse.status);
      return { objectLayers: [], reason: 'WARMING_UP', code: 'WARMING_UP', retryAfterMs: 30000 };
    }

    const healthData = await healthResponse.json();
    console.log('[ExtractObjects] Health check:', healthData);

    // If model not loaded, return WARMING_UP immediately
    if (!healthData.modelLoaded) {
      console.log('[ExtractObjects] Model not loaded, returning WARMING_UP');
      return {
        objectLayers: [],
        reason: 'WARMING_UP',
        code: 'WARMING_UP',
        retryAfterMs: 30000,
      };
    }

    // Step 2: Call extract with 20s timeout
    console.log('[ExtractObjects] Calling segmenter extract...');
    console.log('[ExtractObjects] textMaskBoxes count:', textMaskBoxes.length);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (SEGMENTER_TOKEN) {
      headers['Authorization'] = `Bearer ${SEGMENTER_TOKEN}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(`${SEGMENTER_URL}/extract`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imagePngBase64: imagePngDataUrl,
        textMaskBoxes,
        opts,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[ExtractObjects] Segmenter returned error:', response.status);
      return {
        objectLayers: [],
        reason: 'WARMING_UP',
        code: 'WARMING_UP',
        retryAfterMs: 15000,
      };
    }

    const data = await response.json();

    // Validate response
    if (!Array.isArray(data.objectLayers)) {
      console.error('[ExtractObjects] Invalid segmenter response');
      return {
        objectLayers: [],
        reason: 'WARMING_UP',
        code: 'WARMING_UP',
        retryAfterMs: 15000,
      };
    }

    console.log('[ExtractObjects] Segmenter returned', data.objectLayers.length, 'objects');
    return { objectLayers: data.objectLayers };

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[ExtractObjects] Segmenter timeout, returning WARMING_UP');
      return {
        objectLayers: [],
        reason: 'WARMING_UP',
        code: 'WARMING_UP',
        retryAfterMs: 15000,
      };
    }
    console.error('[ExtractObjects] Segmenter call failed:', error);
    return {
      objectLayers: [],
      reason: 'WARMING_UP',
      code: 'WARMING_UP',
      retryAfterMs: 15000,
    };
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[ExtractObjects] Starting object extraction');

    const body = await request.json();
    const { imagePngDataUrl, textMaskBoxes = [], imageWidth, imageHeight } = body;

    if (!imagePngDataUrl) {
      return NextResponse.json(
        { error: 'imagePngDataUrl is required' },
        { status: 400 }
      );
    }

    console.log('[ExtractObjects] Image dataURL length:', imagePngDataUrl.length);
    console.log('[ExtractObjects] Image dimensions:', imageWidth, 'x', imageHeight);
    console.log('[ExtractObjects] Text mask boxes:', textMaskBoxes.length);

    const { objectLayers, reason, code, retryAfterMs } = await extractObjectLayers(
      imagePngDataUrl,
      textMaskBoxes,
      {
        minAreaRatio: 0.005,
        maxAreaRatio: 0.8,
        iouThreshold: 0.7,
      }
    );

    const processingTimeMs = Date.now() - startTime;

    console.log('[ExtractObjects] ✅ Extraction complete:', {
      objectCount: objectLayers.length,
      timeMs: processingTimeMs,
      reason: reason || 'success',
      code: code || 'none',
    });

    return NextResponse.json({
      objectLayers,
      stats: {
        objectCount: objectLayers.length,
        processingTimeMs,
        ...(reason && { reason }),
        ...(code && { code }),
        ...(retryAfterMs && { retryAfterMs }),
      },
    });

  } catch (error) {
    console.error('[ExtractObjects] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Object extraction failed',
      },
      { status: 500 }
    );
  }
}
