/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,

  // For Tauri: export as static site
  output: process.env.TAURI_BUILD ? "export" : undefined,

  // Disable image optimization for static export (Tauri)
  images: process.env.TAURI_BUILD
    ? { unoptimized: true }
    : undefined,

  // API proxy for development (web mode)
  async rewrites() {
    // Rewrites don't work with static export
    if (process.env.TAURI_BUILD) {
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
