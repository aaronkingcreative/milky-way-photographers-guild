import type { Metadata } from "next";import "./globals.css";import { Header } from "@/components/Header";import { Footer } from "@/components/Footer";
export const metadata:Metadata={title:"Milky Way Photographers Guild",description:"A private image-first guild for Milky Way photographers."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Header/><main>{children}</main><Footer/></body></html>}
