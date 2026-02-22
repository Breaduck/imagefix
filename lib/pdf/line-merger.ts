/**
 * PDF 텍스트 아이템을 줄 단위로 병합
 * "순살처럼 슈루룩" 경험의 핵심 알고리즘
 */

import { PDFTextItem, PDFTextRegion } from '@/types/pdf.types';
import { mapPDFFont, buildFontFamilyString, extractFontStyle } from './font-mapper';

interface ParsedTextItem extends PDFTextItem {
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
  canvasY: number;
}

interface TextLine {
  items: ParsedTextItem[];
  baselineY: number;
  rotation: number;
  avgFontSize: number;
}

/**
 * Transform 행렬 파싱 (pdf-text-extractor.ts와 동일)
 */
function parseTransform(transform: number[]): {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  fontSize: number;
} {
  const [a, b, c, d, e, f] = transform;

  const x = e;
  const y = f;

  const scaleX = Math.sqrt(a * a + b * b);
  const scaleY = Math.sqrt(c * c + d * d);

  const rotation = (Math.atan2(b, a) * 180) / Math.PI;
  const fontSize = Math.abs(scaleY);

  return { x, y, scaleX, scaleY, rotation, fontSize };
}

/**
 * 회전 각도를 버킷으로 그룹핑 (±5도 이내는 같은 그룹)
 */
function groupByRotation(items: ParsedTextItem[], threshold: number = 5): ParsedTextItem[][] {
  const groups: ParsedTextItem[][] = [];

  items.forEach((item) => {
    let found = false;

    for (const group of groups) {
      const groupRotation = group[0].rotation;
      if (Math.abs(item.rotation - groupRotation) <= threshold) {
        group.push(item);
        found = true;
        break;
      }
    }

    if (!found) {
      groups.push([item]);
    }
  });

  console.log(`[LineMerger] Rotation groups: ${groups.length}`);
  return groups;
}

/**
 * 같은 줄인지 판단 (Baseline Y 좌표 기준)
 */
function isSameLine(item1: ParsedTextItem, item2: ParsedTextItem): boolean {
  const avgFontSize = (item1.fontSize + item2.fontSize) / 2;
  const threshold = avgFontSize * 0.3; // 폰트 크기의 30% 이내면 같은 줄

  return Math.abs(item1.canvasY - item2.canvasY) <= threshold;
}

/**
 * Y 좌표로 줄 그룹핑 (클러스터링)
 */
function groupByBaseline(items: ParsedTextItem[]): TextLine[] {
  if (items.length === 0) return [];

  // Y 좌표로 정렬
  const sorted = [...items].sort((a, b) => a.canvasY - b.canvasY);

  const lines: TextLine[] = [];
  let currentLine: ParsedTextItem[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (isSameLine(sorted[i - 1], sorted[i])) {
      currentLine.push(sorted[i]);
    } else {
      // 새 줄 시작
      const avgFontSize = currentLine.reduce((sum, item) => sum + item.fontSize, 0) / currentLine.length;
      const baselineY = currentLine.reduce((sum, item) => sum + item.canvasY, 0) / currentLine.length;
      const rotation = currentLine[0].rotation;

      lines.push({
        items: currentLine,
        baselineY,
        rotation,
        avgFontSize,
      });

      currentLine = [sorted[i]];
    }
  }

  // 마지막 줄 추가
  if (currentLine.length > 0) {
    const avgFontSize = currentLine.reduce((sum, item) => sum + item.fontSize, 0) / currentLine.length;
    const baselineY = currentLine.reduce((sum, item) => sum + item.canvasY, 0) / currentLine.length;
    const rotation = currentLine[0].rotation;

    lines.push({
      items: currentLine,
      baselineY,
      rotation,
      avgFontSize,
    });
  }

  console.log(`[LineMerger] Baseline groups: ${lines.length} lines from ${items.length} items`);
  return lines;
}

/**
 * 한글/영문 감지
 */
function hasKorean(text: string): boolean {
  return /[가-힣]/.test(text);
}

function hasEnglish(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

function isNumber(text: string): boolean {
  return /^\d+$/.test(text.trim());
}

function isPunctuation(text: string): boolean {
  return /^[.,!?;:'"()\[\]{}\-–—…]+$/.test(text.trim());
}

/**
 * 두 텍스트 아이템 사이에 공백을 삽입해야 하는지 판단
 */
function shouldInsertSpace(
  leftItem: ParsedTextItem,
  rightItem: ParsedTextItem,
  gap: number,
  avgFontSize: number
): boolean {
  const leftText = leftItem.str.trim();
  const rightText = rightItem.str.trim();

  // 원본에 이미 공백이 있으면 존중
  if (leftItem.str.endsWith(' ') || rightItem.str.startsWith(' ')) {
    return true;
  }

  // Gap이 너무 크면 무조건 공백
  const largeGapThreshold = avgFontSize * 0.5;
  if (gap > largeGapThreshold) {
    return true;
  }

  // 영문-영문, 숫자-숫자는 gap이 작아도 공백 필요
  if ((hasEnglish(leftText) && hasEnglish(rightText)) || (isNumber(leftText) && isNumber(rightText))) {
    const smallGapThreshold = avgFontSize * 0.2;
    return gap > smallGapThreshold;
  }

  // 한글-한글은 gap이 크지 않으면 공백 없이 붙임
  if (hasKorean(leftText) && hasKorean(rightText)) {
    const koreanGapThreshold = avgFontSize * 0.4;
    return gap > koreanGapThreshold;
  }

  // 문장부호 앞뒤는 gap 기준으로만 판단
  if (isPunctuation(leftText) || isPunctuation(rightText)) {
    const punctuationThreshold = avgFontSize * 0.3;
    return gap > punctuationThreshold;
  }

  // 기본: 중간 정도 gap
  const defaultThreshold = avgFontSize * 0.35;
  return gap > defaultThreshold;
}

/**
 * 줄 내의 아이템들을 X 좌표로 정렬하고 텍스트 병합
 */
function mergeLineItems(line: TextLine): string {
  // X 좌표로 정렬
  const sorted = [...line.items].sort((a, b) => a.x - b.x);

  let mergedText = sorted[0].str;

  for (let i = 1; i < sorted.length; i++) {
    const prevItem = sorted[i - 1];
    const currItem = sorted[i];

    // 아이템 간 gap 계산
    const gap = currItem.x - (prevItem.x + prevItem.width);

    // 공백 삽입 여부 판단
    if (shouldInsertSpace(prevItem, currItem, gap, line.avgFontSize)) {
      mergedText += ' ';
    }

    mergedText += currItem.str;
  }

  return mergedText.trim();
}

/**
 * 줄의 Bounding Box 계산
 */
function calculateLineBBox(line: TextLine): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const sorted = [...line.items].sort((a, b) => a.x - b.x);

  const x = sorted[0].x;
  const y = Math.min(...line.items.map((item) => item.canvasY));
  const maxX = Math.max(...line.items.map((item) => item.x + item.width));
  const maxY = Math.max(...line.items.map((item) => item.canvasY + item.fontSize));

  return {
    x,
    y,
    width: maxX - x,
    height: maxY - y,
  };
}

/**
 * 메인 함수: PDF TextItem들을 줄 단위로 병합
 */
export function mergePDFTextItems(
  items: PDFTextItem[],
  pageHeight: number
): PDFTextRegion[] {
  console.log('[LineMerger] Starting merge:', items.length, 'items');

  // 1. 빈 아이템 필터링 및 파싱
  const parsed: ParsedTextItem[] = items
    .filter((item) => item.str.trim().length > 0)
    .map((item) => {
      const { x, y, fontSize, rotation } = parseTransform(item.transform);
      const canvasY = pageHeight - y;

      return {
        ...item,
        x,
        y,
        fontSize,
        rotation,
        canvasY: canvasY - fontSize, // 베이스라인 보정
      };
    });

  console.log('[LineMerger] Parsed items:', parsed.length);

  // 2. 회전 각도별 그룹핑
  const rotationGroups = groupByRotation(parsed);

  // 3. 각 회전 그룹 내에서 줄 단위로 병합
  const allLines: TextLine[] = [];

  rotationGroups.forEach((group) => {
    const lines = groupByBaseline(group);
    allLines.push(...lines);
  });

  console.log('[LineMerger] Total lines after grouping:', allLines.length);

  // 4. 각 줄을 PDFTextRegion으로 변환
  const regions: PDFTextRegion[] = allLines.map((line, index) => {
    const mergedText = mergeLineItems(line);
    const bbox = calculateLineBBox(line);

    // 대표 아이템 (첫 번째)
    const representativeItem = line.items[0];

    // 폰트 정보 추출
    const fontInfo = mapPDFFont(representativeItem.fontName);
    const { weight, style } = extractFontStyle(representativeItem.fontName);

    return {
      id: `pdf-line-${index}-${Date.now()}`,
      text: mergedText,
      position: {
        x: bbox.x,
        y: bbox.y,
      },
      size: {
        width: bbox.width,
        height: bbox.height,
      },
      style: {
        fontSize: line.avgFontSize,
        fontFamily: fontInfo.webFont,
        fontFallbacks: fontInfo.fallbacks,
        color: '#000000',
        rotation: line.rotation,
        transform: representativeItem.transform,
      },
      fontInfo,
    };
  });

  console.log('[LineMerger] ✅ Merge complete:', {
    originalItems: items.length,
    filteredItems: parsed.length,
    finalLines: regions.length,
    compressionRatio: `${((1 - regions.length / parsed.length) * 100).toFixed(1)}%`,
  });

  // 샘플 출력
  if (regions.length > 0) {
    console.log('[LineMerger] Sample merged lines:', regions.slice(0, 3).map((r) => ({
      text: r.text.substring(0, 50),
      itemsInLine: allLines.find((_, i) => i < 3)?.items.length,
    })));
  }

  return regions;
}
