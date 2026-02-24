/**
 * Application constants
 */

export const APP_CONFIG = {
  // Webapp
  WEBAPP_ORIGIN: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  WEBAPP_PROD: 'https://imagefix-dun.vercel.app',
  WEBAPP_DEV: 'http://localhost:3000',

  // Extension
  // TODO: Update after Chrome Web Store approval
  EXTENSION_WEBSTORE_URL: 'https://chrome.google.com/webstore/detail/EXTENSION_ID_PLACEHOLDER',
  EXTENSION_WEBSTORE_ID: 'EXTENSION_ID_PLACEHOLDER',

  // GitHub
  GITHUB_REPO: 'https://github.com/Breaduck/imagefix',
  GITHUB_ISSUES: 'https://github.com/Breaduck/imagefix/issues',

  // Privacy
  PRIVACY_URL: '/privacy',
} as const;

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_DEV = process.env.NODE_ENV === 'development';
