import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pynaro MVP",
  description:
    "Find and book the nearest available verified service professional.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
