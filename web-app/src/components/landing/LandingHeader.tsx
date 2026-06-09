"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useGetMeQuery } from "@/lib/api/authApi";
import { useInitialUser } from "@/providers/InitialUserContext";

import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";

export function LandingHeader() {
  const initialUser = useInitialUser();
  const { data } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const user = data?.user ?? initialUser;

  return (
    <header className="fixed top-5 left-1/2 z-50 flex h-24 w-[95%] -translate-x-1/2 items-center justify-between overflow-visible rounded-lg border-b bg-white px-8 py-2 shadow-lg">
      <Logo />

      <div className="flex items-center gap-4">
        {user ? (
          <UserMenu />
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
