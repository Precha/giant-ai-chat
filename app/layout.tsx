import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giant AI Chat Widget — Demo",
  description: "Universal AI chat widget for Giant Bicycles — works on any website, Shopify, or SFCC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }} suppressHydrationWarning>{children}</body>
    </html>
  );
}
