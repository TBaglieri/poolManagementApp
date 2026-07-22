import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PoolOps Pro — Aquatics Operations Platform",
    template: "%s · PoolOps Pro",
  },
  description:
    "PoolOps Pro is the all-in-one operations platform for community pools, swim clubs, camps, and aquatic centers — scheduling, time clock, chemical logs, certifications, onboarding, and more.",
  applicationName: "PoolOps Pro",
  authors: [{ name: "PoolOps Pro" }],
  keywords: ["aquatics", "pool management", "lifeguard scheduling", "chemical logs", "swim lessons"],
};

export const viewport: Viewport = {
  themeColor: "#0E7490",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full font-sans antialiased">{children}</body>
    </html>
  );
}
