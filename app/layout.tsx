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
      <body>
        <AuthHashHandler />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
