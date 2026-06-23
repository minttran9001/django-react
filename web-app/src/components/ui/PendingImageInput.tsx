"use client";

import { ImagePlus, X } from "lucide-react";
import { useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ImageResource } from "@/features/court-centers/types";
import { cn } from "@/lib/utils";
import Image from "next/image";

type PendingImageInputProps = {
  id?: string;
  label: string;
  description?: string;
  multiple?: boolean;
  accept?: string;
  value: ImageResource[];
  onChange: (images: ImageResource[]) => void;
  onUpload: (files: File[]) => Promise<ImageResource[]>;
  disabled?: boolean;
  isUploading?: boolean;
  imageSizes?: string;
};

export function PendingImageInput({
  id,
  label,
  description,
  multiple = false,
  accept = "image/*",
  value,
  onChange,
  onUpload,
  disabled = false,
  isUploading = false,
  imageSizes = "(max-width: 768px) 100vw, 768px"
}: PendingImageInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = async (files: FileList | null) => {
    if (!files?.length || disabled || isUploading) return;

    const selected = multiple ? Array.from(files) : [files[0]];
    const uploaded = await onUpload(selected);
    onChange(multiple ? [...value, ...uploaded] : uploaded.slice(0, 1));
  };

  const removeImage = (imageId: number) => {
    const newImages = value.filter((image) => image.id !== imageId);
    onChange(newImages);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled || isUploading}
        className="hidden"
        onChange={(event) => {
          void handleSelect(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-3">
        {value.map((image) => (
          <div
            key={image.id}
            className="relative size-24 overflow-hidden rounded-lg border bg-muted"
          >
            <Image
              fill
              sizes={imageSizes}
              src={image.url}
              alt={`${label} preview`}
              className="h-full w-full object-cover"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon-xs"
              className="absolute top-1 right-1"
              onClick={(e) => {
                e.stopPropagation();
                removeImage(image.id);
              }}
              disabled={disabled || isUploading}
              aria-label={`Remove ${label}`}
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}

        {(multiple || value.length === 0) && (
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex size-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors",
              "hover:border-foreground/30 hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <ImagePlus className="size-5" />
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        )}
      </div>
    </div>
  );
}
