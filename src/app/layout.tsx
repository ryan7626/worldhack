import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memory Reliver — Relive Your Memories in 3D",
  description:
    "Voice-powered AI that transforms your photo memories into explorable 3D worlds using Marble AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-(--bg-main) text-(--text-main) antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
