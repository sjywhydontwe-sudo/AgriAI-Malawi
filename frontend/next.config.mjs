/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig = {
  async rewrites() {
    return {
      // For now the home page serves the latest prototype (public/prototype.html), which has the
      // desktop layout and every new feature. The React screens in app/ are the earlier version
      // and are being rebuilt from the prototype one by one.
      beforeFiles: [{ source: "/", destination: "/prototype.html" }],
      // The browser calls same-origin /api/*; Next.js forwards it to the Python backend.
      // This avoids CORS and keeps the backend address out of the client bundle.
      afterFiles: [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }],
    };
  },
};

export default nextConfig;
