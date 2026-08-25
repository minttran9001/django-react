import { STICKER_TOKEN_RE } from "@/utils/sticker";
import type { SegmentMatch, SegmentRule } from "../types";

export const stickerRule: SegmentRule = {
  id: "sticker",
  find(text, from) {
    const re = new RegExp(STICKER_TOKEN_RE.source, "gi");
    re.lastIndex = from;
    const match = re.exec(text);
    if (!match || match.index < from) return null;
    return {
      index: match.index,
      length: match[0]!.length,
      segment: {
        type: "sticker",
        raw: match[0]!,
        value: match[2]!.toLowerCase(),
        source: match[1]!.toLowerCase(),
        codepoint: match[2]!.toLowerCase(),
      },
    } satisfies SegmentMatch;
  },
};
