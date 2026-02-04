/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,

  // Static export for desktop app
  output: "export",

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Trailing slash for better static file serving
  trailingSlash: true,
};

module.exports = nextConfig;
