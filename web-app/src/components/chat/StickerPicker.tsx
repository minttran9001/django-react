"use client";

import { StickerIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import {
  STICKER_CATEGORIES,
  STICKERS,
  type Sticker,
  type StickerCategory,
} from "@/utils/sticker";
import StickerImage from "./StickerImage";

type StickerPickerProps = {
  onStickerClick: (sticker: Sticker) => void;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const StickerPicker = (props: StickerPickerProps) => {
  const { onStickerClick, className, open, onOpenChange } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<StickerCategory>("smileys");

  const openToUse = useMemo(() => {
    return typeof open === "boolean" ? open : isOpen;
  }, [open, isOpen]);

  const setOpenToUse = useCallback((open: boolean) => {
    return typeof onOpenChange === "function" ? onOpenChange(open) : setIsOpen(open);
  }, [onOpenChange]);

  const q = query.trim().toLowerCase();
  const stickers = q
    ? STICKERS.filter(
      (sticker) =>
        sticker.name.toLowerCase().includes(q) ||
        sticker.category.includes(q),
    )
    : STICKERS.filter((sticker) => sticker.category === category);

  useEffect(() => {
    if (!openToUse) return;
    const onClickOutside = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        !event.target.closest("#sticker-picker")
      ) {
        setOpenToUse(false);
      }
    };
    const onClickEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenToUse(false);
      }
    };
    document.body.addEventListener("click", onClickOutside);
    document.body.addEventListener("keydown", onClickEscape);
    return () => {
      document.body.removeEventListener("click", onClickOutside);
      document.body.removeEventListener("keydown", onClickEscape);
    };
  }, [openToUse, setOpenToUse]);

  return (
    <div id="sticker-picker" className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Open sticker picker"
        aria-expanded={openToUse}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.stopPropagation();
          setOpenToUse(!openToUse);
        }}
      >
        <StickerIcon />
      </Button>
      {openToUse ? (
        <div
          role="dialog"
          aria-label="Sticker picker"
          className="absolute right-0 bottom-[calc(100%+8px)] z-50 flex h-95 w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border bg-background shadow-lg"
        >
          <div className="border-b p-2">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="Search stickers"
              aria-label="Search stickers"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto border-b px-2 py-1.5">
            {STICKER_CATEGORIES.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="xs"
                variant={category === item.id && !q ? "default" : "ghost"}
                className="shrink-0"
                onClick={(e) => {
                  setCategory(item.id);
                  setQuery("");
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-4 content-start gap-1 overflow-y-auto p-2">
            {stickers.length === 0 ? (
              <p className="col-span-4 py-8 text-center text-sm text-muted-foreground">
                No stickers found
              </p>
            ) : (
              stickers.map((sticker) => (
                <button
                  key={sticker.codepoint}
                  type="button"
                  className="flex aspect-square items-center justify-center rounded-md p-1 [content-visibility:auto] [contain-intrinsic-size:4.5rem] hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={sticker.name}
                  title={sticker.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStickerClick(sticker);
                  }}
                >
                  <StickerImage
                    codepoint={sticker.codepoint}
                    name={sticker.name}
                    size={64}
                    animated={false}
                    className="size-14"
                  />
                </button>
              ))
            )}
          </div>
          <p className="border-t px-2 py-1 text-[10px] text-muted-foreground">
            Noto Emoji · Google · Apache 2.0
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default StickerPicker;
