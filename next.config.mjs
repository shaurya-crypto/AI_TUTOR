/** @type {import('next').NextConfig} */
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https:;
  font-src 'self' data: https: https://fonts.gstatic.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  worker-src 'self' blob:;
  media-src 'self' blob: data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com https://api.simli.ai wss://api.simli.ai https://*.simli.ai wss://*.simli.ai https://*.livekit.cloud wss://*.livekit.cloud;
`.replace(/\s{2,}/g, ' ').trim()

const nextConfig = {
  reactStrictMode: false, // Prevents duplicate WebSocket handshakes during local development mount cycles
  allowedDevOrigins: ['192.168.56.1', 'localhost:3000', '127.0.0.1:3000'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), display-capture=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
