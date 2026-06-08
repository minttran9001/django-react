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

export default function HomePage() {
  const router = useRouter();
  const { data, isLoading } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const handleLogout = async () => {
    await logout().unwrap();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (!data?.user) {
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
          <CardTitle>Welcome, {data.user.email}</CardTitle>
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
