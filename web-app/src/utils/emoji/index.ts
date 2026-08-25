export const EMOTICON_TO_EMOJI: Record<string, string> = {
  ":-)": "😊",
  ":)": "😊",
  ":-D": "😃",
  ":D": "😃",
  ":-P": "😛",
  ":P": "😛",
  ":p": "😛",
  ":-p": "😛",
  ";-)": "😉",
  ";)": "😉",
  ":-(": "😢",
  ":(": "😢",
  ":'(": "😭",
  ":'-(": "😭",
  ":-O": "😮",
  ":O": "😮",
  ":o": "😮",
  ":-o": "😮",
  ":-|": "😐",
  ":|": "😐",
  ":-/": "😕",
  ":/": "😕",
  ":-\\": "😕",
  ":\\": "😕",
  ">:(": "😠",
  ">:-(": "😠",
  xD: "😆",
  XD: "😆",
  "<3": "❤️",
  "</3": "💔",
  ":*": "😘",
  ":-*": "😘",
  "B-)": "😎",
  "8-)": "😎",
};

// Sort emoticons by length in descending order
const EMOTICONS_BY_LENGTH = Object.keys(EMOTICON_TO_EMOJI).sort(
  (a, b) => b.length - a.length,
);

/**
 * Emoticons only convert when at the start of the string or after whitespace
 * (so `http:/` does not become `http😕`).
 */
const hasEmoticonBoundary = (text: string, start: number): boolean => {
  // if the start is at the beginning of the string, return true
  if (start <= 0) return true;
  // Check if the character before the emoticon is a space ('\s' is a space character)
  return /\s/.test(text[start - 1]!);
};

const replaceEmojiAtCaret = (
  value: string,
  caret: number,
): { value: string; caret: number; replaced: boolean } => {
  //Step 1: Find the emoticon at the caret
  const before = value.slice(0, caret);

  for (const emoticon of EMOTICONS_BY_LENGTH) {
    if (!before.endsWith(emoticon)) continue;
    const start = caret - emoticon.length;

    if (!hasEmoticonBoundary(value, start)) continue;

    return {
      value:
        value.slice(0, start) +
        EMOTICON_TO_EMOJI[emoticon] +
        value.slice(caret),
      caret: start + EMOTICON_TO_EMOJI[emoticon].length,
      replaced: true,
    };
  }
  return {
    value: value,
    caret: caret,
    replaced: false,
  };
};

export { replaceEmojiAtCaret };
