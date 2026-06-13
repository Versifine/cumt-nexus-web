import type { Metadata } from "next";

import { Providers } from "@/app/providers";
import { Toaster } from "@/components/ui/sonner";
import { getSiteUrl } from "@/lib/site-url";

import "./globals.css";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

const siteUrl = getSiteUrl();
const siteDescription = "面向校园社区的讨论、发帖和社区申请工作区。";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "CUMT Nexus",
  title: {
    default: "CUMT Nexus",
    template: "%s | CUMT Nexus",
  },
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "CUMT Nexus",
    description: siteDescription,
    locale: "zh_CN",
    siteName: "CUMT Nexus",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "CUMT Nexus",
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
