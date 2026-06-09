"use client";


import { CreateCourtCenterForm } from "./CreateCourtCenterForm";

export function CreateCourtCenterView() {
  return (
    <div>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create a listing
        </h1>
        <p className="text-muted-foreground">
          Set up your court center and add the courts players can book.
        </p>
      </div>
      <CreateCourtCenterForm />
    </div>
  );
}
