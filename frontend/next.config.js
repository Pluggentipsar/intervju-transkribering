/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,

  // For static build (desktop app): export as static site
  output: process.env.STATIC_BUILD ? "export" : undefined,

  // Disable image optimization for static export
  images: process.env.STATIC_BUILD
    ? { unoptimized: true }
    : undefined,

  // Trailing slash for static export compatibility
  trailingSlash: process.env.STATIC_BUILD ? true : false,

  // API proxy for development (web mode)
  async rewrites() {
    // Rewrites don't work with static export
    if (process.env.STATIC_BUILD) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
