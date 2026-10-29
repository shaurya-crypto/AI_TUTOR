import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Mascot } from "@/components/mascot/Mascot";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "AI Tutor - Personalized Learning",
  description: "Real-time, low-latency live AI tutor",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF8F4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Caveat:wght@400..700&family=Instrument+Serif:ital@0;1&family=Inter:ital,opsz,wght@0,14..32,300..800;1,14..32,300..800&family=JetBrains+Mono:ital,wght@0,400..700;1,400..700&family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..700&family=Geist:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                function isIgnorableError(err) {
                  if (!err) return false;
                  var msg = String(err.message || err.reason || err || '');
                  var name = String(err.name || (err.constructor && err.constructor.name) || '');
                  return (
                    msg.indexOf('Client initiated disconnect') !== -1 ||
                    msg.indexOf('Called Disconnect Before A Connecction succeeded') !== -1 ||
                    msg.indexOf('ConnectionError') !== -1 ||
                    name === 'ConnectionError'
                  );
                }
                window.addEventListener('unhandledrejection', function(event) {
                  if (isIgnorableError(event.reason)) {
                    event.preventDefault();
                    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                    if (event.stopPropagation) event.stopPropagation();
                  }
                }, true);
                window.addEventListener('error', function(event) {
                  if (isIgnorableError(event.error)) {
                    event.preventDefault();
                    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                    if (event.stopPropagation) event.stopPropagation();
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body
        className="font-sans bg-canvas min-h-[100dvh] flex flex-col antialiased selection:bg-primary-fixed selection:text-ink-primary"
      >
        {children}
        <Mascot />
        <Analytics />
      </body>
    </html>
  );
}
