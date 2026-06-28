"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/actions";

const logoUrl =
  "https://lzeljgbudkqpbmbbbsex.supabase.co/storage/v1/object/public/site-assets/logos/MWPG_Logo.png";

const navItems = [
  ["Guild Hall", "/guild-hall"],
  ["Gallery", "/feed"],
  ["Field Desk", "/field-desk"],
  ["Progress", "/profile"],
];

function isActive(pathname: string, href: string) {
  if (href === "/feed") return pathname === "/feed" || pathname === "/gallery" || pathname.startsWith("/images/");
  if (href === "/profile") return pathname === "/profile" || pathname === "/progress";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function normalizeStreakLabel(label?: string | null) {
  if (!label) return null;
  const normalized = label.replace(/☄/g, "").replace(/(\d+)\s*y\b/i, "$1 y").replace(/\bY\b/g, "y").trim();
  return normalized ? `☄ ${normalized}` : null;
}

export function HeaderClient({
  user,
  isAdmin,
  name,
  rankLabel,
  streakLabel,
}: {
  user: boolean;
  isAdmin: boolean;
  name: string;
  rankLabel?: string | null;
  streakLabel?: string | null;
}) {
  const pathname = usePathname();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "GM";
  const displayRank = rankLabel || "Veteran";
  const displayStreak = normalizeStreakLabel(streakLabel) || "☄ 10 y";

  return (
    <header className="mw-app-header">
      <nav className="mw-header-nav mx-auto max-w-[1680px] px-4 lg:px-8">
        <div className="mw-header-left-group">
          <Link href={user ? "/field-desk" : "/"} className="mw-header-logo-link" aria-label="Milky Way Photographers Guild home">
            <Image src={logoUrl} alt="Milky Way Photographers Guild" width={360} height={180} priority className="mw-header-logo h-auto" />
          </Link>
          {user && (
            <div className="mw-primary-nav">
              {navItems.map(([label, href]) => (
                <Link key={`${label}-${href}`} href={href} className={`mw-primary-nav-link ${isActive(pathname, href) ? "mw-primary-nav-link-active" : ""}`}>
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
        {user ? (
          <>
            <div className="mw-header-actions">
              <Link href="/feed" className="mw-vote-chip">✪ Vote · closes Sun</Link>
              <Link href="/submit" className="mw-submit-image-button">Submit Image</Link>
              {isAdmin && <Link href="/admin" className="hidden mw-meta text-white/45 hover:text-[#f0bd66] md:inline">Admin</Link>}
              <div className="mw-account-wrap">
                <Link href="/profile" className="mw-member-cluster" aria-label="Open member profile">
                  <span className="mw-member-copy">
                    <span className="mw-member-name">{name}</span>
                    <span className="mw-member-meta-row">
                      <span className="mw-member-rank">{displayRank}</span>
                      {displayStreak && <span className="mw-streak-pill">{displayStreak}</span>}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  className="mw-member-avatar"
                  aria-label="Open account menu"
                  aria-expanded={accountMenuOpen}
                  onClick={() => setAccountMenuOpen((open) => !open)}
                >
                  {initials}
                </button>
                {accountMenuOpen && (
                  <div className="mw-account-menu">
                    <Link href="/profile" onClick={() => setAccountMenuOpen(false)}>Profile settings</Link>
                    <form action={signOut}><button type="submit">Sign out</button></form>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="ml-auto flex items-center gap-3"><span className="rounded-full border border-[#e79f2b]/40 px-3 py-1 font-display text-xs uppercase tracking-[.18em] text-[#f0bd66]">Coming soon</span><Link href="/login" className="mw-btn-secondary px-4 py-2 text-xs">Sign in</Link></div>
        )}
      </nav>
    </header>
  );
}
