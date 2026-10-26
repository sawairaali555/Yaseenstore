import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GharCart | Everyday shopping in Pakistan",
  description: "Shop useful everyday products with cash on delivery across Pakistan.",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
