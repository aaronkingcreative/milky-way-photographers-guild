/**
 * Keeps the last two words on one line so a wrapped block does not end on a single word.
 * text-wrap pretty does the rest. Pass a larger `keep` only when pretty still leaves a one-word last line.
 * Pass `keep` to hold a longer ending together, such as a whole closing clause.
 */
export function KeepTail({ text, keep = 2 }: { text: string; keep?: number }) {
  const tokens = text.match(/[^ \t\n\r]+/g) ?? [];
  if (tokens.length < 2) return text;
  const count = Math.min(Math.max(1, keep), tokens.length);
  const tail = tokens.slice(-count).join(" ");
  const head = tokens.slice(0, -count).join(" ");
  if (!head) return <span className="mw-keep">{tail}</span>;
  return (
    <>
      {head} <span className="mw-keep">{tail}</span>
    </>
  );
}
