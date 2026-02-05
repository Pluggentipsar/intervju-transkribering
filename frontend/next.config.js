/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export - served by FastAPI backend
  output: "export",

  // Enable React strict mode
  reactStrictMode: true,

  // Trailing slash creates /page/index.html structure (easier to serve)
  trailingSlash: true,
};

module.exports = nextConfig;
