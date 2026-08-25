import type { MessageSegment, SegmentMatch, SegmentRule } from "./types";
import { codeBlockRule, codeInlineRule } from "./rules/code";
import { linkRule } from "./rules/link";
import { mentionRule } from "./rules/mention";
import { stickerRule } from "./rules/sticker";

/**
 * Walk `text` left-to-right. At each position, every rule may propose a match;
 * earliest index wins; rule list order breaks ties.
 * Add formats by registering rules — do not edit this loop.
 */
export function parseWithRules(
  text: string,
  rules: readonly SegmentRule[],
): MessageSegment[] {
  if (!text) return [{ type: "text", raw: "", value: "" }];

  const segments: MessageSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let best: SegmentMatch | null = null;
    let bestOrder = Number.POSITIVE_INFINITY;

    for (let order = 0; order < rules.length; order += 1) {
      const hit = rules[order]!.find(text, cursor);
      if (!hit || hit.index < cursor) continue;
      if (
        !best ||
        hit.index < best.index ||
        (hit.index === best.index && order < bestOrder)
      ) {
        best = hit;
        bestOrder = order;
      }
    }

    if (!best) {
      const rest = text.slice(cursor);
      segments.push({ type: "text", raw: rest, value: rest });
      break;
    }

    if (best.index > cursor) {
      const chunk = text.slice(cursor, best.index);
      segments.push({ type: "text", raw: chunk, value: chunk });
    }

    segments.push(best.segment);
    cursor = best.index + best.length;
  }

  if (!segments.length) {
    segments.push({ type: "text", raw: text, value: text });
  }
  return segments;
}

/**
 * Default pipeline order = precedence.
 * Extend by composing: `parseMessageSegments(text, [...defaultSegmentRules, myRule])`
 * or `createSegmentParser([...defaultSegmentRules, myRule])`.
 */
export const defaultSegmentRules: readonly SegmentRule[] = [
  codeBlockRule,
  codeInlineRule,
  stickerRule,
  mentionRule,
  linkRule,
];

export function createSegmentParser(rules: readonly SegmentRule[]) {
  return (text: string): MessageSegment[] => parseWithRules(text, rules);
}

export const parseMessageSegments = createSegmentParser(defaultSegmentRules);

export type {
  CodeSegment,
  LinkSegment,
  MentionSegment,
  MessageSegment,
  SegmentMatch,
  SegmentRule,
  StickerSegment,
  TextSegment,
} from "./types";

export { codeBlockRule, codeInlineRule } from "./rules/code";
export { linkRule } from "./rules/link";
export { mentionRule } from "./rules/mention";
export { stickerRule } from "./rules/sticker";
