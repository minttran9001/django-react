import { createEntityAdapter, type EntityState } from "@reduxjs/toolkit";
import type { PublicUser } from "@/lib/types/conversation";

export const usersAdapter = createEntityAdapter<PublicUser, number>({
  selectId: (user) => user.id,
});

export type UsersState = EntityState<PublicUser, number>;

export const usersInitialState = usersAdapter.getInitialState();
