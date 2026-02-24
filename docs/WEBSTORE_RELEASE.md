# Chrome Web Store Release Guide

Complete guide for publishing the ImageFix Link Import Companion to Chrome Web Store.

## Prerequisites

- [ ] Google account
- [ ] $5 USD for one-time Chrome Web Store developer registration
- [ ] Extension tested and working locally
- [ ] All required assets prepared (see checklist below)

---

## Phase 1: Prepare Assets

### 1.1 Extension Icons ✅
Required sizes (place in `extension/icons/`):
- [ ] `icon16.png` - 16x16px
- [ ] `icon48.png` - 48x48px
- [ ] `icon128.png` - 128x128px

**How to create**:
- Use `extension/generate-icons.html` for placeholders
- Or design custom icons (Figma, Canva, etc.)
- Ensure high contrast, clear at small sizes

### 1.2 Promotional Images
Required for Chrome Web Store listing:

**Small Promo Tile** (required)
- [ ] Size: 440x280px
- [ ] Format: PNG or JPEG
- [ ] Content: Extension logo + tagline

**Screenshots** (1-5 images, at least 1 required)
- [ ] Size: 1280x800px or 640x400px
- [ ] Format: PNG or JPEG
- [ ] Content:
  1. Webapp with URL input (show "paste link" UX)
  2. Extension detecting slides
  3. Canvas with rendered slide

**Large Promo Tile** (optional, recommended)
- [ ] Size: 920x680px
- [ ] Format: PNG or JPEG

**Marquee** (optional)
- [ ] Size: 1400x560px
- [ ] Format: PNG or JPEG

### 1.3 Store Listing Text

**Short Description** (132 characters max)
```
Automatically capture NotebookLM slides and send to ImageFix webapp. Just paste a link!
```

**Detailed Description** (see template below)

**Category**
- Productivity

**Language**
- English (primary)
- Korean (optional secondary)

---

## Phase 2: Package Extension

### 2.1 Final Checks

- [ ] `manifest.json` updated:
  - [ ] Version number (e.g., 1.1.0)
  - [ ] Name: "ImageFix Link Import Companion"
  - [ ] Description clear and concise
  - [ ] Icons paths correct (`icons/icon*.png`)
  - [ ] Permissions minimal and justified
  - [ ] Host permissions include production domain

- [ ] Remove development files:
  ```bash
  # Files to exclude from ZIP:
  - *.md (except README if needed)
  - .git*
  - node_modules
  - .DS_Store
  - *.log
  ```

### 2.2 Create ZIP

**Option A: Manual ZIP**
```bash
cd notebook-text-editor/extension
zip -r imagefix-extension-v1.1.0.zip . \
  -x "*.md" "*.log" ".DS_Store" ".git*"
```

**Option B: Using GUI**
1. Copy `extension/` folder to temporary location
2. Remove `.md` files (except README.md if needed)
3. Compress folder to ZIP
4. Rename to `imagefix-extension-v1.1.0.zip`

### 2.3 Verify ZIP Contents
```
imagefix-extension-v1.1.0.zip/
  ├── manifest.json
  ├── icons/
  │   ├── icon16.png
  │   ├── icon48.png
  │   └── icon128.png
  ├── content_script.js
  ├── service_worker.js
  ├── popup.html
  ├── popup.js
  └── README.md (optional)
```

---

## Phase 3: Developer Registration

### 3.1 Create Developer Account

1. Go to: https://chrome.google.com/webstore/devconsole
2. Sign in with Google account
3. Accept terms and conditions
4. Pay $5 one-time registration fee
5. Wait for payment confirmation (usually instant)

---

## Phase 4: Upload Extension

### 4.1 Create New Item

1. Go to Chrome Web Store Developer Dashboard
2. Click **"New item"**
3. Upload ZIP file (`imagefix-extension-v1.1.0.zip`)
4. Wait for upload to complete

### 4.2 Fill Store Listing

**Product Details**
- **Name**: ImageFix Link Import Companion
- **Summary**: Automatically capture NotebookLM slides and send to ImageFix webapp. Just paste a link!
- **Category**: Productivity
- **Language**: English

**Detailed Description** (use template below)

**Privacy**
- Upload `docs/PRIVACY.md` content or link to: `https://YOUR_DOMAIN/privacy`
- Check: "This item does not collect user data"
- Or if checked, provide privacy policy URL

**Permissions Justification**
Copy from `docs/EXTENSION_PERMISSIONS.md`:
- activeTab: Access NotebookLM slides for export
- scripting: Extract text and styles from DOM
- storage: Temporary session management
- tabs: Automatic tab opening and closing

**Upload Assets**
- Small promo tile (440x280)
- Screenshots (1-5 images)
- Large promo tile (optional)

### 4.3 Distribution Settings

**Visibility**
- [ ] **Private** (for initial testing)
- [ ] **Unlisted** (shareable link only, recommended for beta)
- [ ] **Public** (everyone can find it)

**Recommended flow**: Private → Unlisted (testers) → Public

**Pricing**
- [ ] Free

**Regions**
- [ ] All regions (or select specific countries)

---

## Phase 5: Submit for Review

### 5.1 Pre-submission Checklist

- [ ] All required fields filled
- [ ] All images uploaded
- [ ] Privacy policy provided
- [ ] Permissions justified
- [ ] Description clear and accurate
- [ ] Contact email provided
- [ ] Extension tested in latest Chrome

### 5.2 Submit

1. Click **"Submit for review"**
2. Wait for review (typically 1-3 business days)
3. Monitor email for review updates

### 5.3 Review Process

**Possible outcomes**:
- ✅ **Approved**: Extension published automatically
- ⚠️ **Needs changes**: Fix issues and resubmit
- ❌ **Rejected**: Review rejection reasons and appeal if needed

**Common rejection reasons**:
- Missing privacy policy
- Unclear permission justifications
- Low-quality icons/screenshots
- Misleading description
- Violating Web Store policies

---

## Phase 6: Post-Publication

### 6.1 Update Web App

After approval, get the extension ID (e.g., `abcdefghijklmnopqrstuvwxyz123456`).

Update webapp:
```typescript
// components/molecules/LinkImportZone.tsx
const EXTENSION_STORE_URL = 'https://chrome.google.com/webstore/detail/abcdefghijklmnopqrstuvwxyz123456';
```

### 6.2 Monitor & Update

- Check **Developer Dashboard** for:
  - Install count
  - User reviews
  - Crash reports

- Respond to user reviews
- Fix bugs and release updates
- Update version number in `manifest.json` for each update

---

## Detailed Description Template

```markdown
## 🚀 Effortless NotebookLM Slide Editing

Export NotebookLM presentation slides to ImageFix webapp with a single click. No manual downloads, no file uploads - just paste a link and go!

## ✨ Features

- **One-Click Export**: Paste NotebookLM presentation URL → automatic capture
- **Multi-Slide Support**: Exports all slides in sequence automatically
- **100% Accurate**: Extracts text directly from DOM (no OCR errors)
- **Clean Backgrounds**: Screenshot with text hidden for perfect editing
- **Privacy First**: All processing in your browser, no data sent to servers

## 🎯 How It Works

1. Install extension (one time)
2. Paste NotebookLM presentation URL in ImageFix webapp
3. Click "Import" → slides automatically captured
4. Edit text on canvas with full style preservation

## 📋 Requirements

- Chrome browser
- ImageFix webapp (https://YOUR_DOMAIN or localhost:3000)
- NotebookLM account (Google)

## 🔒 Privacy

- No data collection or analytics
- All processing happens locally in your browser
- Data sent only to YOUR webapp tab (not our servers)
- Open source: https://github.com/Breaduck/imagefix

## 📞 Support

Questions or issues? Open a GitHub issue:
https://github.com/Breaduck/imagefix/issues

## 🆓 Free & Open Source

Completely free to use. Source code available on GitHub.
```

---

## Testing Before Public Release

### Beta Testing (Unlisted Distribution)

1. Set visibility to **"Unlisted"**
2. Share extension URL with testers
3. Collect feedback
4. Fix issues
5. Upload new version
6. Once stable, switch to **"Public"**

### Test Scenarios

- [ ] Fresh install works
- [ ] Extension detects webapp
- [ ] Link import works end-to-end
- [ ] Multi-slide export works
- [ ] NotebookLM tab closes automatically
- [ ] Error handling works (invalid URLs, etc.)
- [ ] Permissions are minimal and justified

---

## Update Process (After Initial Publish)

1. Make changes to extension code
2. Bump version in `manifest.json` (e.g., 1.1.0 → 1.1.1)
3. Create new ZIP
4. Upload to Developer Dashboard
5. Update changelog
6. Submit for review
7. Auto-update for users after approval

---

## Troubleshooting

### "Extension ID changed after upload"
- Use the ID from Developer Dashboard
- Update webapp to point to correct ID

### "Privacy policy required"
- Add link to `/privacy` page in webapp
- Or upload `PRIVACY.md` as static page

### "Permission justification unclear"
- Copy detailed explanations from `EXTENSION_PERMISSIONS.md`
- Be specific about why each permission is needed

### "Screenshots don't meet requirements"
- Ensure 1280x800 or 640x400 resolution
- Show actual extension functionality
- Use high-quality, clear images

---

## Quick Reference

**Developer Console**: https://chrome.google.com/webstore/devconsole
**Web Store Policies**: https://developer.chrome.com/docs/webstore/program-policies
**Manifest V3 Docs**: https://developer.chrome.com/docs/extensions/mv3/intro/

**Support Email**: support@imagefix.app (or your email)
**GitHub**: https://github.com/Breaduck/imagefix
**Privacy Policy**: https://YOUR_DOMAIN/privacy

---

## Checklist Summary

### Before Submission
- [ ] Icons (16, 48, 128px)
- [ ] Screenshots (1-5, 1280x800)
- [ ] Promo tile (440x280)
- [ ] Privacy policy
- [ ] Permission justifications
- [ ] Detailed description
- [ ] Extension tested
- [ ] ZIP created and verified

### After Approval
- [ ] Update webapp with extension ID
- [ ] Monitor reviews
- [ ] Respond to feedback
- [ ] Plan updates

---

Good luck with your Web Store submission! 🚀
