export const MARKETPLACE_TYPES = [
  "user",
  "conversation",
  "courtCenter",
  "message",
] as const;

export type MarketplaceType = (typeof MARKETPLACE_TYPES)[number];

export type TypedResource<T = unknown> = {
  type: MarketplaceType;
  data: T;
};

export function isTypedResource(value: unknown): value is TypedResource {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.type === "string" &&
    MARKETPLACE_TYPES.includes(record.type as MarketplaceType) &&
    "data" in record
  );
}

export function unwrapDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => unwrapDeep(item)) as T;
  }
  if (isTypedResource(value)) {
    return unwrapDeep(value.data) as T;
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as object)) {
      next[key] = unwrapDeep(nested);
    }
    return next as T;
  }
  return value;
}

export function collectTypedResources(
  value: unknown,
  acc: TypedResource[] = [],
): TypedResource[] {
  if (Array.isArray(value)) {
    for (const item of value) collectTypedResources(item, acc);
    return acc;
  }
  if (isTypedResource(value)) {
    acc.push(value);
    collectTypedResources(value.data, acc);
    return acc;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value as object)) {
      collectTypedResources(nested, acc);
    }
  }
  return acc;
}
