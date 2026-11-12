"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/actions";
import { titleCaseLabel } from "@/lib/display";
import { IotwVotingModal } from "@/components/iotw/IotwVotingModal";
import { ProfileNudge } from "@/components/ProfileNudge";
import { HeaderNotice } from "@/components/HeaderNotice";
import { NAV_ITEMS as navItems, navItemIsActive as isActive, navPointerShouldClose } from "@/lib/nav-menu";

const logoUrl =
  "https://lzeljgbudkqpbmbbbsex.supabase.co/storage/v1/object/public/site-assets/logos/MWPG_Logo.png";


// The vote gate never covers sign-in pages, the public landing pages or admin tools.
const VOTE_GATE_EXEMPT = ["/login", "/signup", "/auth", "/update-password", "/launch", "/admin"];
function voteGateApplies(pathname: string) {
  if (pathname === "/") return false;
  return !VOTE_GATE_EXEMPT.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}


export function HeaderClient({
  user,
  isAdmin,
  name,
  rankLabel,
  streakLabel,
  avatarUrl,
  iotw,
  needsProfile = false,
  missingName = false,
  missingPhoto = false,
  userId = null,
  pendingClaims = 0,
  reviewNotice = null,
}: {
  user: boolean;
  isAdmin: boolean;
  name: string;
  rankLabel?: string | null;
  streakLabel?: string | null;
  avatarUrl?: string | null;
  iotw?: any;
  needsProfile?: boolean;
  missingName?: boolean;
  missingPhoto?: boolean;
  userId?: string | null;
  /** Admins: achievement claims waiting on the Verification Desk. */
  pendingClaims?: number;
  /** Members: unseen Guild review results with a note or a reassignment. */
  reviewNotice?: { count: number; text: string } | null;
}) {
  const pathname = usePathname();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [voted, setVoted] = useState(Boolean(iotw?.vote));
  const navToggleRef = useRef<HTMLButtonElement>(null);
  const navPanelRef = useRef<HTMLDivElement>(null);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "GM";
  const displayRank = titleCaseLabel(rankLabel);
  const streakYears = Number(String(streakLabel || "").match(/\d+/)?.[0] || 0);
  const displayStreak = streakYears > 0 ? `☄ ${streakYears}-yr streak` : null;
  // The profile prompt waits until the mandatory Image of the Week vote is done, and stays off the profile page itself.
  const voteGateBlocking = Boolean(iotw?.mustVote) && voteGateApplies(pathname);
  const showProfileNudge = user && needsProfile && Boolean(userId) && !voteGateBlocking && voteGateApplies(pathname) && !pathname.startsWith("/profile");

  useEffect(() => {
    const onVoted = () => setVoted(true);
    window.addEventListener("mw:iotw-voted", onVoted);
    return () => window.removeEventListener("mw:iotw-voted", onVoted);
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    const toggle = navToggleRef.current;
    const panel = navPanelRef.current;
    // Focus the panel, not the first link. Moving focus onto a link while Enter
    // is still down activates that link on keyup and closes the menu.
    panel?.setAttribute("tabindex", "-1");
    panel?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setNavOpen(false);
      toggle?.focus();
    }
    function onPointerDown(event: PointerEvent) {
      if (!navPointerShouldClose(event.composedPath(), toggle, panel)) return;
      setNavOpen(false);
    }
    // The opening click has already finished by the time this effect runs.
    // Attach at once so Escape and an outside click are not missed on the next frame.
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [navOpen]);

  return (
    <>
    <header className="mw-app-header">
      <nav className="mw-header-nav mx-auto max-w-[1680px]">
        <div className="mw-header-brand">
          {user && (
            <button ref={navToggleRef} type="button" className={`mw-nav-toggle ${navOpen ? "is-open" : ""}`} aria-label={navOpen ? "Close menu" : "Open menu"} aria-expanded={navOpen} aria-controls="mw-primary-nav" onKeyDown={(event) => { if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return; event.preventDefault(); setNavOpen((open) => !open); }} onClick={(event) => { event.stopPropagation(); if (event.detail === 0) return; setNavOpen((open) => !open); }}>
              <span aria-hidden="true" />
            </button>
          )}
          <Link href={user ? "/guild-hall" : "/"} className="mw-header-logo-link" aria-label="Milky Way Photographers Guild home">
            <Image src={logoUrl} alt="Milky Way Photographers Guild" width={360} height={180} priority unoptimized className="mw-header-logo" />
          </Link>
        </div>
        {user && (
          <div ref={navPanelRef} id="mw-primary-nav" className={`mw-primary-nav ${navOpen ? "is-open" : ""}`}>
            {iotw ? (
              <button type="button" className="mw-nav-vote" onClick={() => { setNavOpen(false); window.dispatchEvent(new Event("mw:open-iotw")); }}>
                {voted ? "✪ Edit Vote" : "✪ Vote"}
              </button>
            ) : null}
            {navItems.map(([label, href]) => {
              const active = isActive(pathname, href);
              return (
                <Link key={`${label}-${href}`} href={href} onClick={() => setNavOpen(false)} aria-current={active ? "page" : undefined} className={`mw-primary-nav-link ${active ? "mw-primary-nav-link-active" : ""}`}>
                  {label}
                </Link>
              );
            })}
          </div>
        )}
        {user ? (
          <>
            <div className="mw-header-actions">
              {iotw ? <IotwVotingModal ballot={iotw.ballot} entries={iotw.entries} existingVote={iotw.vote} entryWeek={iotw.entryWeek} required={Boolean(iotw.mustVote) && voteGateApplies(pathname)} /> : null}
              <Link href="/submit" className="mw-submit-image-button">File a Field Report</Link>
              {isAdmin && <Link href="/admin" className="hidden mw-meta mw-header-admin-link text-white/45 hover:text-[#f0bd66] md:inline">Admin</Link>}
              <div className="mw-account-wrap">
                <Link href="/profile" className="mw-member-cluster" aria-label="Open member profile">
                  <span className="mw-member-copy">
                    <span className="mw-member-name">{name}</span>
                    <span className="mw-member-meta-row">
                      <span className="mw-member-rank">{displayRank}</span>
                      {displayStreak && <span className="mw-streak-pill" title={`${streakYears}-yr Milky Way streak`}>{displayStreak}</span>}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  className={avatarUrl ? "mw-member-avatar" : "mw-member-avatar mw-member-avatar--initials"}
                  aria-label="Open account menu"
                  aria-expanded={accountMenuOpen}
                  onClick={() => setAccountMenuOpen((open) => !open)}
                >
                  {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
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
          <div className="mw-header-actions"><Link href="/login" className="mw-header-signin">Sign in</Link><Link href="/signup" className="mw-header-join">Join free</Link></div>
        )}
      </nav>
      {user && isAdmin && pendingClaims > 0 ? <HeaderNotice id="claims" text={`${pendingClaims} Field Honor claim${pendingClaims === 1 ? "" : "s"} waiting for review`} href="/admin/achievements" cta="Verification Desk" hideOn="/admin/achievements" /> : null}
      {user && reviewNotice && reviewNotice.count > 0 ? <HeaderNotice id="review" text={reviewNotice.text} href="/progress#guild-review" cta="See the note" hideOn="/progress" /> : null}
    </header>
    {showProfileNudge && userId ? <ProfileNudge userId={userId} missingName={missingName} missingPhoto={missingPhoto} /> : null}
    </>
  );
}
