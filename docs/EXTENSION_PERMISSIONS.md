# Extension Permissions Justification

This document explains why each permission is required for the ImageFix Link Import Companion extension.

## Required Permissions

### 1. `activeTab`
**Purpose**: Access the currently active tab's content
**Used for**:
- Reading NotebookLM slide DOM when user clicks export
- Injecting content scripts into the NotebookLM page
- Capturing screenshots of the active slide

**Why needed**: Without this, we cannot access the slide content or take screenshots.

**User impact**: Only activates when user explicitly clicks the extension button or pastes a link in the webapp.

---

### 2. `scripting`
**Purpose**: Inject JavaScript into NotebookLM pages
**Used for**:
- Running `content_script.js` to extract slide text and styles
- Temporarily hiding text elements before screenshot
- Detecting slide navigation and page structure

**Why needed**: Core functionality - we need to read the DOM to extract text layers accurately.

**User impact**: Scripts only run on `notebooklm.google.com` and only when user initiates export.

---

### 3. `storage`
**Purpose**: Store extension settings locally
**Used for**:
- Remembering user preferences (if any)
- Caching session data during multi-slide export

**Why needed**: Improves user experience by maintaining state during the export process.

**User impact**: All data stored locally in browser, never sent to external servers.

**Data stored**:
- Extension settings (preferences)
- Temporary session IDs for tracking multi-slide exports
- NO user content, NO slide data (all sent directly to webapp)

---

### 4. `tabs`
**Purpose**: Create, query, and close browser tabs
**Used for**:
- Opening NotebookLM URL when user pastes link in webapp
- Monitoring tab loading status
- Closing NotebookLM tab automatically after export completes

**Why needed**: Core feature - automatic tab management for seamless UX.

**User impact**:
- New tab opens briefly during export
- Tab closes automatically when done
- User sees progress but doesn't need to manually manage tabs

**Alternative**: Without `tabs`, user would need to manually open NotebookLM, manually trigger export, and manually close the tab (bad UX).

---

## Host Permissions

### 1. `https://notebooklm.google.com/*`
**Purpose**: Access NotebookLM pages
**Why needed**: Cannot extract slides without accessing the NotebookLM domain.

### 2. `http://localhost:3000/*`
**Purpose**: Communicate with local development webapp
**Why needed**: For development and testing. Does not access any external localhost servers.

### 3. `https://*.vercel.app/*`
**Purpose**: Communicate with production webapp
**Why needed**: Send extracted slide data to the ImageFix webapp after export.

**Note**: In production, this will be replaced with the actual production domain (e.g., `https://imagefix.app/*`).

---

## Removed Permissions

### ❌ `downloads` (removed in v1.1.0)
**Previously used for**: Downloading PNG + JSON files in manual export mode
**Why removed**: Link import mode sends data directly to webapp via postMessage, no file downloads needed.

**Impact**: Manual "download files" mode from popup still works via webapp, but extension no longer needs download permission.

---

## Privacy Summary

- **No data collection**: Extension does not collect or store any user data
- **No external servers**: All communication is between browser and user's webapp
- **User-initiated only**: Extension only runs when user explicitly triggers export
- **Local processing**: All slide extraction happens in browser, nothing sent to third parties
- **Open source**: All code is available at https://github.com/Breaduck/imagefix

---

## Chrome Web Store Compliance

This extension complies with Chrome Web Store policies:
- ✅ Minimal permissions (only what's required)
- ✅ Clear permission justifications
- ✅ No remote code execution
- ✅ No data collection or analytics
- ✅ User privacy respected (see PRIVACY.md)

---

## Updates

- **v1.0.0**: Initial permissions (activeTab, scripting, downloads, storage, tabs)
- **v1.1.0**: Removed `downloads` permission (no longer needed for link import mode)

---

For questions or concerns about permissions, please open an issue at:
https://github.com/Breaduck/imagefix/issues
