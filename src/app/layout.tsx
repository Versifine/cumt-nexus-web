import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "CUMT Nexus",
  description: "Campus community workspace for CUMT Nexus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
