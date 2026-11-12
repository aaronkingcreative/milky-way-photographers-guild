import Link from "next/link";

export function ForumPager({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav className="mw-forum-pager" aria-label="Pages">
      {page > 1 ? <Link href={hrefFor(page - 1)} className="mw-forum-page">Previous</Link> : null}
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <Link key={p} href={hrefFor(p)} className={`mw-forum-page ${p === page ? "is-current" : ""}`} aria-current={p === page ? "page" : undefined}>{p}</Link>
      ))}
      {page < pages ? <Link href={hrefFor(page + 1)} className="mw-forum-page">Next</Link> : null}
    </nav>
  );
}
