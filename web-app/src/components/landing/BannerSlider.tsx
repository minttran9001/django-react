"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BannerSlide = {
  backgroundImage: StaticImageData;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

type BannerSliderProps = {
  slides: BannerSlide[];
  intervalTime?: number;
};

export function BannerSlider({
  slides,
  intervalTime = 5000,
}: BannerSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [slides.length, intervalTime]);

  return (
    <div className="relative h-screen w-full">
      {slides.map((slide, index) => (
        <div
          key={slide.title}
          className={cn(
            "absolute h-full w-full bg-cover bg-center transition-opacity duration-500",
            currentSlide === index ? "opacity-100" : "opacity-0",
          )}
        >
          <Image
            src={slide.backgroundImage}
            alt={slide.title}
            fill
            priority={index === 0}
            className="object-cover"
          />
          <div className="relative z-10 flex h-full flex-col justify-center gap-4 bg-black/50 px-6 py-24 sm:px-12 lg:px-16">
            <h2 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {slide.title}
            </h2>
            <p className="max-w-xl text-base text-white/90 sm:text-lg">
              {slide.description}
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href={slide.primaryHref}>{slide.primaryLabel}</Link>
              </Button>
              <Button
                variant="secondary"
                className="bg-white/90 text-secondary-foreground hover:bg-white"
                asChild
              >
                <Link href={slide.secondaryHref}>{slide.secondaryLabel}</Link>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
