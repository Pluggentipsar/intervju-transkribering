/** @type {import('next').NextConfig} */

const isLocal = process.env.BUILD_MODE === "local";

const nextConfig = {
  reactStrictMode: true,

  // Local build: static export served by FastAPI
  // Web build: normal Next.js deployment (Vercel/Scalingo)
  ...(isLocal
    ? {
        output: "export",
        trailingSlash: true,
      }
    : {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: "http://localhost:8000/api/:path*",
            },
          ];
        },
      }),
};

module.exports = nextConfig;
