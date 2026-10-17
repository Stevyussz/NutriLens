import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
import "./application.css";
import "./landing.css";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export const metadata: Metadata = {
  title: "BongkarLabel | Baca di balik kemasan",
  description:
    "Bedah komposisi pangan, periksa sumber gula dan bandingkan pilihan sesuai profil serta anggaran Anda.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <a className="skip-link" href="#main">
          Lewati navigasi
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
