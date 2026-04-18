import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['skilldock.duckdns.org', '38.49.216.59'],
    },
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  },

  // Allow cross-origin requests for the API (MCP clients, agents)
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-PAYMENT, Authorization' },
        { key: 'Access-Control-Expose-Headers', value: 'X-PAYMENT-RESPONSE, X-PAYMENT-REQUIRED' },
      ],
    },
    {
      source: '/.well-known/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Cache-Control', value: 'public, max-age=300' },
      ],
    },
  ],

  // Turbopack config (Next.js 16+)
  turbopack: {},
};

export default nextConfig;
