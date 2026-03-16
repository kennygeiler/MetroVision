import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-body-family",
});

const jetBrainsMono = JetBrains_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-mono-family",
});

export const metadata: Metadata = {
  title: "SceneDeck",
  description: "A searchable cinema shot metadata database for camera movement analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetBrainsMono.variable} antialiased`}>
        <div className="min-h-screen bg-[var(--color-surface-primary)] text-[var(--color-text-primary)]">
          {children}
        </div>
      </body>
    </html>
  );
}
