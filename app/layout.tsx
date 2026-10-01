import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fuse PDF – Merge PDFs in Your Browser",
  description: "Free, private, client-side PDF merger. Files never leave your device.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}