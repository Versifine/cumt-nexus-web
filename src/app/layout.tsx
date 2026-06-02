import type { Metadata } from "next";

import { Providers } from "@/app/providers";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "CUMT Nexus",
  title: {
    default: "CUMT Nexus",
    template: "%s | CUMT Nexus",
  },
  description: "面向校园社区的讨论、发帖和社区申请工作区。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
