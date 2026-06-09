"use client";

import { LandingHeader } from "@/components/landing/LandingHeader";

import { CreateCourtCenterForm } from "./CreateCourtCenterForm";

export function CreateCourtCenterView() {
  return (
    <div className="min-h-screen bg-muted/30">
      <LandingHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-16 pt-36">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Create a listing
          </h1>
          <p className="text-muted-foreground">
            Set up your court center and add the courts players can book.
          </p>
        </div>
        <CreateCourtCenterForm />
      </main>
    </div>
  );
}
