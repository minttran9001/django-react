"use client";

import { Fragment, type ReactNode } from "react";
import {
    parseMessageSegments,
    type MessageSegment,
} from "@/utils/richTextMessage";
import { cn } from "@/lib/utils";
import { stickerImageUrl } from "@/utils/sticker";

export type RichMessageVariant = "composer" | "incoming" | "outgoing";

type SegmentStyleSet = {
    link: string;
    mention: string;
    codeInline: string;
    codeBlock: string;
    codeBlockLang: string;
};

/**
 * Composer overlay must not change font metrics (padding/mono/block).
 * Message bubbles can — incoming is on gray, outgoing is on blue.
 */
const variantStyles: Record<RichMessageVariant, SegmentStyleSet> = {
    composer: {
        link: "text-blue-500",
        mention: "rounded-sm bg-primary/15 text-primary",
        codeInline: "rounded-sm bg-muted",
        codeBlock: "rounded-sm bg-muted",
        codeBlockLang: "hidden",
    },
    incoming: {
        link: "text-blue-600 underline-offset-2 hover:underline",
        mention: "rounded-sm bg-primary/15 px-0.5 font-medium text-primary",
        codeInline: "rounded-sm bg-black/10 px-1 py-0.5 font-mono text-[0.875em]",
        codeBlock:
            "my-1 block overflow-x-auto rounded-md bg-black/10 p-2 font-mono text-sm",
        codeBlockLang:
            "mb-1 block text-[10px] font-sans font-medium uppercase tracking-wide text-muted-foreground",
    },
    outgoing: {
        link: "text-white underline underline-offset-2 hover:opacity-90",
        mention: "rounded-sm bg-white/20 px-0.5 font-medium text-white",
        codeInline:
            "rounded-sm bg-black/20 px-1 py-0.5 font-mono text-[0.875em] text-white",
        codeBlock:
            "my-1 block overflow-x-auto rounded-md bg-black/20 p-2 font-mono text-sm text-white",
        codeBlockLang:
            "mb-1 block text-[10px] font-sans font-medium uppercase tracking-wide text-white/70",
    },
};

export type RichMessageHandlers = {
    onMentionClick?: (jid: string, name: string) => void;
};

export type SegmentViewProps = {
    segment: MessageSegment;
    variant: RichMessageVariant;
    interactive: boolean;
    handlers: RichMessageHandlers;
};

/**
 * Per-type views. Extend by adding an entry — do not rewrite the mapper loop.
 */
export type SegmentView = (props: SegmentViewProps) => ReactNode;

const textView: SegmentView = ({ segment }) => {
    if (segment.type !== "text") return null;
    return <>{segment.value}</>;
};

const codeView: SegmentView = ({ segment, variant }) => {
    if (segment.type !== "code") return null;
    const styles = variantStyles[variant];
    const isComposer = variant === "composer";

    if (isComposer) {
        return <span className={styles.codeInline}>{segment.raw}</span>;
    }
    if (segment.block) {
        return (
            <pre className={styles.codeBlock}>
                {segment.lang ? (
                    <span className={styles.codeBlockLang}>{segment.lang}</span>
                ) : null}
                <code>{segment.value}</code>
            </pre>
        );
    }
    return <code className={styles.codeInline}>{segment.value}</code>;
};

const linkView: SegmentView = ({ segment, variant, interactive }) => {
    if (segment.type !== "link") return null;
    const className = variantStyles[variant].link;
    const isComposer = variant === "composer";

    if (isComposer || !interactive) {
        return (
            <span className={className}>
                {isComposer ? segment.raw : segment.value}
            </span>
        );
    }
    return (
        <a
            className={className}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
        >
            {segment.value}
        </a>
    );
};

const stickerView: SegmentView = ({ segment, variant }) => {
    if (segment.type !== "sticker") return null;
    // Composer overlay must not change font metrics.
    if (variant === "composer") {
        return <>{segment.raw}</>;
    }
    return (
        // Animated WebP from Google's CDN — next/image would re-encode and drop the animation.
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={stickerImageUrl(segment.codepoint)}
            alt="Sticker"
            width={24}
            height={24}
            className="inline-block size-[1.5em] align-text-bottom object-contain"
            decoding="async"
        />
    );
};

const mentionView: SegmentView = ({
    segment,
    variant,
    interactive,
    handlers,
}) => {
    if (segment.type !== "mention") return null;
    const className = variantStyles[variant].mention;
    const isComposer = variant === "composer";

    if (isComposer) {
        return <span className={className}>{segment.raw}</span>;
    }

    const label = segment.value;
    const canClick =
        interactive && Boolean(segment.jid) && handlers.onMentionClick;
    if (canClick) {
        return (
            <button
                type="button"
                className={cn(className, "cursor-pointer hover:underline")}
                title={segment.jid}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlers.onMentionClick?.(segment.jid!, label.replace(/^@/, ""));
                }}
            >
                {label}
            </button>
        );
    }
    return (
        <span className={className} title={segment.jid}>
            {label}
        </span>
    );
};

export const defaultSegmentViews: Record<string, SegmentView> = {
    text: textView,
    code: codeView,
    link: linkView,
    mention: mentionView,
    sticker: stickerView,
};

type Props = {
    text: string;
    variant?: RichMessageVariant;
    interactive?: boolean;
    onMentionClick?: (jid: string, name: string) => void;
    /** Override/extend renderers without editing this component */
    views?: Record<string, SegmentView>;
};

export function RichMessageText({
    text,
    variant = "incoming",
    interactive = false,
    onMentionClick,
    views = defaultSegmentViews,
}: Props) {
    const segments = parseMessageSegments(text);
    const handlers: RichMessageHandlers = { onMentionClick };

    return (
        <>
            {segments.map((segment, i) => {
                const view = views[segment.type] ?? textView;
                return (
                    <Fragment key={`${i}-${segment.type}-${segment.raw.slice(0, 24)}`}>
                        {view({ segment, variant, interactive, handlers })}
                    </Fragment>
                );
            })}
        </>
    );
}

/** @deprecated Use RichMessageText */
export function MentionedText(props: Props) {
    return <RichMessageText {...props} />;
}
