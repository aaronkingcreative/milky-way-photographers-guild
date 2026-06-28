import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthHashHandler } from "@/components/auth/AuthHashHandler";

const faviconUrl =
  "https://lzeljgbudkqpbmbbbsex.supabase.co/storage/v1/object/public/site-assets/logos/MWPG_Logo_FAVICON.png";

export const metadata: Metadata = {
  title: "Milky Way Photographers Guild",
  description: "A private image-first guild for Milky Way photographers.",
  icons: {
    icon: faviconUrl,
    shortcut: faviconUrl,
    apple: faviconUrl,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthHashHandler />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
