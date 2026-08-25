import type { SegmentMatch, SegmentRule } from "../types";

const BLOCK_SRC = "```([a-zA-Z0-9_+-]*)\\r?\\n([\\s\\S]*?)```";
const INLINE_SRC = "`([^`\\n]+)`";

// text contain ```javascript\nconsole.log("Hello, world!");\n```
export const codeBlockRule: SegmentRule = {
  id: "code-block",
  find(text, from) {
    const re = new RegExp(BLOCK_SRC, "g");
    re.lastIndex = from;
    const match = re.exec(text);
    if (!match || match.index < from) return null;
    const lang = match[1] || undefined;
    const value = match[2] ?? "";
    return {
      index: match.index,
      length: match[0]!.length,
      segment: {
        type: "code",
        raw: match[0]!,
        value,
        block: true,
        lang,
      },
    } satisfies SegmentMatch;
  },
};

// text contain `console.log("Hello, world!");`
export const codeInlineRule: SegmentRule = {
  id: "code-inline",
  find(text, from) {
    const re = new RegExp(INLINE_SRC, "g");
    re.lastIndex = from;
    const match = re.exec(text);
    if (!match || match.index < from) return null;
    return {
      index: match.index,
      length: match[0]!.length,
      segment: {
        type: "code",
        raw: match[0]!,
        value: match[1] ?? "",
        block: false,
      },
    } satisfies SegmentMatch;
  },
};
