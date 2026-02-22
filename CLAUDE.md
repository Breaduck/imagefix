# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Required Setup (First-time only)
1. Install dependencies: `npm install`
2. Download Tesseract language data to `public/tessdata/`:
   - `kor.traineddata` (Korean): https://github.com/tesseract-ocr/tessdata/raw/main/kor.traineddata
   - `eng.traineddata` (English): https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata
3. (Optional) Download Pretendard fonts to `public/fonts/` from https://github.com/orioncactus/pretendard/releases

## Architecture Overview

### Dual Processing Pipeline
The application supports two distinct text extraction modes:

**Image Mode (OCR)**
- Uses Tesseract.js for optical character recognition
- Supports Korean + English text
- Extracts text from PNG/JPG/screenshot images
- Flow: `ImageUploader` → `useTextExtraction` → `useOCR` → `CanvasEditor`

**PDF Mode (Text Layer Extraction)**
- Uses PDF.js to extract embedded text layers
- Preserves original font information with font mapping
- Much faster than OCR, no accuracy loss
- Flow: `ImageUploader` → `usePDFExtraction` → `pdf-text-extractor.ts` → `PDFEditorLayout`

### 3-Layer Canvas System (Fabric.js)
The canvas uses a strict z-index layering system:

```
Layer 2 (Top):    Editable text objects (fabric.Text)
Layer 1 (Middle): Background masks (fabric.Rect) - cover original text
Layer 0 (Bottom): Background image (fabric.Image) - original PDF/image
```

This layering is managed by `lib/canvas/layer-manager.ts` with constants:
- `LayerIndex.BACKGROUND_IMAGE = 0`
- `LayerIndex.BACKGROUND_MASKS = 1`
- `LayerIndex.EDITABLE_TEXT = 2`

### Font Mapping System (PDF only)
PDFs embed fonts with subset prefixes (e.g., `ABCDEF+NotoSansKR-Regular`). The font mapping pipeline:

1. **Prefix Removal** (`lib/pdf/font-mapper.ts::removeSubsetPrefix`) - strips `ABCDEF+` prefix
2. **Font Lookup** - matches cleaned font name to web font via `FONT_MAPPING_TABLE`
3. **Fallback Chain** - builds CSS font-family string with Korean/English fallbacks
4. **Style Extraction** - detects bold/italic variants from font name

Example: `ABCDEF+NotoSansKR-Bold` → `Noto Sans KR` with weight 700 + fallbacks `['Malgun Gothic', 'Apple SD Gothic Neo', 'sans-serif']`

### Transform Matrix Parsing (PDF only)
PDF text positions use transform matrices `[a, b, c, d, e, f]`. The parser (`lib/pdf/pdf-text-extractor.ts::parseTransform`):
- `e, f` = x, y position
- `sqrt(a² + b²)` = x-scale (font width)
- `sqrt(c² + d²)` = y-scale (font size)
- `atan2(b, a)` = rotation angle

PDF coordinates are bottom-left origin; converted to canvas top-left: `canvasY = pageHeight - pdfY`

### Component Hierarchy
```
app/page.tsx (Main controller)
  ├─ ImageUploader (stage: upload)
  ├─ LoadingSpinner (stage: processing)
  └─ EditorLayout/PDFEditorLayout (stage: editing)
       ├─ ToolPanel (export, reset buttons)
       ├─ TextSidebar (left: text region list)
       ├─ CanvasEditor (center: Fabric.js canvas)
       └─ TextStyleControls (right: style editor)
```

### State Management Pattern
Uses React hooks with callback refs for canvas initialization:

```typescript
// EditorLayout maintains canvas reference
const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
const canvasRefCallback = useCallback((fabricCanvas: fabric.Canvas | null) => {
  setCanvas(fabricCanvas);
}, []);

// CanvasEditor initializes and returns canvas via callback
<CanvasEditor onCanvasReady={canvasRefCallback} />
```

This prevents React re-render issues with Fabric.js canvas elements.

### Dynamic Imports (Critical)
PDF.js and Fabric.js must be loaded dynamically to avoid SSR errors:

```typescript
// CORRECT - dynamic import in client component
let pdfjsLib: typeof import('pdfjs-dist') | null = null;
async function getPDFJS() {
  if (!pdfjsLib && typeof window !== 'undefined') {
    pdfjsLib = await import('pdfjs-dist');
  }
  return pdfjsLib;
}

// WRONG - static import causes build errors
import * as pdfjsLib from 'pdfjs-dist'; // ❌ Module not found: 'canvas'
```

### Key-based Remounting (Critical)
To prevent DOM errors when switching files, EditorLayout components use `key` prop:

```typescript
// Forces React to unmount/remount on new file
<EditorLayout key={imageData.dataUrl} {...props} />
<PDFEditorLayout key={pageData.imageUrl} {...props} />
```

This clears stale Fabric.js canvas references.

## Configuration Notes

### next.config.js
- **reactStrictMode: false** - Disabled to prevent double canvas initialization
- **webpack externals** - Excludes Node-only modules (canvas, jsdom) from build
- **turbopack: {}** - Enables Next.js 16+ Turbopack bundler

### TypeScript Paths
- `@/` maps to project root for absolute imports

## Common Issues

### "Module not found: Can't resolve 'canvas'"
PDF.js tries to load Node canvas module during SSR. Fix: Ensure PDF.js is dynamically imported only on client side (see Dynamic Imports section).

### Canvas stuck at "초기화 중..." (initializing)
Usually caused by React Strict Mode double-rendering. Verify `reactStrictMode: false` in next.config.js.

### "insertBefore on 'Node'" DOM error
Stale Fabric.js references between renders. Ensure EditorLayout components use unique `key` prop that changes on new uploads.

### OCR accuracy issues
Tesseract accuracy depends on image quality. Preprocessing (contrast adjustment, noise removal) may help but is not currently implemented.

## Data Flow Examples

### Image Upload (OCR)
1. User drops image → `DropZone` → `handleFileSelect(file)`
2. `uploadImage(file)` converts to base64 dataURL + dimensions
3. `extractText(dataUrl, width, height)` spawns Tesseract worker
4. OCR returns `TextRegion[]` with bounding boxes, text, confidence
5. `color-extractor.ts` samples pixels to extract dominant text color
6. `size-calculator.ts` derives font size from bbox height
7. `rotation-detector.ts` uses Tesseract orientation data
8. `CanvasEditor` renders 3 layers: image → masks → text objects

### PDF Upload (Text Layer)
1. User drops PDF → `handleFileSelect(file)`
2. `extractFromPDF(file, pageNumber)` loads PDF.js
3. `renderPDFPage(page, scale)` renders to canvas element
4. `extractTextContent(page)` gets text items + font styles
5. `convertPDFTextItemsToRegions()` parses transforms, maps fonts
6. `font-mapper.ts` removes subset prefix, builds fallback chain
7. `PDFEditorLayout` renders with actual PDF fonts

## File Organization Rationale

- **atoms/** - Stateless UI primitives (Button, LoadingSpinner)
- **molecules/** - Composable UI with internal state (DropZone, TextStyleControls)
- **organisms/** - Complex business logic components (CanvasEditor, ImageUploader)
- **templates/** - Page-level layouts (EditorLayout, PDFEditorLayout)
- **lib/** - Pure utility functions, no React dependencies
- **hooks/** - React hooks for state/effects, may use lib utilities
- **types/** - Shared TypeScript interfaces across layers
