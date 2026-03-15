import type { Metadata } from "next";
import "./globals.css";
import { SpatialDetector } from "@/components/SpatialDetector";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "SceneForge — Relive Your Memories in 3D",
  description:
    "Voice-powered AI that transforms your photo memories into explorable 3D worlds using Marble AI",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="bg-(--bg-main) text-(--text-main) antialiased min-h-screen">
        <SpatialDetector />
        {children}
      </body>
    </html>
  );
}
