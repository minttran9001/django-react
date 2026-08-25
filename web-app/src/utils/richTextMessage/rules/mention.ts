import type { SegmentMatch, SegmentRule } from "../types";

/** @[Name](bareJid) or legacy @handle */
const MENTION_RE = /@\[([^\]]+)\]\(([^)\s]+)\)|@([\w.-]+)/g;

// text contain @[Name](bareJid) or legacy @handle
// example: @[John Doe](john.doe@example.com) or @john.doe
export const mentionRule: SegmentRule = {
  id: "mention",
  find(text, from) {
    const re = new RegExp(MENTION_RE.source, "g");
    re.lastIndex = from;
    const match = re.exec(text);
    if (!match || match.index < from) return null;

    if (match[1] != null && match[2] != null) {
      return {
        index: match.index,
        length: match[0]!.length,
        segment: {
          type: "mention",
          raw: match[0]!,
          value: `@${match[1]}`,
          jid: match[2],
        },
      } satisfies SegmentMatch;
    }

    return {
      index: match.index,
      length: match[0]!.length,
      segment: {
        type: "mention",
        raw: match[0]!,
        value: match[0]!,
      },
    } satisfies SegmentMatch;
  },
};
