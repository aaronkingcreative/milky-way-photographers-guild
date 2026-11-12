import Link from "next/link";
import { forumAgo, forumCategory, forumFirstWords } from "@/lib/forum";
import { keepLastTwo } from "@/lib/keep-last-two";
import type { MemberLite } from "@/lib/members";
import { LockIcon } from "@/components/forum/ForumIcons";

export type ThreadRowData = { id: string; title: string; category: string; user_id: string; created_at: string; last_post_at: string; last_post_user_id: string | null; reply_count: number; pinned: boolean; locked: boolean; is_private?: boolean; teaser?: string | null };

export function ThreadList({ threads, people, showCategory = true }: { threads: ThreadRowData[]; people: Map<string, MemberLite>; showCategory?: boolean }) {
  return (
    <ol className="mw-forum-threads">
      {threads.map((t) => {
        const starter = people.get(t.user_id);
        const last = t.last_post_user_id ? people.get(t.last_post_user_id) : null;
        const category = forumCategory(t.category);
        return (
          <li key={t.id} className={`mw-forum-thread${t.is_private ? " is-private" : ""}`}>
            <Link href={`/forum/t/${t.id}`} className="mw-forum-thread-link">
              <span className="mw-forum-thread-avatar" aria-hidden="true">{starter?.avatarUrl ? <img src={starter.avatarUrl} alt="" /> : <span>{starter?.initials || "GM"}</span>}</span>
              <span className="mw-forum-thread-main">
                <span className="mw-forum-thread-title">
                  {t.pinned ? <span className="mw-forum-flag is-pin">Pinned</span> : null}
                  {t.locked ? <span className="mw-forum-flag">Locked</span> : null}
                  {t.is_private ? <span className="mw-forum-flag is-private"><LockIcon size={10} /> Private trip</span> : null}
                  {keepLastTwo(t.title)}
                </span>
                {t.is_private && t.teaser ? <span className="mw-forum-thread-teaser">{forumFirstWords(t.teaser, 24)}</span> : null}
                <span className="mw-forum-thread-meta">
                  {showCategory && category ? <span className="mw-forum-thread-cat">{category.label}</span> : null}
                  <span>{t.is_private ? "Organized by" : "Started by"} {starter?.name || "Guild Member"}</span>
                </span>
              </span>
              <span className="mw-forum-thread-stats">
                <span className="mw-forum-thread-count"><b>{t.reply_count}</b> {t.reply_count === 1 ? "reply" : "replies"}</span>
                <span className="mw-forum-thread-last">{!t.is_private && last && t.reply_count > 0 ? `${last.name}, ` : ""}{forumAgo(t.last_post_at)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
