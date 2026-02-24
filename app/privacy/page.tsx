import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - ImageFix',
  description: 'Privacy policy for ImageFix Link Import Companion extension',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block"
        >
          ← Back to App
        </Link>

        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last Updated: February 24, 2026 | Extension Version: 1.1.0
        </p>

        <div className="prose dark:prose-invert max-w-none">
          <h2>Overview</h2>
          <p>
            The ImageFix Link Import Companion is a browser extension that helps you export NotebookLM slides
            to the ImageFix webapp for editing. We take your privacy seriously and are committed to transparency.
          </p>

          <h2>What Data We Access</h2>
          <h3>NotebookLM Slides</h3>
          <p>When you use the extension to export a slide:</p>
          <ul>
            <li><strong>Text content</strong>: We read the text from DOM elements on the NotebookLM page</li>
            <li><strong>Text styles</strong>: We read computed CSS styles (font size, color, position, etc.)</li>
            <li><strong>Screenshots</strong>: We capture a screenshot of the slide area with text hidden</li>
          </ul>

          <h3>Your Browser</h3>
          <ul>
            <li><strong>Tab information</strong>: We access the URL and loading status of the NotebookLM tab</li>
            <li><strong>Local storage</strong>: We store temporary session data during multi-slide exports</li>
          </ul>

          <h2>What We Do With Your Data</h2>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg my-4">
            <h3 className="text-lg font-semibold mb-2">Data Flow</h3>
            <pre className="text-sm overflow-x-auto">
{`NotebookLM Page (in your browser)
  ↓ Extension reads DOM + captures screenshot
  ↓ Data processed locally in your browser
  ↓ Sent via postMessage to your ImageFix webapp tab
ImageFix Webapp (localhost or vercel.app)
  ↓ Renders on canvas for editing
Your Computer (local only)`}
            </pre>
          </div>

          <h3>Storage</h3>
          <ul>
            <li><strong>Temporary</strong>: Session IDs stored locally during export (deleted after completion)</li>
            <li><strong>No cloud storage</strong>: We do NOT upload your slides to any server</li>
            <li><strong>No databases</strong>: We do NOT store any user data in databases</li>
            <li><strong>No analytics</strong>: We do NOT track your usage</li>
          </ul>

          <h3>Data Sharing</h3>
          <ul className="space-y-2">
            <li>❌ We do NOT sell your data</li>
            <li>❌ We do NOT share your data with third parties</li>
            <li>❌ We do NOT send your data to external servers</li>
            <li>✅ All data stays in YOUR browser and YOUR webapp</li>
          </ul>

          <h2>User Control</h2>
          <h3>What You Can Control</h3>
          <ul>
            <li><strong>When it runs</strong>: Extension only works when you explicitly trigger export</li>
            <li><strong>What it accesses</strong>: Extension only accesses pages you navigate to (NotebookLM)</li>
            <li><strong>Data deletion</strong>: Uninstall the extension to remove all local data</li>
          </ul>

          <h2>Data Security</h2>
          <h3>In Transit</h3>
          <ul>
            <li>Data is sent via <code>window.postMessage</code> (browser-native, secure)</li>
            <li>Communication is between tabs in YOUR browser only</li>
            <li>No network requests to external servers</li>
          </ul>

          <h3>At Rest</h3>
          <ul>
            <li>Session data stored in browser&apos;s <code>chrome.storage.local</code> (encrypted by browser)</li>
            <li>Automatically cleared after export completes</li>
            <li>No persistent user data stored</li>
          </ul>

          <h2>Summary (TL;DR)</h2>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg my-4">
            <ul className="space-y-2">
              <li>✅ Extension reads NotebookLM slides you want to export</li>
              <li>✅ All processing happens locally in your browser</li>
              <li>✅ Data sent only to YOUR webapp tab (not our servers)</li>
              <li>❌ NO data collection, NO analytics, NO third-party sharing</li>
              <li>❌ NO login credentials stored or transmitted</li>
              <li>🔒 Your data never leaves your computer</li>
            </ul>
          </div>

          <h2>Contact</h2>
          <p>Questions or concerns about privacy?</p>
          <ul>
            <li>
              <strong>GitHub Issues</strong>:{' '}
              <a
                href="https://github.com/Breaduck/imagefix/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                https://github.com/Breaduck/imagefix/issues
              </a>
            </li>
          </ul>

          <h2>Open Source</h2>
          <p>
            This extension is open source. You can review the code at:{' '}
            <a
              href="https://github.com/Breaduck/imagefix"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              https://github.com/Breaduck/imagefix
            </a>
          </p>

          <hr className="my-8" />

          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>By using this extension, you agree to this privacy policy.</strong>
            <br />
            If you have concerns, please review the source code or contact us before use.
          </p>
        </div>
      </div>
    </div>
  );
}
