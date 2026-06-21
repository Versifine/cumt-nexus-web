export const CONTENT_EFFECT_EMOJI_BY_ID: Record<string, string> = {
  abstract: "🌀",
  cant_hold: "😂",
  classic: "🏆",
  clown: "🤡",
  fake_news: "📰",
  following_up: "👀",
  godlike: "👑",
  humor: "🎭",
  laughed: "😆",
  useful: "👍",
  verified_true: "✅",
};

type ContentEffectEmojiSource = {
  effect_id?: string | null;
  emoji?: string | null;
  id?: string | null;
};

export function getContentEffectEmoji(effect: ContentEffectEmojiSource) {
  const emoji = effect.emoji?.trim();

  if (emoji) {
    return emoji;
  }

  const effectId = effect.effect_id?.trim() || effect.id?.trim() || "";

  return CONTENT_EFFECT_EMOJI_BY_ID[effectId] || "";
}
