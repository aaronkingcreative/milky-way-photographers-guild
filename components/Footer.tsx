import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-[#e79f2b]/20 bg-[#06101c]/70 px-5 py-12 text-center">
      <p className="mw-section-label text-[#f0bd66]">Milky Way Photographers Guild</p>
      <p className="mt-3 text-base leading-7 text-[#d5deea]">© {new Date().getFullYear()} Founded by Aaron King of Photog Adventures · A private dark-sky field hall for image makers.</p>
      <nav aria-label="Policies" className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-base">
        <Link className="text-[#f6e2b0] underline-offset-4 hover:underline" href="/privacy">Privacy</Link>
        <Link className="text-[#f6e2b0] underline-offset-4 hover:underline" href="/terms">Terms</Link>
      </nav>
    </footer>
  );
}
