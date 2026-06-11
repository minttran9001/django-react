"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/landing/Logo";
import { UserMenu } from "@/components/landing/UserMenu";
import { Button } from "@/components/ui/button";
import { useGetMeQuery } from "@/lib/api/authApi";
import { HORIZONTAL_PADDING_CLASS } from "@/lib/layoutConfig";
import { useInitialUser } from "@/providers/InitialUserContext";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  variant?: "default" | "overlay";
};

function NavLink({
  href,
  children,
  overlay,
}: {
  href: string;
  children: React.ReactNode;
  overlay?: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    href === "/listings"
      ? pathname === "/listings" ||
        /^\/listings\/[^/]+$/.test(pathname)
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
        overlay
          ? isActive
            ? "bg-white/15 text-white"
            : "text-white/85 hover:bg-white/10 hover:text-white"
          : isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function SiteHeader({ variant = "default" }: SiteHeaderProps) {
  const initialUser = useInitialUser();
  const { data } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const user = data ?? initialUser;
  const isOverlay = variant === "overlay";

  return (
    <header
      className={cn(
        "z-50 w-full",
        isOverlay
          ? "absolute inset-x-0 top-0 border-b border-white/15 bg-black/30 backdrop-blur-md"
          : "sticky top-0 border-b border-border/70 bg-background/90 backdrop-blur-md",
      )}
    >
      <div className={cn("mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4", HORIZONTAL_PADDING_CLASS)}>
        <Logo className={isOverlay ? "text-white" : undefined} />

        {user ? (
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/listings" overlay={isOverlay}>
              Browse
            </NavLink>
            <NavLink href="/listings/mine" overlay={isOverlay}>
              My listings
            </NavLink>
          </nav>
        ) : null}

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <UserMenu />
          ) : (
            <>
              <Button
                variant="outline"
                className={cn(
                  isOverlay &&
                    "border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white",
                )}
                asChild
              >
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                className={cn(
                  isOverlay && "bg-white text-black hover:bg-white/90",
                )}
                asChild
              >
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
