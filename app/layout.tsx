import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Live Screencast Relay",
  description: "Playwright live stream playground",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
