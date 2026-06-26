import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { getSessionState } from "@/lib/supabase/server";

const logoUrl =
  "https://lzeljgbudkqpbmbbbsex.supabase.co/storage/v1/object/public/site-assets/logos/MWPG_Logo.png";

export async function Header() {
  const { user, isAdmin } = await getSessionState();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.12] bg-[#091625]/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <Link href="/" className="block w-fit shrink-0" aria-label="Milky Way Photographers Guild home">
          <Image
            src={logoUrl}
            alt="Milky Way Photographers Guild"
            width={360}
            height={180}
            priority
            className="h-auto w-44 sm:w-56 lg:w-72"
          />
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pb-1 text-sm text-[#dbe5f1] sm:justify-end">
          {user ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/feed">Feed</Link>
              <Link href="/submit">Submit</Link>
              <Link href="/winners">Winners</Link>
              <Link href="/resources">Resources</Link>
              <Link href="/courses">Courses</Link>
              {isAdmin && <Link href="/admin">Admin</Link>}
              <form action={signOut}>
                <button className="text-[#f4bd61]">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <span className="rounded-full border border-[#e79f2b]/40 px-3 py-1 text-xs font-bold uppercase tracking-[.18em] text-[#f4bd61]">
                Coming soon
              </span>
              <Link href="/">Home</Link>
              <Link href="/login">Sign in</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
