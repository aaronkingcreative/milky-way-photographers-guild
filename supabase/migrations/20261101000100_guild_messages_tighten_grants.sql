-- Members only need row-level verbs on the message tables. TRUNCATE skips RLS, so take it away.
revoke truncate, references, trigger on public.guild_messages from authenticated;
revoke truncate, references, trigger, update on public.guild_message_reads from authenticated;
