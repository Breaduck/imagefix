# NotebookLM DOM Export Extension

## Overview

Chrome extension (Manifest V3) that extracts text from NotebookLM slides via DOM, creating:
1. **Clean background PNG** - Screenshot with all text hidden (zero overlap)
2. **layers.json** - Editable text layers with exact positions, styles, and rotation

This enables pixel-perfect text editing in the ImageFix webapp without OCR.

## Installation (Load Unpacked)

### Prerequisites
- Google Chrome browser
- NotebookLM account with access to presentations

### Steps

1. **Prepare Icon Files**

   The extension requires 3 icon files in the `extension/` folder:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)

   You can create simple colored squares for development:
   ```bash
   # Using ImageMagick (if available)
   convert -size 16x16 xc:#1a73e8 extension/icon16.png
   convert -size 48x48 xc:#1a73e8 extension/icon48.png
   convert -size 128x128 xc:#1a73e8 extension/icon128.png
   ```

   Or use any PNG image editor to create simple blue squares.

2. **Load Extension in Chrome**

   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **"Developer mode"** (toggle in top-right corner)
   - Click **"Load unpacked"**
   - Navigate to and select the `extension/` folder from this repo
   - The extension icon should appear in your Chrome toolbar

3. **Verify Installation**

   - You should see "NotebookLM to ImageFix" in the extensions list
   - The extension should be enabled (blue toggle)

## Usage

### Step 1: Open NotebookLM Slide

1. Navigate to https://notebooklm.google.com
2. Open any presentation
3. Navigate to the specific slide you want to export
4. Wait for the slide to fully load

### Step 2: Export Slide

1. Click the extension icon in the Chrome toolbar
2. Click **"Export Current Slide"** button
3. Wait for extraction and capture (2-3 seconds)
4. Two files will automatically download:
   - `notebooklm-slide-[timestamp].png` - Clean background
   - `notebooklm-layers-[timestamp].json` - Text layers

### Step 3: Import to Webapp

See [DOM_IMPORT.md](./DOM_IMPORT.md) for webapp import instructions.

## How It Works

### Architecture

```
┌─────────────────────┐
│  NotebookLM Page    │
│  (DOM with text)    │
└──────────┬──────────┘
           │
           │ content_script.js
           │ 1. Find slide container
           │ 2. Extract text elements
           │ 3. Compute styles
           │ 4. Merge into lines
           │
           ▼
┌─────────────────────┐
│   layers.json       │
│   {text, bbox,      │
│    style, rotation} │
└──────────┬──────────┘
           │
           │ service_worker.js
           │ 5. Hide text (transparent)
           │ 6. Capture screenshot
           │ 7. Crop to slide area
           │ 8. Restore text
           │
           ▼
┌─────────────────────┐
│    page.png         │
│  (clean background) │
└─────────────────────┘
```

### Key Features

1. **DOM-based Extraction**
   - No OCR needed - 100% accurate text from DOM
   - Preserves exact fonts, colors, sizes, rotation
   - Korean + English + all Unicode supported

2. **Clean Background**
   - Text temporarily hidden before screenshot
   - Captures background graphics, images, shapes
   - Zero text overlap in final render

3. **Line-level Merging**
   - Individual DOM elements merged into logical lines
   - Smart space insertion based on gaps
   - Rotation-aware grouping

## Troubleshooting

### "Slide container not found"

**Cause:** NotebookLM's DOM structure changed or page not fully loaded.

**Solutions:**
- Refresh the page and wait for slide to render
- Try scrolling to ensure the slide is in viewport
- Check browser console for errors (`F12` → Console)

### "Low layer count" warning

**Cause:** Slide rendered as Canvas/SVG instead of DOM text.

**Solutions:**
- Some NotebookLM slides use canvas rendering
- Use the **OCR track** instead for these slides
- If layers.length < 5, DOM extraction may not work

### No downloads appear

**Cause:** Chrome download permissions blocked.

**Solutions:**
- Check Chrome settings: `chrome://settings/content/automaticDownloads`
- Allow downloads for `notebooklm.google.com`
- Check Downloads folder for files

### Text not fully hidden in screenshot

**Cause:** Page still rendering when screenshot taken.

**Solutions:**
- Increase delay in `service_worker.js` (line with `sleep(500)`)
- Try exporting again after page is stable
- Check if text elements use CSS tricks that prevent hiding

## Development

### File Structure

```
extension/
├── manifest.json           # Extension config (MV3)
├── service_worker.js       # Background script (capture + download)
├── content_script.js       # DOM extraction logic
├── popup.html              # Extension popup UI
├── popup.js                # Popup interaction handler
├── icon16.png              # 16x16 icon
├── icon48.png              # 48x48 icon
├── icon128.png             # 128x128 icon
└── README.md               # Quick reference
```

### Debugging

1. **Content Script Logs**
   - Open NotebookLM page
   - Press `F12` to open DevTools
   - Go to Console tab
   - Look for `[NotebookLM Extractor]` logs

2. **Service Worker Logs**
   - Go to `chrome://extensions/`
   - Find "NotebookLM to ImageFix"
   - Click "service worker" link
   - Check logs in opened DevTools

3. **Popup Logs**
   - Right-click extension icon → "Inspect popup"
   - Check Console tab

### Testing

1. Open a NotebookLM presentation
2. Try exporting different slide types:
   - Text-heavy slides
   - Slides with images
   - Slides with rotated text
   - Slides with multiple columns
3. Verify downloaded files:
   - PNG should have clean background
   - JSON should have accurate text and positions

## API Reference

### layers.json Schema

```typescript
{
  version: 1,
  source: {
    url: string,           // NotebookLM page URL
    title: string,         // Page title
    dpr: number,           // Device pixel ratio
    slideW: number,        // Slide width (px)
    slideH: number,        // Slide height (px)
    slideX: number,        // Slide X position in viewport
    slideY: number,        // Slide Y position in viewport
    createdAt: string,     // ISO timestamp
  },
  layers: [
    {
      id: string,          // Unique layer ID
      type: "text-line",   // Always "text-line"
      text: string,        // Merged line text
      bbox: {              // Bounding box (slide-local coords)
        x: number,
        y: number,
        w: number,
        h: number,
      },
      style: {
        fontFamily: string,
        fontSizePx: number,
        fontWeight: string,
        fontStyle: string,
        colorRgba: string,
        letterSpacingPx: number,
        lineHeightPx: number,
        textAlign: string,
      },
      rotationDeg: number, // Rotation in degrees
      elements: string[],  // Original element IDs
    }
  ]
}
```

## Limitations

- **Single slide only:** Exports current visible slide, not entire presentation
- **DOM-rendered text only:** Canvas/SVG text not supported (use OCR track)
- **Chrome only:** Manifest V3 Chrome extension (not Firefox/Safari)
- **NotebookLM structure:** May break if NotebookLM significantly changes their DOM

## Future Enhancements

- [ ] Multi-slide export (entire presentation)
- [ ] SVG text extraction support
- [ ] Auto-detect canvas slides and suggest OCR
- [ ] Firefox/Safari extension ports
- [ ] Batch export with keyboard shortcut

## License

Part of ImageFix project: https://github.com/Breaduck/imagefix
