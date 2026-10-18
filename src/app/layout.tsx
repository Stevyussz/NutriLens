import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";
import "./application.css";
import "./landing.css";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#491d36",
};
export const metadata: Metadata = {
  title: "BongkarLabel | Baca di balik kemasan",
  description:
    "Bedah komposisi pangan, periksa sumber gula dan bandingkan pilihan sesuai kebutuhan Anda.",
  applicationName: "BongkarLabel",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <head>
        {/* Installation metadata must precede the streamed document body. */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link
          rel="icon"
          href="/icons/favicon-32.png"
          sizes="32x32"
          type="image/png"
        />
        <link
          rel="apple-touch-icon"
          href="/icons/apple-touch-icon.png"
          sizes="180x180"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="BongkarLabel" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Lewati navigasi
        </a>
        <Providers>{children}</Providers>
        <PwaRegistration />
      </body>
    </html>
  );
}
