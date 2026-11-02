/**
 * Message from Aaron length rules.
 * Up to MESSAGE_LARGE_FONT_MAX characters the card uses the big font; longer messages switch to a smaller font.
 * MESSAGE_MAX is the hard limit (the Nov 1, 2026 message was 689 characters, plus about one sentence, rounded up).
 * The database check constraint guild_messages_body_check enforces the same max.
 */
export const MESSAGE_MAX = 850;
export const MESSAGE_LARGE_FONT_MAX = 320;
export const isLongMessage = (body: string) => body.trim().length > MESSAGE_LARGE_FONT_MAX;
