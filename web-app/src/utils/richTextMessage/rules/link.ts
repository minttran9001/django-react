import type { SegmentMatch, SegmentRule } from "../types";

/** Autolink http(s) URLs; trim common trailing punctuation. */
const URL_RE = /https?:\/\/[^\s<]+/gi;

function sanitizeHref(raw: string): { href: string; length: number } {
  let href = raw;
  let trim = 0;
  while (/[),.;:!?]$/.test(href)) {
    href = href.slice(0, -1);
    trim += 1;
  }
  return { href, length: raw.length - trim };
}

// text contain https://example.com or http://example.com
// example: https://example.com or http://example.com
export const linkRule: SegmentRule = {
  id: "link",
  find(text, from) {
    const re = new RegExp(URL_RE.source, "gi");
    re.lastIndex = from;
    const match = re.exec(text);
    if (!match || match.index < from) return null;
    const { href, length } = sanitizeHref(match[0]!);
    if (!href) return null;
    return {
      index: match.index,
      length,
      segment: {
        type: "link",
        raw: text.slice(match.index, match.index + length),
        value: href,
        href,
      },
    } satisfies SegmentMatch;
  },
};
