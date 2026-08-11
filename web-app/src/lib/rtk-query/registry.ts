import { authApi } from "@/lib/api/authApi";
import { courtCenterApi } from "@/lib/api/courtCenterApi";
import { conversationApi } from "@/lib/api/conversationApi/conversationApi";
import { messageApi } from "@/lib/api/messageApi/messageApi";
export const rtkQueryRegistry = {
  authApi,
  courtCenterApi,
  conversationApi,
  messageApi,
} as const;

export type RtkQueryApiId = keyof typeof rtkQueryRegistry;
export type RtkQueryEndpointName<ApiId extends RtkQueryApiId> =
  keyof (typeof rtkQueryRegistry)[ApiId]["endpoints"];

export type RtkQueryDataType<
  ApiId extends RtkQueryApiId,
  EndpointName extends RtkQueryEndpointName<ApiId>,
> = Parameters<(typeof rtkQueryRegistry)[ApiId]["endpoints"][EndpointName]>[1];
