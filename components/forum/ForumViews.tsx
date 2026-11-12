import Link from "next/link";
import { FORUM_CATEGORIES, forumAgo } from "@/lib/forum";
import type { MemberLite } from "@/lib/members";
import { ForumCrumbs, ForumHead } from "@/components/forum/ForumHead";
import { ThreadList, type ThreadRowData } from "@/components/forum/ThreadList";
import { ForumPager } from "@/components/forum/ForumPager";

export type CategoryStats = Map<string, { threads: number; posts: number; last: string | null }>;

export function ForumHomeView({ threads, people, stats, removed }: { threads: ThreadRowData[]; people: Map<string, MemberLite>; stats: CategoryStats; removed: boolean }) {
  return (
    <section className="mw-forum-shell">
      <ForumHead
        eyebrow="The Guild Forum"
        title="Forum"
        subtitle={<>Long form talk about gear, technique, locations and trips. Members&nbsp;only.</>}
        action={<Link href="/forum/new" className="mw-submit-image-button">Start a Discussion</Link>}
      />
      {removed ? <p className="mw-forum-note" role="status">The post was removed.</p> : null}

      <h2 className="mw-forum-section-label">Categories</h2>
      <ul className="mw-forum-cats">
        {FORUM_CATEGORIES.map((c) => {
          const s = stats.get(c.slug);
          return (
            <li key={c.slug}>
              <Link href={`/forum/${c.slug}`} className="mw-forum-cat">
                <span className="mw-forum-cat-name">{c.label}</span>
                <span className="mw-forum-cat-blurb">{c.blurb}</span>
                <span className="mw-forum-cat-stats">{s ? <>{s.threads} {s.threads === 1 ? "discussion" : "discussions"}<span className="mw-forum-dot" aria-hidden="true">·</span>{s.last ? forumAgo(s.last) : ""}</> : "No discussions yet"}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="mw-forum-section-label">Latest Discussions</h2>
      {threads.length ? <ThreadList threads={threads} people={people} /> : (
        <div className="mw-forum-empty">
          <p className="mw-forum-empty-title">The Forum is open and waiting for its first discussion.</p>
          <p>Ask about a lens, share a dark site, or plan a night out with other members.</p>
          <Link href="/forum/new" className="mw-btn-primary mw-forum-submit">Start the First Discussion</Link>
        </div>
      )}
    </section>
  );
}

export function ForumCategoryView({ category, threads, people, page, pages }: { category: { slug: string; label: string; blurb: string }; threads: ThreadRowData[]; people: Map<string, MemberLite>; page: number; pages: number }) {
  return (
    <section className="mw-forum-shell">
      <ForumCrumbs items={[{ label: "Forum", href: "/forum" }, { label: category.label }]} />
      <ForumHead
        eyebrow="The Guild Forum"
        title={category.label}
        subtitle={category.blurb}
        action={<Link href={`/forum/new?category=${category.slug}`} className="mw-submit-image-button">Start a Discussion</Link>}
      />
      {threads.length ? (
        <>
          <ThreadList threads={threads} people={people} showCategory={false} />
          <ForumPager page={page} pages={pages} hrefFor={(p) => `/forum/${category.slug}${p > 1 ? `?page=${p}` : ""}`} />
        </>
      ) : (
        <div className="mw-forum-empty">
          <p className="mw-forum-empty-title">No discussions in {category.label} yet.</p>
          <p>{category.blurb} Be the one who gets it&nbsp;started.</p>
          <Link href={`/forum/new?category=${category.slug}`} className="mw-btn-primary mw-forum-submit">Start a {category.label}&nbsp;Discussion</Link>
        </div>
      )}
    </section>
  );
}
