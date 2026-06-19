import type { LineItemSlotInput } from "@/lib/api/lineItem";
import type { Transaction } from "../types/transaction";

export type CheckoutDraft = {
  court_center_id: string;
  court_id: number;
  slots: LineItemSlotInput[];
};

export const CHECKOUT_PATH = "/checkout";
export const CHECKOUT_DRAFT_KEY = "checkout:draft";
export const CHECKOUT_PENDING_TX_KEY = "checkout:pending-transaction";

function isValidSlot(value: unknown): value is LineItemSlotInput {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LineItemSlotInput).date === "string" &&
    typeof (value as LineItemSlotInput).start === "string" &&
    typeof (value as LineItemSlotInput).end === "string"
  );
}

export function isCheckoutDraft(value: unknown): value is CheckoutDraft {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const draft = value as CheckoutDraft;
  return (
    typeof draft.court_center_id === "string" &&
    draft.court_center_id.length > 0 &&
    Number.isFinite(draft.court_id) &&
    draft.court_id > 0 &&
    Array.isArray(draft.slots) &&
    draft.slots.length > 0 &&
    draft.slots.every(isValidSlot)
  );
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
}

export function loadCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    return isCheckoutDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearCheckoutDraft(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
}

export function savePendingCheckoutTransaction(transaction: Transaction): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(CHECKOUT_PENDING_TX_KEY, JSON.stringify(transaction));
}

export function loadPendingCheckoutTransaction(): Transaction | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(CHECKOUT_PENDING_TX_KEY);
  if (!raw) {
    return null;
  }

  const parsed: Transaction = JSON.parse(raw);
  return parsed?.id && Number.isFinite(parsed.id) && parsed.id > 0
    ? parsed
    : null;
}

export function clearPendingCheckoutTransaction(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(CHECKOUT_PENDING_TX_KEY);
}

export function clearCheckoutSession(): void {
  clearCheckoutDraft();
  clearPendingCheckoutTransaction();
}

/** @deprecated Use saveCheckoutDraft + CHECKOUT_PATH instead */
export function buildCheckoutUrl(draft: CheckoutDraft): string {
  saveCheckoutDraft(draft);
  return CHECKOUT_PATH;
}

export function parseCheckoutDraft(
  searchParams: URLSearchParams,
): CheckoutDraft | null {
  const courtCenterIdRaw = searchParams.get("court_center_id");
  const courtIdRaw = searchParams.get("court_id");
  const slotsRaw = searchParams.get("slots");

  if (!courtCenterIdRaw || !courtIdRaw || !slotsRaw) {
    return null;
  }

  const court_center_id = courtCenterIdRaw;
  if (typeof court_center_id !== "string" || court_center_id.length === 0) {
    return null;
  }

  const court_id = Number(courtIdRaw);
  if (!Number.isFinite(court_id) || court_id <= 0) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(slotsRaw);
    if (!isCheckoutDraft({ court_center_id, court_id, slots: parsed })) {
      return null;
    }
    return { court_center_id, court_id, slots: parsed as LineItemSlotInput[] };
  } catch {
    return null;
  }
}

export function resolveCheckoutDraft(search: string): CheckoutDraft | null {
  const fromUrl = parseCheckoutDraft(new URLSearchParams(search));
  const fromStorage = loadCheckoutDraft();
  const resolved = fromUrl ?? fromStorage;

  if (fromUrl) {
    saveCheckoutDraft(fromUrl);
  }

  return resolved;
}

export function buildCheckoutLoginNext(): string {
  return CHECKOUT_PATH;
}
