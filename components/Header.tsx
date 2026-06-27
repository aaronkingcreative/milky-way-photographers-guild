import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { getSessionState } from "@/lib/supabase/server";

const logoUrl =
  "https://lzeljgbudkqpbmbbbsex.supabase.co/storage/v1/object/public/site-assets/logos/MWPG_Logo.png";

const navItems = [
  ["Guild Hall", "/dashboard"],
  ["Gallery", "/feed"],
  ["Field Desk", "/dashboard"],
  ["Progress", "/profile"],
  ["Submit", "/submit"],
];

export async function Header() {
  const { user, isAdmin } = await getSessionState();
  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Guild Member";
  const initial = name.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-[#e79f2b]/20 bg-[#081321]/86 shadow-2xl shadow-black/25 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-[1680px] items-center gap-5 px-5 py-3 lg:gap-8 lg:px-10">
        <Link href={user ? "/dashboard" : "/"} className="block shrink-0" aria-label="Milky Way Photographers Guild home">
          <Image src={logoUrl} alt="Milky Way Photographers Guild" width={360} height={180} priority className="h-auto w-36 sm:w-44" />
        </Link>
        {user ? (
          <>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#dbe5f1] lg:gap-x-7">
              {navItems.map(([label, href]) => <Link key={`${label}-${href}`} href={href} className="nav-link pb-1 uppercase tracking-[.16em] text-white/78 hover:text-[#f0bd66]">{label}</Link>)}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Link href="/feed" className="hidden rounded-full border border-[#e79f2b]/45 bg-[#e79f2b]/10 px-4 py-2 font-display text-xs uppercase tracking-[.08em] text-[#f0bd66] sm:inline-flex">✪ Vote</Link>
              <Link href="/submit" className="btn btn-primary rounded-sm px-4 py-2 text-xs">Submit Image</Link>
              {isAdmin && <Link href="/admin" className="hidden font-display text-xs uppercase tracking-[.16em] text-white/45 hover:text-[#f0bd66] md:inline">Admin</Link>}
              <Link href="/profile" className="flex items-center gap-3 border-l border-white/10 pl-3">
                <span className="hidden text-right leading-tight sm:block"><span className="block text-sm font-bold text-white">{name}</span><span className="font-display text-[.72rem] uppercase tracking-[.08em] text-[#f0bd66]">Member</span></span>
                <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#e79f2b] bg-[#e79f2b]/15 font-display text-[#f0bd66]">{initial}</span>
              </Link>
              <form action={signOut}><button className="hidden nav-link uppercase tracking-[.14em] text-white/45 hover:text-[#f0bd66] lg:inline">Sign out</button></form>
            </div>
          </>
        ) : (
          <div className="ml-auto flex items-center gap-3"><span className="rounded-full border border-[#e79f2b]/40 px-3 py-1 font-display text-xs uppercase tracking-[.18em] text-[#f0bd66]">Coming soon</span><Link href="/login" className="btn btn-secondary px-4 py-2 text-xs">Sign in</Link></div>
        )}
      </nav>
    </header>
  );
}
