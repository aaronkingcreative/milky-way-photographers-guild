import Link from "next/link";
import { forumAgo, forumRankTier } from "@/lib/forum";
import { keepLastTwo } from "@/lib/keep-last-two";
import type { MemberLite } from "@/lib/members";
import type { ForumIndexData, ForumLatest } from "@/lib/forum-index";
import { ForumCrumbs, ForumHead } from "@/components/forum/ForumHead";
import { ThreadList, type ThreadRowData } from "@/components/forum/ThreadList";
import { ForumPager } from "@/components/forum/ForumPager";
import { ForumCategoryIcon, LockIcon } from "@/components/forum/ForumIcons";

function MiniAvatar({ member }: { member: MemberLite }) {
  return <span className="mw-forum-mini-avatar" aria-hidden="true">{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : <span>{member.initials}</span>}</span>;
}

/** The newest post in a category. A private trip shows its public teaser and organizer, never its posts. */
function LatestBlock({ latest }: { latest: ForumLatest }) {
  return (
    <span className="mw-forum-box-latest">
      <span className="mw-forum-box-latest-label">{latest.isPrivate ? "Newest trip" : "Latest post"}</span>
      <span className="mw-forum-box-latest-title">{latest.isPrivate ? <span className="mw-forum-lock"><LockIcon size={12} /></span> : null}{keepLastTwo(latest.title)}</span>
      {latest.words ? <span className="mw-forum-box-latest-words">{latest.words}</span> : null}
      <span className="mw-forum-box-latest-by">
        <MiniAvatar member={latest.author} />
        <span><b>{latest.author.name}</b><span className="mw-forum-dot" aria-hidden="true">·</span><time dateTime={latest.at}>{forumAgo(latest.at)}</time></span>
      </span>
    </span>
  );
}

export function ForumHomeView({ data, removed }: { data: ForumIndexData; removed: boolean }) {
  const { categories, latest, totals, top } = data;
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
      <ul className="mw-forum-boxes">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/forum/${c.slug}`} className={`mw-forum-box${c.latest ? "" : " is-empty"}`}>
              <span className="mw-forum-box-icon"><ForumCategoryIcon slug={c.slug} /></span>
              <span className="mw-forum-box-copy">
                <span className="mw-forum-box-name">{c.label}{c.isPrivate ? <span className="mw-forum-box-private"><LockIcon size={11} />Private threads</span> : null}</span>
                <span className="mw-forum-box-blurb">{c.blurb}</span>
              </span>
              <span className="mw-forum-box-stats" aria-label={`${c.topics} topics, ${c.posts} posts`}>
                <span className="mw-forum-box-stat"><b>{c.topics.toLocaleString("en-US")}</b><span>{c.topics === 1 ? "Topic" : "Topics"}</span></span>
                <span className="mw-forum-box-stat"><b>{c.posts.toLocaleString("en-US")}</b><span>{c.posts === 1 ? "Post" : "Posts"}</span></span>
              </span>
              {c.latest ? <LatestBlock latest={c.latest} /> : (
                <span className="mw-forum-box-latest is-empty"><span className="mw-forum-box-empty-title">No topics yet</span></span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {top.length ? (
        <section className="mw-forum-top" aria-labelledby="forum-top-heading">
          <h2 id="forum-top-heading" className="mw-forum-section-label">Top of the Guild</h2>
          <ol className="mw-forum-top-row">
            {top.map((m, i) => {
              const tier = forumRankTier(m.rank);
              return (
                <li key={m.id} className={`mw-forum-top-member tier-${tier}`}>
                  <Link href={`/members/${m.id}`} className="mw-forum-top-link">
                    <span className="mw-forum-top-place" aria-label={`Number ${i + 1}`}>{i + 1}</span>
                    <span className="mw-forum-top-avatar" aria-hidden="true">{m.avatarUrl ? <img src={m.avatarUrl} alt="" /> : <span>{m.initials}</span>}</span>
                    <span className="mw-forum-top-copy">
                      <span className="mw-forum-top-name">{m.name}</span>
                      <span className="mw-forum-top-meta"><span className={`mw-forum-rank-chip tier-${tier}`}>{m.rank}</span><span className="mw-forum-top-honors"><b>{m.honors}</b>&nbsp;Honors</span></span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <section className="mw-forum-glance" aria-labelledby="forum-glance-heading">
        <h2 id="forum-glance-heading" className="mw-forum-section-label">The Forum at a Glance</h2>
        <div className="mw-forum-glance-bar">
          <p className="mw-forum-glance-line">
            <span className="mw-forum-glance-total"><b>{totals.topics.toLocaleString("en-US")}</b>&nbsp;{totals.topics === 1 ? "topic" : "topics"}, <b>{totals.posts.toLocaleString("en-US")}</b>&nbsp;{totals.posts === 1 ? "post" : "posts"}</span>
            <span className="mw-forum-glance-cats">
              {categories.map((c, i) => (
                <span key={c.slug}><Link href={`/forum/${c.slug}`}><b>{c.topics.toLocaleString("en-US")}</b>&nbsp;{c.label}</Link>{i < categories.length - 1 ? ", " : ""}</span>
              ))}
            </span>
          </p>
          {latest ? (
            <p className="mw-forum-glance-line is-latest">
              <span className="mw-forum-box-latest-label">Newest</span>
              <Link href={`/forum/t/${latest.threadId}`} className="mw-forum-glance-title">{latest.isPrivate ? <span className="mw-forum-lock"><LockIcon size={12} /></span> : null}{latest.title}</Link>
              {latest.words ? <span className="mw-forum-glance-words">{latest.words}</span> : null}
              <span className="mw-forum-glance-by"><MiniAvatar member={latest.author} /><b>{latest.author.name}</b><span className="mw-forum-dot" aria-hidden="true">·</span><time dateTime={latest.at}>{forumAgo(latest.at)}</time></span>
            </p>
          ) : (
            <p className="mw-forum-glance-line is-latest"><span className="mw-forum-glance-words">The Forum is open and waiting for its first&nbsp;topic.</span> <Link href="/forum/new" className="mw-forum-glance-title">Start the first&nbsp;discussion</Link></p>
          )}
        </div>
      </section>
    </section>
  );
}

export function ForumCategoryView({ category, threads, people, page, pages }: { category: { slug: string; label: string; blurb: string; private?: boolean }; threads: ThreadRowData[]; people: Map<string, MemberLite>; page: number; pages: number }) {
  const startLabel = category.private ? "Plan a Trip" : "Start a Discussion";
  return (
    <section className="mw-forum-shell">
      <ForumCrumbs items={[{ label: "Forum", href: "/forum" }, { label: category.label }]} />
      <ForumHead
        eyebrow="The Guild Forum"
        title={category.label}
        subtitle={category.private ? <>{category.blurb} Each trip shows its title and teaser. The organizer decides who gets&nbsp;in.</> : category.blurb}
        action={<Link href={`/forum/new?category=${category.slug}`} className="mw-submit-image-button">{startLabel}</Link>}
      />
      {threads.length ? (
        <>
          <ThreadList threads={threads} people={people} showCategory={false} />
          <ForumPager page={page} pages={pages} hrefFor={(p) => `/forum/${category.slug}${p > 1 ? `?page=${p}` : ""}`} />
        </>
      ) : (
        <div className="mw-forum-empty">
          <p className="mw-forum-empty-title">No topics in {category.label}&nbsp;yet.</p>
          <p>{category.blurb} Be the one who gets it&nbsp;started.</p>
          <Link href={`/forum/new?category=${category.slug}`} className="mw-btn-primary mw-forum-submit">{startLabel}</Link>
        </div>
      )}
    </section>
  );
}
