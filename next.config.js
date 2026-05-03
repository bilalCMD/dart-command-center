/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.prod.website-files.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 't3.gstatic.com' },
    ],
  },
  compress: true,
  poweredByHeader: false,
  output: 'standalone',
};
module.exports = nextConfig;