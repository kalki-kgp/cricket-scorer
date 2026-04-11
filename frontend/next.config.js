const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker multi-stage standalone build
  output: 'standalone',
  // Stable tracing root when the app lives under a repo subfolder (cricket-scorer/frontend).
  outputFileTracingRoot: path.join(__dirname),
};
module.exports = nextConfig;
