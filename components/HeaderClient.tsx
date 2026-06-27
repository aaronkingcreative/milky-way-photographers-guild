"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/actions";

const logoUrl =
  "https://lzeljgbudkqpbmbbbsex.supabase.co/storage/v1/object/public/site-assets/logos/MWPG_Logo.png";

const navItems = [
  ["Guild Hall", "/guild-hall"],
  ["Gallery", "/feed"],
  ["Field Desk", "/field-desk"],
  ["Progress", "/profile"],
  ["Submit", "/submit"],
];

function isActive(pathname: string, href: string) {
  if (href === "/feed") return pathname === "/feed" || pathname === "/gallery" || pathname.startsWith("/images/");
  if (href === "/profile") return pathname === "/profile" || pathname === "/progress";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderClient({ user, isAdmin, name }: { user: boolean; isAdmin: boolean; name: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "GM";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`mw-app-header ${scrolled ? "mw-app-header-compact" : ""}`}>
      <nav className="mx-auto flex max-w-[1680px] items-center gap-4 px-4 transition-all duration-200 lg:gap-8 lg:px-8">
        <Link href={user ? "/field-desk" : "/"} className="block shrink-0" aria-label="Milky Way Photographers Guild home">
          <Image src={logoUrl} alt="Milky Way Photographers Guild" width={360} height={180} priority className="mw-header-logo h-auto" />
        </Link>
        {user ? (
          <>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 lg:gap-x-7">
              {navItems.map(([label, href]) => (
                <Link key={`${label}-${href}`} href={href} className={`mw-primary-nav-link ${isActive(pathname, href) ? "mw-primary-nav-link-active" : ""}`}>
                  {label}
                </Link>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Link href="/feed" className="hidden rounded-full border border-[#e79f2b]/55 bg-[#e79f2b]/10 px-4 py-2 mw-chip-text text-[#f0bd66] sm:inline-flex">✪ Vote · Closes Sun</Link>
              <Link href="/submit" className="mw-btn-primary mw-submit-image-button rounded-sm px-5 py-3 text-sm">Submit Image</Link>
              {isAdmin && <Link href="/admin" className="hidden mw-meta text-white/45 hover:text-[#f0bd66] md:inline">Admin</Link>}
              <Link href="/profile" className="mw-member-cluster">
                <span className="hidden text-right leading-tight sm:block">
                  <span className="block text-sm font-bold text-white">{name}</span>
                  <span className="flex items-center justify-end gap-2"><span className="mw-chip-text text-[.72rem] text-[#f0bd66]">Veteran</span><span className="rounded-full border border-[#e79f2b]/60 px-2 py-0.5 mw-chip-text text-[.68rem] text-[#f0bd66]">☄ 10y</span></span>
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#e79f2b] bg-[#e79f2b]/10 font-display text-sm text-[#f0bd66]">{initials}</span>
              </Link>
              <form action={signOut}><button className="hidden mw-nav-text text-white/45 hover:text-[#f0bd66] xl:inline">Sign out</button></form>
            </div>
          </>
        ) : (
          <div className="ml-auto flex items-center gap-3"><span className="rounded-full border border-[#e79f2b]/40 px-3 py-1 font-display text-xs uppercase tracking-[.18em] text-[#f0bd66]">Coming soon</span><Link href="/login" className="mw-btn-secondary px-4 py-2 text-xs">Sign in</Link></div>
        )}
      </nav>
    </header>
  );
}
