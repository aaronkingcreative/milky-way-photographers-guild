/**
 * Message from Aaron length rules.
 * Up to MESSAGE_LARGE_FONT_MAX characters the card uses the big font; longer messages switch to a smaller font.
 * MESSAGE_MAX is the hard limit (the Nov 1, 2026 message was 689 characters, plus about one sentence, rounded up).
 * The database check constraint guild_messages_body_check enforces the same max.
 */
export const MESSAGE_MAX = 850;
export const MESSAGE_LARGE_FONT_MAX = 320;
export const isLongMessage = (body: string) => body.trim().length > MESSAGE_LARGE_FONT_MAX;

/** A dismissal applies only to this exact message version (id + updated_at). */
export function sameMessageVersion(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();
  return Number.isFinite(left) && left === right;
}

export function isGuildMessageAcknowledged(
  message: { id: string; updated_at: string },
  mark: { message_id: string; message_updated_at?: string | null } | null | undefined,
) {
  if (!mark || mark.message_id !== message.id) return false;
  return sameMessageVersion(mark.message_updated_at, message.updated_at);
}
