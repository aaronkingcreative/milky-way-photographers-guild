/**
 * Keeps the last three words on one line so a wrapped block does not end on one or two words.
 * Gluing only the final pair still leaves a two-word last line, so the group is three words.
 * Strings of three words or fewer stay together as a single line when they fit.
 */
export function KeepTail({ text }: { text: string }) {
  const tokens = text.match(/\S+/g) ?? [];
  if (tokens.length < 2) return text;
  const keep = Math.min(3, tokens.length);
  const tail = tokens.slice(-keep).join(" ");
  const head = tokens.slice(0, -keep).join(" ");
  if (!head) return <span className="mw-keep">{tail}</span>;
  return (
    <>
      {head} <span className="mw-keep">{tail}</span>
    </>
  );
}
