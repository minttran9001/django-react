export type TextSegment = {
  type: "text";
  raw: string;
  value: string;
};

export type CodeSegment = {
  type: "code";
  raw: string;
  /** Code content without fences/backticks */
  value: string;
  block: boolean;
  lang?: string;
};

export type LinkSegment = {
  type: "link";
  raw: string;
  value: string;
  href: string;
};

export type MentionSegment = {
  type: "mention";
  raw: string;
  /** Visible label including leading @ */
  value: string;
  jid?: string;
};

export type StickerSegment = {
  type: "sticker";
  raw: string;
  /** Unicode codepoint used to fetch the asset */
  value: string;
  source: string;
  codepoint: string;
};

export type MessageSegment =
  | TextSegment
  | CodeSegment
  | LinkSegment
  | MentionSegment
  | StickerSegment;

export type RichSegment = Exclude<MessageSegment, TextSegment>;

export type SegmentMatch = {
  index: number;
  length: number;
  segment: RichSegment;
};

/**
 * A rule finds the next rich span at/after `from`.
 * Add new formats by registering a new rule — do not edit the parser core.
 */
export type SegmentRule = {
  id: string;
  find(text: string, from: number): SegmentMatch | null;
};
