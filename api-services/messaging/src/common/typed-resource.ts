export const RESOURCE_USER = "user";
export const RESOURCE_CONVERSATION = "conversation";
export const RESOURCE_MESSAGE = "message";

export function typedResource<T>(type: string, data: T) {
  return { type, data };
}
