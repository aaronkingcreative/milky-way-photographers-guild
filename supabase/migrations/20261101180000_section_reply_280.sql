-- Replies on "what went well" and "what could have gone better" stay short, like a tweet.
-- General Guild Feedback (section = 'general') has no length limit.
alter table public.image_comments drop constraint if exists image_comments_section_reply_length;
alter table public.image_comments
  add constraint image_comments_section_reply_length
  check (section = 'general' or char_length(body) <= 280);
