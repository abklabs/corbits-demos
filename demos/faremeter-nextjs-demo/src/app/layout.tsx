import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Faremeter Next.js Demo",
  description: "Next.js demo with Faremeter x402 payment protocol",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
