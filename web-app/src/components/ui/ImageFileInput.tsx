"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Image from "next/image";

type ImageFileInputProps = {
  id?: string;
  label: string;
  description?: string;
  multiple?: boolean;
  accept?: string;
  value: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
};

export function ImageFileInput({
  id,
  label,
  description,
  multiple = false,
  accept = "image/*",
  value,
  onChange,
  disabled = false,
}: ImageFileInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useMemo(
    () => value.map((file) => URL.createObjectURL(file)),
    [value],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleSelect = (files: FileList | null) => {
    if (!files?.length) return;

    const selected = Array.from(files);
    onChange(multiple ? [...value, ...selected] : [selected[0]]);
  };

  const removeFile = (index: number) => {
    onChange(value.filter((_, fileIndex) => fileIndex !== index));
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
        disabled={disabled}
        className="hidden"
        onChange={(event) => {
          handleSelect(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-3">
        {previewUrls.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="relative size-24 overflow-hidden rounded-lg border bg-muted"
          >
            <Image
              src={url}
              width={96}
              height={96}
              alt={`${label} preview ${index + 1}`}
              className="h-full w-full object-cover"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon-xs"
              className="absolute top-1 right-1"
              onClick={() => removeFile(index)}
              disabled={disabled}
              aria-label={`Remove ${label} ${index + 1}`}
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}

        {(multiple || value.length === 0) && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex size-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors",
              "hover:border-foreground/30 hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <ImagePlus className="size-5" />
            Upload
          </button>
        )}
      </div>
    </div>
  );
}
