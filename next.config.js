/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack configuration for Next.js 16+
  turbopack: {},

  // Disable React Strict Mode to prevent double rendering
  reactStrictMode: false,

  webpack: (config) => {
    // Fabric.js compatibility
    config.externals = config.externals || {};
    config.externals.canvas = 'canvas';
    config.externals.jsdom = 'jsdom';

    return config;
  },
};

module.exports = nextConfig;
