/** Pure helpers for the Forum post cooldown, shared by the server action, the composer and the tests. */
export const FORUM_COOLDOWN_SECONDS = 20;
export const FORUM_COOLDOWN_ERROR = "Give it a few seconds before posting again.";

/** Whole seconds left before a member may post again, given their last post time. Never below 1 when the database said wait. */
export function forumCooldownLeft(lastAt: string | number | Date | null | undefined, now = Date.now(), windowSeconds = FORUM_COOLDOWN_SECONDS) {
  if (lastAt === null || lastAt === undefined) return windowSeconds;
  const last = new Date(lastAt).getTime();
  if (!Number.isFinite(last)) return windowSeconds;
  const left = Math.ceil((last + windowSeconds * 1000 - now) / 1000);
  return Math.min(windowSeconds, Math.max(1, left));
}

export function isForumCooldownError(message: string | null | undefined) {
  return String(message || "") === FORUM_COOLDOWN_ERROR;
}

/** Composer line while the cooldown runs. */
export function forumCooldownMessage(seconds: number) {
  const n = Math.max(1, Math.ceil(seconds));
  return `Give it ${n}\u00A0more second${n === 1 ? "" : "s"} before posting again.`;
}

/** Seconds left on a client deadline, 0 once it has passed. */
export function secondsUntil(deadline: number | null, now = Date.now()) {
  if (!deadline) return 0;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
