# DOM Import Feature

## Overview

The DOM Import feature allows you to export NotebookLM slides as **100% accurate, fully editable text layers** without using OCR or PDF parsing. This track produces clean backgrounds with zero text overlap.

## How It Works

### 1. Chrome Extension Export

The NotebookLM Chrome extension extracts text directly from the DOM:

1. **Find Slide Container**: Locates the main slide canvas element
2. **Extract Text Nodes**: Collects all text elements with their computed styles (font, color, size, position)
3. **Merge into Lines**: Groups text elements into line-level layers
4. **Clean Screenshot**: Temporarily hides all text, captures background, then restores text
5. **Export Artifacts**:
   - `page.png` - Clean background image (all text hidden)
   - `layers.json` - Line-level text layers with exact positions and styles

### 2. Webapp Import

The webapp imports the PNG + JSON files:

1. **Validate Schema**: Checks JSON format and version
2. **Calculate Scaling**: If PNG dimensions differ from JSON slide dimensions, calculates scale factors
3. **Convert to TextRegions**: Transforms DOMLayer format to internal TextRegion format
4. **Render Canvas**:
   - Background: PNG image (no text)
   - Text Layers: Fabric.js IText objects (100% editable)

## User Flow

### Step 1: Install Extension

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `/extension` folder from this repo

### Step 2: Export Slide

1. Open NotebookLM presentation in Chrome
2. Navigate to the slide you want to edit
3. Click the extension icon
4. Click "Export Current Slide"
5. Two files will be downloaded:
   - `notebooklm-slide-[timestamp].png`
   - `notebooklm-layers-[timestamp].json`

### Step 3: Import to Webapp

1. Open the ImageFix webapp
2. Select "DOM Import (PNG + JSON)" mode
3. Upload both files (drag & drop or select individually)
4. Canvas will render with:
   - Clean background (zero original text)
   - Fully editable text layers (Korean + English)

### Step 4: Edit & Export

1. Click any text to select
2. Double-click to edit text content
3. Use controls to adjust:
   - Font size
   - Color
   - Rotation
   - Font family
   - Font weight/style
4. Export as PNG/JPG or copy to clipboard

## Technical Details

### JSON Schema

```typescript
interface DOMImportData {
  version: number;
  source: {
    url: string;
    title: string;
    dpr: number;        // Device pixel ratio
    slideW: number;     // Slide width (logical pixels)
    slideH: number;     // Slide height (logical pixels)
    createdAt: string;
  };
  layers: DOMLayer[];
}

interface DOMLayer {
  id: string;
  type: 'text-line';
  text: string;
  bbox: {
    x: number;  // Slide-local coordinates
    y: number;
    w: number;
    h: number;
  };
  style: {
    fontFamily: string;
    fontSizePx: number;
    fontWeight: string;
    fontStyle: string;
    colorRgba: string;
    letterSpacingPx: number;
    lineHeightPx: number;
    textAlign: string;
  };
  rotationDeg: number;
}
```

### Coordinate Mapping

The extension exports coordinates in slide-local space. The webapp handles scaling:

```typescript
const scaleX = pngWidth / source.slideW;
const scaleY = pngHeight / source.slideH;

// Apply to all coordinates
position.x *= scaleX;
position.y *= scaleY;
fontSize *= scaleY;
```

### Font Mapping

The webapp uses fallback font stacks to ensure Korean/English text displays correctly:

```
Pretendard, Noto Sans KR, Inter, [extracted font], sans-serif
```

## Advantages vs OCR Track

| Feature | DOM Import | OCR Track |
|---------|-----------|-----------|
| Text Accuracy | 100% (direct DOM extraction) | ~90-95% (OCR errors) |
| Font Info | Exact (computed styles) | Approximated |
| Position | Pixel-perfect | Bounding box approximation |
| Color | Exact RGB(A) | Sampled from image |
| Rotation | Exact degrees | Detected from layout |
| Processing Time | < 1 second | 5-30 seconds |
| Background Quality | Clean (text hidden) | Masked (potential overlap) |

## Limitations

1. **NotebookLM Only**: Extension is specifically designed for NotebookLM's DOM structure
2. **Single Slide**: MVP exports one slide at a time (no batch export)
3. **Text Only**: Images, shapes, and graphics are baked into background
4. **Canvas/SVG Text**: If NotebookLM renders text as canvas/SVG instead of DOM, layer count will be low (fallback to OCR track)

## Troubleshooting

### "Slide container not found"

- NotebookLM's DOM structure may have changed
- Refresh the page and wait for slide to fully load
- Check browser console for error details

### "Low layer count" warning

- Slide may use canvas/SVG rendering instead of DOM text
- Use the OCR track instead for these slides
- Check if slide has unusual formatting or animations

### Text position slightly off

- Ensure you're using the latest PNG + JSON pair
- Check that PNG dimensions match the source slide dimensions in JSON
- Verify device pixel ratio (DPR) is correct

### Font looks different

- The webapp uses fallback fonts (Pretendard, Noto Sans KR)
- Original font family is preserved but may not be available in browser
- You can manually change font family after import

## Development

### Extension Files

- `manifest.json` - Chrome extension manifest (MV3)
- `content_script.js` - DOM extraction logic
- `popup.html/js` - Extension UI
- `service_worker.js` - Screenshot capture

### Webapp Files

- `components/molecules/DOMImportZone.tsx` - File upload UI
- `hooks/useDOMImport.ts` - Import logic
- `types/dom.types.ts` - TypeScript types
- `app/page.tsx` - Main page integration

### Testing Checklist

- [ ] Extension loads without errors
- [ ] Slide container detected correctly
- [ ] Text layers extracted (check count)
- [ ] Clean background PNG has zero text
- [ ] JSON schema validates
- [ ] Webapp accepts PNG + JSON
- [ ] Coordinates scale correctly
- [ ] Text is 100% editable
- [ ] Korean + English render correctly
- [ ] Export works (PNG/JPG/clipboard)

## Future Enhancements

1. **Multi-slide export**: Export all slides in presentation
2. **Auto-upload**: Direct export to webapp (no manual file upload)
3. **SVG text support**: Extract text from SVG elements
4. **Image layer extraction**: Separate images from background
5. **Animation preservation**: Store slide transitions/animations

## Support

For issues or questions:

- GitHub: https://github.com/Breaduck/imagefix
- Extension docs: `/extension/README.md`
