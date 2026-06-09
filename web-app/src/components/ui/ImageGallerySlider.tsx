"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GalleryImage = {
  id: number;
  url: string;
};

type ImageGallerySliderProps = {
  images: GalleryImage[];
  alt: string;
  className?: string;
};

export function ImageGallerySlider({
  images,
  alt,
  className,
}: ImageGallerySliderProps) {
  const [index, setIndex] = useState(0);

  const goTo = useCallback(
    (nextIndex: number) => {
      setIndex((nextIndex + images.length) % images.length);
    },
    [images.length],
  );

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "flex aspect-[16/10] items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground",
          className,
        )}
      >
        No photos yet
      </div>
    );
  }

  const hasMultiple = images.length > 1;

  return (
    <div
      className={cn(
        "relative aspect-[16/10] overflow-hidden rounded-xl bg-muted",
        className,
      )}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((image, imageIndex) => (
          <div key={image.id} className="relative h-full w-full shrink-0">
            <Image
              src={image.url}
              alt={`${alt} photo ${imageIndex + 1}`}
              fill
              priority={imageIndex === 0}
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {hasMultiple ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Previous photo"
            onClick={() => goTo(index - 1)}
            className="absolute top-1/2 left-3 -translate-y-1/2 bg-background/90 shadow-sm"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Next photo"
            onClick={() => goTo(index + 1)}
            className="absolute top-1/2 right-3 -translate-y-1/2 bg-background/90 shadow-sm"
          >
            <ChevronRight className="size-4" />
          </Button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((image, dotIndex) => (
              <button
                key={image.id}
                type="button"
                aria-label={`Go to photo ${dotIndex + 1}`}
                onClick={() => setIndex(dotIndex)}
                className={cn(
                  "size-2 rounded-full transition",
                  dotIndex === index ? "bg-white" : "bg-white/50 hover:bg-white/80",
                )}
              />
            ))}
          </div>

          <div className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
            {index + 1} / {images.length}
          </div>
        </>
      ) : null}
    </div>
  );
}
