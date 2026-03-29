import type { Metadata } from "next";
import "./globals.css";
import { PlatformProvider } from "@/components/platform-provider";

export const metadata: Metadata = {
  title: "FraudGuard AI",
  description: "AI-powered fraud detection platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <PlatformProvider>{children}</PlatformProvider>
      </body>
    </html>
  );
}
