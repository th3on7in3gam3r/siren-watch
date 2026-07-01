import type { Metadata, Viewport } from "next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { MonitoringInit } from "@/components/MonitoringInit";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sirenwatch.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Siren Watch — live siren detection",
  description:
    "Listens for emergency siren patterns nearby and alerts you with flash, vibration, and notifications. All audio stays on your device.",
  manifest: "/manifest.webmanifest",
  applicationName: "Siren Watch",
  openGraph: {
    title: "Siren Watch — live siren detection",
    description:
      "On-device emergency siren detection with flash and vibration alerts for deaf and hard-of-hearing users.",
    url: siteUrl,
    siteName: "Siren Watch",
    type: "website",
    images: [
      {
        url: "/icons/og-image.png",
        width: 1200,
        height: 630,
        alt: "Siren Watch — live acoustic monitor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Siren Watch — live siren detection",
    description:
      "On-device emergency siren detection with flash and vibration alerts.",
    images: ["/icons/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Siren Watch",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0E14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-mono antialiased">
        <MonitoringInit />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
