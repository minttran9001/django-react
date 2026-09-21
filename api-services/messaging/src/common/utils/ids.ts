/** Django BigAutoField IDs are safe as JS numbers for this app. */
export function idNum(value: bigint | number | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === "bigint" ? Number(value) : value;
}

export function requireId(value: bigint | number): number {
  return typeof value === "bigint" ? Number(value) : value;
}
