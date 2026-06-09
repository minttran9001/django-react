import { configureStore } from "@reduxjs/toolkit";

import { authApi } from "@/lib/api/authApi";
import { baseApi } from "@/lib/api/baseApi";
import { courtCenterApi } from "@/lib/api/courtCenterApi";

export function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      [authApi.reducerPath]: authApi.reducer,
      [courtCenterApi.reducerPath]: courtCenterApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        baseApi.middleware,
        authApi.middleware,
        courtCenterApi.middleware,
      ),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
