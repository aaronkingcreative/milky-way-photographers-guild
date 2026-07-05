export const GUILD_LAUNCH_DEADLINE = "2026-07-09T01:00:00Z";

const GUILD_LAUNCH_DEADLINE_MS = new Date(GUILD_LAUNCH_DEADLINE).getTime();

export function isBeforeGuildLaunch(now: number = Date.now()) {
  return now < GUILD_LAUNCH_DEADLINE_MS;
}

export function getGuildLaunchDeadlineTime() {
  return GUILD_LAUNCH_DEADLINE_MS;
}
