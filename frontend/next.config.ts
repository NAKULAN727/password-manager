import type { NextConfig } from "next";

// Define highly secure strict Content Security Policy (CSP) rules
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self' https://password-manager-gg4l.onrender.com wss://password-manager-sigma-green.vercel.app;
  frame-ancestors 'none';
  form-action 'self';
`.replace(/\s{2,}/g, ' ').trim();

const backendUrl = process.env.BACKEND_URL || "https://password-manager-gg4l.onrender.com";

const nextConfig: NextConfig = {
  /**
   * Proxy API calls through Next.js so the browser uses same-origin `/api/*`.
   * Avoids cross-origin failures and interference from VPN/ad-block extensions.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  /**
   * Inject premium security headers across all frontend paths.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Frame-Options",
            value: "DENY", // Completely blocks clickjacking/framing
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff", // Enforces strict MIME validation
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin", // Restricts referrer leaks
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()", // Disables unnecessary browser features
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload", // Enforces HSTS (2 years)
          },
        ],
      },
    ];
  },
};

export default nextConfig;
