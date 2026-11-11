/**
 * Keeps the last three words on one line so a wrapped block does not end on one or two words.
 * Gluing only the final pair still leaves a two-word last line, so the group is three words.
 * Strings of three words or fewer stay together as a single line when they fit.
 * Pass `keep` to hold a longer ending together, such as a whole closing clause.
 */
export function KeepTail({ text, keep = 3 }: { text: string; keep?: number }) {
  const tokens = text.match(/\S+/g) ?? [];
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
