"use client";

import { Menu } from "@base-ui/react/menu";
import { User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLogoutMutation } from "@/lib/api/authApi";
import { cn } from "@/lib/utils";

const menuItemClassName =
  "flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none data-highlighted:bg-muted data-highlighted:text-foreground";

export function UserMenu() {
  const router = useRouter();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const handleLogout = async () => {
    await logout().unwrap();
    router.push("/login");
  };

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        nativeButton={false}
        aria-label="Open account menu"
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar className="size-9 cursor-pointer">
          <AvatarFallback>
            <User className="size-4" />
          </AvatarFallback>
        </Avatar>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-[100]"
        >
          <Menu.Popup
            className={cn(
              "min-w-40 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md",
              "origin-[var(--transform-origin)] transition-[transform,scale,opacity]",
              "data-ending-style:scale-95 data-ending-style:opacity-0",
              "data-starting-style:scale-95 data-starting-style:opacity-0"
            )}
          >
            <Menu.LinkItem
              className={menuItemClassName}
              render={<Link href="/listings/mine" />}
            >
              My listings
            </Menu.LinkItem>
            <Menu.LinkItem
              className={menuItemClassName}
              render={<Link href="/listings/create" />}
            >
              Create listing
            </Menu.LinkItem>
            <Menu.Item
              className={menuItemClassName}
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
