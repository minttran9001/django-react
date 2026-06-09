"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useGetMeQuery, useLogoutMutation } from "@/lib/api/authApi";
import { useInitialUser } from "@/providers/InitialUserContext";

import { Logo } from "./Logo";

export function LandingHeader() {
  const router = useRouter();
  const initialUser = useInitialUser();
  const { data } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const user = data?.user ?? initialUser;

  const handleLogout = async () => {
    await logout().unwrap();
    router.push("/login");
  };

  return (
    <header className="fixed top-5 left-1/2 z-50 flex h-24 w-[95%] -translate-x-1/2 items-center justify-between rounded-lg border-b bg-white px-8 py-2 shadow-lg">
      <Logo />

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              className="rounded-2xl"
              render={<Link href="/login" />}
            >
              Log in
            </Button>
            <Button className="rounded-2xl" render={<Link href="/register" />}>
              Sign up
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
