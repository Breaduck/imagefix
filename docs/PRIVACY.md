# Privacy Policy - ImageFix Link Import Companion

**Last Updated**: February 24, 2026
**Extension Version**: 1.1.0

## Overview

The ImageFix Link Import Companion is a browser extension that helps you export NotebookLM slides to the ImageFix webapp for editing. We take your privacy seriously and are committed to transparency.

## What Data We Access

### NotebookLM Slides
When you use the extension to export a slide:
- **Text content**: We read the text from DOM elements on the NotebookLM page
- **Text styles**: We read computed CSS styles (font size, color, position, etc.)
- **Screenshots**: We capture a screenshot of the slide area with text hidden

### Your Browser
- **Tab information**: We access the URL and loading status of the NotebookLM tab
- **Local storage**: We store temporary session data during multi-slide exports

## What We Do With Your Data

### Data Flow
```
NotebookLM Page (in your browser)
  ↓ Extension reads DOM + captures screenshot
  ↓ Data processed locally in your browser
  ↓ Sent via postMessage to your ImageFix webapp tab
ImageFix Webapp (localhost or vercel.app)
  ↓ Renders on canvas for editing
Your Computer (local only)
```

### Storage
- **Temporary**: Session IDs stored locally during export (deleted after completion)
- **No cloud storage**: We do NOT upload your slides to any server
- **No databases**: We do NOT store any user data in databases
- **No analytics**: We do NOT track your usage

### Data Sharing
- ❌ We do NOT sell your data
- ❌ We do NOT share your data with third parties
- ❌ We do NOT send your data to external servers
- ✅ All data stays in YOUR browser and YOUR webapp

## User Control

### What You Can Control
- **When it runs**: Extension only works when you explicitly trigger export
- **What it accesses**: Extension only accesses pages you navigate to (NotebookLM)
- **Data deletion**: Uninstall the extension to remove all local data

### Permissions Explained
See [EXTENSION_PERMISSIONS.md](./EXTENSION_PERMISSIONS.md) for detailed permission justifications.

## Data Security

### In Transit
- Data is sent via `window.postMessage` (browser-native, secure)
- Communication is between tabs in YOUR browser only
- No network requests to external servers

### At Rest
- Session data stored in browser's `chrome.storage.local` (encrypted by browser)
- Automatically cleared after export completes
- No persistent user data stored

## Third-Party Services

### NotebookLM
- We access NotebookLM pages that YOU navigate to
- We do NOT log in on your behalf
- We use your existing Google login session
- We do NOT store your Google credentials

### ImageFix Webapp
- We send extracted data to YOUR webapp tab (localhost or vercel.app)
- The webapp may have its own privacy policy (check webapp documentation)
- We do NOT control what the webapp does with the data after receiving it

## Children's Privacy

This extension is not directed at children under 13. We do not knowingly collect data from children.

## Changes to Privacy Policy

We may update this policy. Check the "Last Updated" date above. Major changes will be announced via:
- Extension update notes
- GitHub repository notifications

## Contact

Questions or concerns about privacy?

- **GitHub Issues**: https://github.com/Breaduck/imagefix/issues
- **Email**: [Your contact email - to be added]

## Open Source

This extension is open source. You can review the code at:
https://github.com/Breaduck/imagefix

## Legal Compliance

### GDPR (EU Users)
- **Lawful basis**: Legitimate interest (providing the service you requested)
- **Data minimization**: We only access data necessary for export functionality
- **Right to erasure**: Uninstall extension to delete all data
- **Data portability**: All data is already in your control (local browser)

### CCPA (California Users)
- We do NOT sell personal information
- We do NOT share personal information for monetary value
- You can request deletion by uninstalling the extension

## Summary (TL;DR)

- ✅ Extension reads NotebookLM slides you want to export
- ✅ All processing happens locally in your browser
- ✅ Data sent only to YOUR webapp tab (not our servers)
- ❌ NO data collection, NO analytics, NO third-party sharing
- ❌ NO login credentials stored or transmitted
- 🔒 Your data never leaves your computer

---

**By using this extension, you agree to this privacy policy.**

If you have concerns, please review the [source code](https://github.com/Breaduck/imagefix) or contact us before use.
