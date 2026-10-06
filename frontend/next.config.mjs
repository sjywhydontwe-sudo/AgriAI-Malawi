/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig = {
  // The browser calls same-origin /api/*; Next.js forwards it to the Python backend.
  // This avoids CORS and keeps the backend address out of the client bundle.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
