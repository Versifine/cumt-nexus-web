import type { Metadata } from "next";
import Script from "next/script";

import { Providers } from "@/app/providers";
import { Toaster } from "@/components/ui/sonner";
import { getSiteUrl } from "@/lib/site-url";

import "katex/dist/katex.min.css";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "./globals.css";
import "./lightbox-overrides.css";

const siteUrl = getSiteUrl();
const siteDescription = "面向校园社区的讨论、发帖和社区申请工作区。";
const themeBootScript = `
(() => {
  try {
    const storedTheme = window.localStorage.getItem("cumt-nexus:theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : storedTheme === "system"
        ? prefersDark
          ? "dark"
          : "light"
        : "dark";
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  } catch {
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;

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
      <head>
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
      </head>
      <body>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
