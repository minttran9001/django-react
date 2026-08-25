import { cn } from "@/lib/utils";
import { stickerImageUrl, stickerThumbUrl } from "@/utils/sticker";

type StickerImageProps = {
  codepoint: string;
  name?: string;
  /** Display size in pixels */
  size?: number;
  /** Animated WebP for sent stickers; SVG for picker thumbs */
  animated?: boolean;
  className?: string;
};

const StickerImage = ({
  codepoint,
  name = "Sticker",
  size = 128,
  animated = true,
  className,
}: StickerImageProps) => {
  return (
    // Animated WebP / SVG from Google's CDN. next/image would re-encode stickers.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={animated ? stickerImageUrl(codepoint) : stickerThumbUrl(codepoint)}
      alt={name}
      width={size}
      height={size}
      className={cn("object-contain", className)}
      decoding="async"
      loading="lazy"
      draggable={false}
    />
  );
};

export default StickerImage;
