import Link from "next/link";
import { keepLastTwo } from "@/lib/keep-last-two";
import { forumExcerpt, forumPostHref, forumStamp, type ForumAuthor } from "@/lib/forum";
import { ForumCrumbs } from "@/components/forum/ForumHead";
import { ForumBody } from "@/components/forum/ForumBody";
import { AuthorPanel } from "@/components/forum/AuthorPanel";
import { PostMain } from "@/components/forum/PostMain";
import { ReplyComposer } from "@/components/forum/ReplyComposer";
import { ForumPager } from "@/components/forum/ForumPager";
import type { OwnPhoto } from "@/components/forum/PhotoPicker";
import { moderateThread } from "@/app/forum/actions";

export type ThreadViewProps = {
  thread: any;
  category: { slug: string; label: string } | null;
  posts: any[];
  indexOf: Map<string, number>;
  openingVisible: boolean;
  postCount: number;
  page: number;
  pages: number;
  quoted: Map<string, any>;
  images: Map<string, any>;
  authors: Map<string, ForumAuthor>;
  photos: OwnPhoto[];
  viewerId: string | null;
  isAdmin: boolean;
  error?: string | null;
};

/** One discussion. The opening post, then every reply in order, each a full rectangle on alternating backgrounds. */
export function ThreadView({ thread, category, posts, indexOf, openingVisible, postCount, page, pages, quoted, images, authors, photos, viewerId, isAdmin, error = null }: ThreadViewProps) {
  const threadId = thread.id;
  const shift = openingVisible ? 0 : 1;
  const pageHref = (p: number) => `/forum/t/${threadId}${p > 1 ? `?page=${p}` : ""}`;
  return (
    <section className="mw-forum-shell">
      <ForumCrumbs items={[{ label: "Forum", href: "/forum" }, ...(category ? [{ label: category.label, href: `/forum/${category.slug}` }] : [])]} />
      <header className="mw-forum-thread-head">
        <h1 className="mw-guild-page-title mw-forum-thread-h1">{keepLastTwo(thread.title)}</h1>
        <p className="mw-forum-thread-sub">
          {thread.pinned ? <span className="mw-forum-flag is-pin">Pinned</span> : null}
          {thread.locked ? <span className="mw-forum-flag">Locked</span> : null}
          {thread.deleted_at ? <span className="mw-forum-flag is-removed">Removed</span> : null}
          <span>{postCount} {postCount === 1 ? "post" : "posts"}</span>
          {!thread.locked ? <a href="#reply" className="mw-forum-jump">Jump to reply</a> : null}
        </p>
        {isAdmin ? (
          <form action={moderateThread} className="mw-forum-admin">
            <input type="hidden" name="thread_id" value={thread.id} />
            <span className="mw-forum-admin-label">Admin</span>
            <button name="action" value={thread.pinned ? "unpin" : "pin"} className="mw-forum-tool">{thread.pinned ? "Unpin" : "Pin"}</button>
            <button name="action" value={thread.locked ? "unlock" : "lock"} className="mw-forum-tool">{thread.locked ? "Unlock" : "Lock"}</button>
            {thread.deleted_at ? <button name="action" value="restore" className="mw-forum-tool">Restore</button> : <button name="action" value="remove" className="mw-forum-tool is-report">Remove discussion</button>}
          </form>
        ) : null}
      </header>
      {error === "delete" ? <p className="mw-forum-error" role="alert">That post could not be deleted. Please try again.</p> : null}
      <ForumPager page={page} pages={pages} hrefFor={pageHref} />

      <div className="mw-forum-posts">
        {page === 1 && !openingVisible ? <div className="mw-forum-post is-a mw-forum-post-removed">The opening post was removed. The replies are still here.</div> : null}
        {posts.map((post: any) => {
          const index = indexOf.get(post.id) ?? 0;
          const author = authors.get(post.user_id)!;
          const q = post.quote_post_id ? quoted.get(post.quote_post_id) : null;
          const qAuthor = q ? authors.get(q.user_id) : null;
          const image = post.image_id ? images.get(post.image_id) : null;
          const own = post.user_id === viewerId;
          return (
            <article key={post.id} id={`post-${post.id}`} className={`mw-forum-post ${(index + shift) % 2 === 0 ? "is-a" : "is-b"} ${post.is_opening ? "is-opening" : ""}`}>
              <AuthorPanel author={author} viewerId={viewerId} isStarter={!post.is_opening && post.user_id === thread.user_id} />
              <PostMain
                postId={post.id}
                threadId={thread.id}
                body={post.body}
                title={post.is_opening && own ? thread.title : null}
                imageId={post.image_id}
                quote={{ postId: post.id, author: author.name, excerpt: forumExcerpt(post.body, 280) }}
                canEdit={own}
                canDelete={own || isAdmin}
                canReport={!own}
                canQuote={!thread.locked || isAdmin}
                photos={own ? photos : []}
              >
                <p className="mw-forum-post-meta">
                  <a href={`#post-${post.id}`} className="mw-forum-permalink">#{index + 1}</a>
                  <time dateTime={post.created_at}>{forumStamp(post.created_at)}</time>
                  {post.edited_at ? <span className="mw-forum-edited" title={`Edited ${forumStamp(post.edited_at)}`}>edited</span> : null}
                </p>
                {post.quote_post_id ? (
                  q ? (
                    <blockquote className="mw-forum-quote">
                      <Link href={forumPostHref(thread.id, q.id, indexOf.get(q.id) ?? 0)} className="mw-forum-quote-head">{qAuthor?.name || "Guild Member"} wrote <span aria-hidden="true">↑</span></Link>
                      <p className="mw-forum-quote-text">{forumExcerpt(q.body, 420)}</p>
                    </blockquote>
                  ) : <blockquote className="mw-forum-quote is-gone"><p className="mw-forum-quote-text">Quoting a post that was removed.</p></blockquote>
                ) : null}
                <ForumBody body={post.body} />
                {image ? (
                  <Link href={`/images/${image.id}`} className="mw-forum-attached">
                    {image.image_url ? <img src={image.image_url} alt={image.title || "Guild photo"} loading="lazy" /> : null}
                    <span>{image.title || "Untitled"}</span>
                  </Link>
                ) : null}
              </PostMain>
            </article>
          );
        })}
      </div>

      <ForumPager page={page} pages={pages} hrefFor={pageHref} />
      <ReplyComposer threadId={thread.id} photos={photos} viewer={viewerId ? authors.get(viewerId) || null : null} nextIsA={(postCount + shift) % 2 === 0} locked={Boolean(thread.locked && !isAdmin) || Boolean(thread.deleted_at)} />
    </section>
  );
}
