/**
 * Stickers are Google Noto Animated Emoji (Apache 2.0).
 * https://github.com/googlefonts/noto-emoji-animation
 *
 * Picker thumbs use the small SVG; sent stickers use the animated WebP.
 */
const NOTO_CDN = "https://fonts.gstatic.com/s/e/notoemoji/latest";

// text contain [[sticker:noto:1f600]]
export const STICKER_TOKEN_RE = /\[\[sticker:([a-z0-9]+):([a-z0-9_]+)\]\]/gi;

// text contain [[sticker:noto:1f600]]
const STICKER_ONLY_RE = /^\[\[sticker:([a-z0-9]+):([a-z0-9_]+)\]\]$/i;

export type StickerSource = "noto";

export type StickerCategory =
  | "smileys"
  | "gestures"
  | "hearts"
  | "animals"
  | "food"
  | "party";

export type Sticker = {
  source: StickerSource;
  codepoint: string;
  name: string;
  category: StickerCategory;
};

export const STICKER_CATEGORIES: { id: StickerCategory; label: string }[] = [
  { id: "smileys", label: "Smileys" },
  { id: "gestures", label: "Gestures" },
  { id: "hearts", label: "Hearts" },
  { id: "animals", label: "Animals" },
  { id: "food", label: "Food" },
  { id: "party", label: "Party" },
];

type StickerSeed = [codepoint: string, name: string, category: StickerCategory];

const STICKER_SEEDS: readonly StickerSeed[] = [
  ["1f600", "Smile", "smileys"],
  ["1f603", "Smile big eyes", "smileys"],
  ["1f604", "Grin", "smileys"],
  ["1f601", "Grinning", "smileys"],
  ["1f606", "Laughing", "smileys"],
  ["1f602", "Joy", "smileys"],
  ["1f923", "ROFL", "smileys"],
  ["1f605", "Grin sweat", "smileys"],
  ["1f609", "Wink", "smileys"],
  ["1f60f", "Smirk", "smileys"],
  ["1f60e", "Sunglasses", "smileys"],
  ["1f60d", "Heart eyes", "smileys"],
  ["1f970", "Heart face", "smileys"],
  ["1f929", "Star struck", "smileys"],
  ["1f618", "Kissing heart", "smileys"],
  ["1f917", "Hug", "smileys"],
  ["1f97a", "Pleading", "smileys"],
  ["1f914", "Thinking", "smileys"],
  ["1f973", "Partying", "smileys"],
  ["1fae0", "Melting", "smileys"],
  ["1f643", "Upside down", "smileys"],
  ["1f92a", "Zany", "smileys"],
  ["1f62d", "Loudly crying", "smileys"],
  ["1f622", "Cry", "smileys"],
  ["1f621", "Rage", "smileys"],
  ["1f92e", "Vomit", "smileys"],
  ["1f634", "Sleep", "smileys"],
  ["1f910", "Zipper face", "smileys"],
  ["1f47b", "Ghost", "smileys"],
  ["1f4a9", "Poop", "smileys"],
  ["1f916", "Robot", "smileys"],
  ["1f47d", "Alien", "smileys"],
  ["1f63a", "Smiley cat", "smileys"],
  ["1f440", "Eyes", "smileys"],
  ["1f44b", "Wave", "gestures"],
  ["1f44d", "Thumbs up", "gestures"],
  ["1f44c", "OK", "gestures"],
  ["1f44f", "Clap", "gestures"],
  ["1f64c", "Raising hands", "gestures"],
  ["1f64f", "Folded hands", "gestures"],
  ["1f4aa", "Muscle", "gestures"],
  ["1f91d", "Handshake", "gestures"],
  ["1f90c", "Pinched fingers", "gestures"],
  ["2764_fe0f", "Red heart", "hearts"],
  ["1f496", "Sparkling heart", "hearts"],
  ["1f495", "Two hearts", "hearts"],
  ["1f49c", "Purple heart", "hearts"],
  ["1f49b", "Yellow heart", "hearts"],
  ["1f49a", "Green heart", "hearts"],
  ["1f499", "Blue heart", "hearts"],
  ["1f90d", "White heart", "hearts"],
  ["1f5a4", "Black heart", "hearts"],
  ["1f498", "Cupid", "hearts"],
  ["1f49d", "Gift heart", "hearts"],
  ["1f48b", "Kiss", "hearts"],
  ["1f525", "Fire", "hearts"],
  ["2728", "Sparkles", "hearts"],
  ["1f4af", "100", "hearts"],
  ["1f98a", "Fox", "animals"],
  ["1f43c", "Panda", "animals"],
  ["1f43b", "Bear", "animals"],
  ["1f981", "Lion", "animals"],
  ["1f984", "Unicorn", "animals"],
  ["1f438", "Frog", "animals"],
  ["1f407", "Rabbit", "animals"],
  ["1f415", "Dog", "animals"],
  ["1f412", "Monkey", "animals"],
  ["1f427", "Penguin", "animals"],
  ["1f989", "Owl", "animals"],
  ["1f98b", "Butterfly", "animals"],
  ["1f42c", "Dolphin", "animals"],
  ["1f422", "Turtle", "animals"],
  ["1f355", "Pizza", "food"],
  ["1f354", "Burger", "food"],
  ["1f32d", "Hot dog", "food"],
  ["1f32e", "Taco", "food"],
  ["1f382", "Birthday cake", "food"],
  ["1f369", "Doughnut", "food"],
  ["1f36a", "Cookie", "food"],
  ["1f366", "Soft ice cream", "food"],
  ["1f353", "Strawberry", "food"],
  ["1f349", "Watermelon", "food"],
  ["2615", "Coffee", "food"],
  ["1f37b", "Beers", "food"],
  ["1f377", "Wine", "food"],
  ["1f9cb", "Bubble tea", "food"],
  ["1f389", "Party popper", "party"],
  ["1f388", "Balloon", "party"],
  ["1f381", "Gift", "party"],
  ["1f386", "Fireworks", "party"],
  ["1f3c6", "Trophy", "party"],
  ["26bd", "Soccer", "party"],
  ["1f3c0", "Basketball", "party"],
  ["1f308", "Rainbow", "party"],
  ["26a1", "Zap", "party"],
  ["1f451", "Crown", "party"],
  ["1f4a1", "Light bulb", "party"],
  ["1f680", "Rocket", "party"],
];

export const STICKERS: Sticker[] = STICKER_SEEDS.map(
  ([codepoint, name, category]) => ({
    source: "noto",
    codepoint,
    name,
    category,
  }),
);

export function stickerThumbUrl(codepoint: string): string {
  return `${NOTO_CDN}/${codepoint}/emoji.svg`;
}

export function stickerImageUrl(codepoint: string): string {
  return `${NOTO_CDN}/${codepoint}/512.webp`;
}

export function serializeSticker(
  sticker: Pick<Sticker, "source" | "codepoint">,
): string {
  return `[[sticker:${sticker.source}:${sticker.codepoint}]]`;
}

export function parseStickerToken(
  raw: string,
): { source: string; codepoint: string } | null {
  const match = raw.trim().match(STICKER_ONLY_RE);
  if (!match) return null;
  return {
    source: match[1]!.toLowerCase(),
    codepoint: match[2]!.toLowerCase(),
  };
}

export function isStickerOnlyMessage(body: string): boolean {
  return parseStickerToken(body) != null;
}

export function stickerMessagePreview(body: string): string {
  return isStickerOnlyMessage(body) ? "Sticker" : body;
}
