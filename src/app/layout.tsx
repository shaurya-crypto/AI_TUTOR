import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Mascot } from "@/components/mascot/Mascot";


export const metadata: Metadata = {
  title: "AI Tutor - Personalized Learning",
  description: "Real-time, low-latency live AI tutor",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F8F6F0",
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
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..700&family=Geist:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="font-sans bg-canvas min-h-[100dvh] flex flex-col antialiased selection:bg-primary-fixed selection:text-ink-primary"
      >
        {children}
        <Mascot />
      </body>
    </html>
  );
}
