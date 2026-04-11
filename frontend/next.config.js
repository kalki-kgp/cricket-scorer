/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker multi-stage standalone build
  output: 'standalone',
};
module.exports = nextConfig;
