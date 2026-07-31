import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "X3roxDev_oauth",
  description: "A lightweight Discord OAuth login demo built with Next.js."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
