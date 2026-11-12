/** Glue the last two words with a NBSP so a wrap cannot leave a one-word orphan. */
export function keepLastTwo(text: string) {
  const tokens = text.match(/[^ \t\n\r]+/g) ?? [];
  if (tokens.length < 2) return text;
  const head = tokens.slice(0, -1).join(" ");
  return `${head}\u00A0${tokens[tokens.length - 1]}`;
}
