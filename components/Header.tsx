import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { getSessionState } from "@/lib/supabase/server";

const logoUrl =
  "https://lzeljgbudkqpbmbbbsex.supabase.co/storage/v1/object/public/site-assets/logos/MWPG_Logo.png";

const navItems = [
  ["Guild Hall", "/dashboard"],
  ["Gallery", "/feed"],
  ["Winners", "/winners"],
  ["Resources", "/resources"],
  ["Courses", "/courses"],
];

export async function Header() {
  const { user, isAdmin } = await getSessionState();
  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Guild Member";
  const initial = name.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-[#e79f2b]/25 bg-[#091625]/86 shadow-2xl shadow-black/25 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
        <Link href={user ? "/dashboard" : "/"} className="block w-fit shrink-0" aria-label="Milky Way Photographers Guild home">
          <Image src={logoUrl} alt="Milky Way Photographers Guild" width={360} height={180} priority className="h-auto w-44 sm:w-56" />
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#dbe5f1] lg:justify-end">
          {user ? (
            <>
              {navItems.map(([label, href]) => <Link key={href} href={href} className="nav-link uppercase tracking-[.16em] hover:text-[#f0bd66]">{label}</Link>)}
              {isAdmin && <Link href="/admin" className="nav-link uppercase tracking-[.16em] text-[#f0bd66]">Admin</Link>}
              <Link href="/submit" className="btn btn-primary px-4 py-2 text-xs">Submit Image</Link>
              <Link href="/profile" className="flex items-center gap-2 rounded-full border border-[#e79f2b]/35 bg-[#0d1e30]/80 px-3 py-1.5">
                <span className="grid h-8 w-8 place-items-center rounded-full border border-[#e79f2b] bg-[#06101c] font-display text-[#f0bd66]">{initial}</span>
                <span className="hidden leading-tight sm:block"><span className="block text-white">{name}</span><span className="font-display text-[.65rem] uppercase tracking-[.18em] text-[#f0bd66]">Member</span></span>
              </Link>
              <form action={signOut}><button className="nav-link uppercase tracking-[.16em] text-[#f0bd66]">Sign out</button></form>
            </>
          ) : (
            <>
              <span className="rounded-full border border-[#e79f2b]/40 px-3 py-1 font-display text-xs uppercase tracking-[.18em] text-[#f0bd66]">Coming soon</span>
              <Link href="/" className="nav-link uppercase tracking-[.16em]">Home</Link>
              <Link href="/login" className="btn btn-secondary px-4 py-2 text-xs">Sign in</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
