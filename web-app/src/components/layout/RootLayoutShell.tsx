'use client';
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  CONTAINED_MAIN_CLASS,
  getLayoutShellConfig,
  HORIZONTAL_PADDING_CLASS,
} from "@/lib/layoutConfig";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function RootLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { variant, contentWidth } = getLayoutShellConfig(pathname);

  if (variant === "auth") {
    return (
      <div className={cn("min-h-screen bg-muted/40", HORIZONTAL_PADDING_CLASS)}>
        {children}
      </div>
    );
  }

  if (variant === "marketing") {
    return (
      <div className="min-h-screen">
        <SiteHeader variant="overlay" />
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main
        className={cn(
          "w-full py-8 sm:py-10",
          contentWidth === "contained" && CONTAINED_MAIN_CLASS,
        )}
      >
        {children}
      </main>
    </div>
  );
}
