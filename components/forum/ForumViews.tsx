import Link from "next/link";
import { forumAgo } from "@/lib/forum";
import { keepLastTwo } from "@/lib/keep-last-two";
import type { MemberLite } from "@/lib/members";
import type { ForumIndexData, ForumLatest } from "@/lib/forum-index";
import { ForumCrumbs, ForumHead } from "@/components/forum/ForumHead";
import { ThreadList, type ThreadRowData } from "@/components/forum/ThreadList";
import { ForumPager } from "@/components/forum/ForumPager";
import { ForumCategoryIcon, LockIcon } from "@/components/forum/ForumIcons";

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("en-US")}\u00A0${n === 1 ? one : many}`;
}

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
  const { categories, latest, totals } = data;
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
                <span className="mw-forum-box-latest is-empty">
                  <span className="mw-forum-box-empty-title">No topics yet</span>
                  <span className="mw-forum-box-latest-words">{c.isPrivate ? <>Be the first to plan a&nbsp;trip.</> : <>Be the first to start&nbsp;one.</>}</span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <section className="mw-forum-glance" aria-labelledby="forum-glance-heading">
        <h2 id="forum-glance-heading" className="mw-forum-section-label">The Forum at a Glance</h2>
        <div className="mw-forum-glance-grid">
          <div className="mw-forum-glance-totals">
            <p className="mw-forum-glance-big"><b>{totals.topics.toLocaleString("en-US")}</b> {totals.topics === 1 ? "topic" : "topics"} <span className="mw-forum-dot" aria-hidden="true">·</span> <b>{totals.posts.toLocaleString("en-US")}</b> {totals.posts === 1 ? "post" : "posts"}</p>
            <ul className="mw-forum-glance-list">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/forum/${c.slug}`}>{c.label}</Link>
                  <span>{plural(c.topics, "topic", "topics")}</span>
                  <span>{plural(c.posts, "post", "posts")}</span>
                </li>
              ))}
            </ul>
          </div>
          {latest ? (
            <Link href={`/forum/t/${latest.threadId}`} className="mw-forum-glance-latest">
              <span className="mw-forum-box-latest-label">Most recent {latest.isPrivate ? "trip" : "post"} <span className="mw-forum-glance-cat">in {latest.categoryLabel}</span></span>
              <span className="mw-forum-glance-title">{latest.isPrivate ? <span className="mw-forum-lock"><LockIcon size={14} /></span> : null}{keepLastTwo(latest.title)}</span>
              {latest.words ? <span className="mw-forum-glance-words">{latest.words}</span> : null}
              <span className="mw-forum-box-latest-by"><MiniAvatar member={latest.author} /><span><b>{latest.author.name}</b><span className="mw-forum-dot" aria-hidden="true">·</span><time dateTime={latest.at}>{forumAgo(latest.at)}</time></span></span>
            </Link>
          ) : (
            <div className="mw-forum-glance-latest is-empty">
              <span className="mw-forum-glance-title">The Forum is open and waiting for its first&nbsp;topic.</span>
              <Link href="/forum/new" className="mw-btn-primary mw-forum-submit">Start the First Discussion</Link>
            </div>
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
