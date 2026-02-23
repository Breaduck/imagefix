/**
 * CLOVA OCR API Route Handler
 *
 * Environment variables required:
 * - CLOVA_OCR_ENDPOINT: CLOVA OCR API endpoint URL
 * - CLOVA_OCR_SECRET: CLOVA OCR API secret key
 */

import { NextRequest, NextResponse } from 'next/server';
import { OCRResult, BoundingBox } from '@/types/ocr.types';

interface ClovaField {
  inferText: string;
  inferConfidence: number;
  boundingPoly: {
    vertices: Array<{ x: number; y: number }>;
  };
}

interface ClovaResponse {
  images: Array<{
    fields: ClovaField[];
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const endpoint = process.env.CLOVA_OCR_ENDPOINT;
    const secret = process.env.CLOVA_OCR_SECRET;

    if (!endpoint || !secret) {
      console.error('[CLOVA] Missing environment variables');
      return NextResponse.json(
        { error: 'CLOVA OCR not configured. Set CLOVA_OCR_ENDPOINT and CLOVA_OCR_SECRET.' },
        { status: 500 }
      );
    }

    // Get uploaded image
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    console.log(`[CLOVA] Processing image: ${imageFile.name}, size: ${imageFile.size} bytes`);

    // Convert to buffer
    const buffer = Buffer.from(await imageFile.arrayBuffer());

    // Call CLOVA API
    const clovaResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-OCR-SECRET': secret,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });

    if (!clovaResponse.ok) {
      const errorText = await clovaResponse.text();
      console.error('[CLOVA] API error:', errorText);
      return NextResponse.json(
        { error: `CLOVA API error: ${clovaResponse.status} ${errorText}` },
        { status: clovaResponse.status }
      );
    }

    const clovaData: ClovaResponse = await clovaResponse.json();
    console.log(`[CLOVA] Received ${clovaData.images?.[0]?.fields?.length || 0} fields`);

    // Convert CLOVA format to OCRResult format
    const results: OCRResult[] = (clovaData.images?.[0]?.fields || []).map((field) => {
      const vertices = field.boundingPoly.vertices;

      // Calculate bounding box from vertices
      const xs = vertices.map((v) => v.x);
      const ys = vertices.map((v) => v.y);
      const bbox: BoundingBox = {
        x0: Math.min(...xs),
        y0: Math.min(...ys),
        x1: Math.max(...xs),
        y1: Math.max(...ys),
      };

      return {
        text: field.inferText,
        confidence: field.inferConfidence * 100, // Convert to 0-100 scale
        bbox,
        baseline: {
          x0: bbox.x0,
          y0: bbox.y1,
          x1: bbox.x1,
          y1: bbox.y1,
          hasDropCap: false,
        },
        words: [], // CLOVA doesn't provide word-level segmentation
      };
    });

    console.log(`[CLOVA] Converted to ${results.length} OCR results`);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[CLOVA] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
