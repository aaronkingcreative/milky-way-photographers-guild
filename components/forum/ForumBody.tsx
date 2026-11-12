import { parseForumBody } from "@/lib/forum";

/** Renders a member's plain text post. Paragraphs, line breaks and web links only. */
export function ForumBody({ body, className = "" }: { body: string; className?: string }) {
  const paragraphs = parseForumBody(body);
  return (
    <div className={`mw-forum-body ${className}`}>
      {paragraphs.map((pieces, i) => (
        <p key={i}>
          {pieces.map((piece, j) =>
            piece.type === "br" ? <br key={j} /> : piece.type === "link" ? (
              <a key={j} href={piece.href} target="_blank" rel="nofollow noopener noreferrer ugc">{piece.value}</a>
            ) : <span key={j}>{piece.value}</span>,
          )}
        </p>
      ))}
    </div>
  );
}
