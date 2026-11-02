-- Message from Aaron: max 850 characters (the 689-character message live on Nov 1, 2026 plus about one sentence).
-- Large font up to 320 characters is a display rule in lib/guild-message.ts, not a DB rule.
alter table public.guild_messages drop constraint if exists guild_messages_body_check;
alter table public.guild_messages add constraint guild_messages_body_check check (char_length(btrim(body)) between 1 and 850) not valid;
alter table public.guild_messages validate constraint guild_messages_body_check;
