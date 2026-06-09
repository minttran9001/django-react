"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGetMeQuery, useLogoutMutation } from "@/lib/api/authApi";
import { useInitialUser } from "@/providers/InitialUserContext";

export default function HomePage() {
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

  if (!user) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Django React App</CardTitle>
            <CardDescription>
              Sign in to access your notes and dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Go to login</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome, {user.email}</CardTitle>
          <CardDescription>
            You are signed in. Your session is stored in secure httpOnly
            cookies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
