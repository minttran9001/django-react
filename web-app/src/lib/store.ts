import { configureStore } from "@reduxjs/toolkit";

import { authApi } from "@/lib/api/authApi";
import { baseApi } from "@/lib/api/baseApi";
import { courtCenterApi } from "@/lib/api/courtCenterApi";
import { conversationApi } from "@/lib/api/conversationApi/conversationApi";
import reducers from "@/lib/slices";
import { messageApi } from "@/lib/api/messageApi/messageApi";
import "@/lib/api/usersApi";

export function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      [authApi.reducerPath]: authApi.reducer,
      [courtCenterApi.reducerPath]: courtCenterApi.reducer,
      [conversationApi.reducerPath]: conversationApi.reducer,
      [messageApi.reducerPath]: messageApi.reducer,
      ...reducers,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          isSerializable: (value: unknown) =>
            value instanceof Date ||
            value === undefined ||
            value === null ||
            typeof value === "boolean" ||
            typeof value === "number" ||
            typeof value === "string" ||
            typeof value === "bigint" ||
            Array.isArray(value) ||
            (typeof value === "object" &&
              Object.getPrototypeOf(value) === Object.prototype),
        },
      }).concat(
        baseApi.middleware,
        authApi.middleware,
        courtCenterApi.middleware,
        conversationApi.middleware,
        messageApi.middleware,
      ),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
