# NotebookLM to ImageFix Extension

Chrome extension to export NotebookLM slides as clean background + editable text layers.

## Installation (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select this `extension` folder

## Usage

1. Open a NotebookLM presentation in Chrome
2. Navigate to the slide you want to export
3. Click the extension icon in the toolbar
4. Click "Export Current Slide"
5. Two files will be downloaded:
   - `notebooklm-slide-[timestamp].png` - Clean background image (text hidden)
   - `notebooklm-layers-[timestamp].json` - Text layers with positions and styles

## Import to ImageFix Webapp

1. Open the ImageFix webapp
2. Select "DOM Import (PNG + JSON)" mode
3. Upload both files (PNG + JSON)
4. Edit text directly on the canvas!

## Icons

The extension requires icon files (icon16.png, icon48.png, icon128.png).
You can create simple placeholder icons or use the following guide:
- 16x16: Small toolbar icon
- 48x48: Extension management icon
- 128x128: Chrome Web Store icon

For development, you can use any 3 PNG files with those dimensions.

## Troubleshooting

**"Slide container not found"**
- NotebookLM's DOM structure may have changed
- Try refreshing the page and waiting for the slide to fully load

**"Low layer count" warning**
- The slide might be rendered as Canvas/SVG instead of DOM text
- Consider using the OCR track instead for these slides

## Architecture

```
User Flow:
NotebookLM Page
    ↓ (content_script.js extracts DOM text)
Extension Popup
    ↓ (service_worker.js captures screenshot)
Downloads: page.png + layers.json
    ↓ (user uploads to webapp)
ImageFix Webapp
    ↓ (renders clean background + editable layers)
Fabric.js Canvas (editable!)
```

## License

Part of the ImageFix project: https://github.com/Breaduck/imagefix
