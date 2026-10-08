/**
 * Lightweight assertion that formatMessageResource stays aligned with formatMessage.
 * Run: node --experimental-strip-types is not used; this mirrors the required fields.
 *
 * The Nest serializer is TypeScript; this file documents the contract and fails CI
 * style checks when the source regresses via a string scan of the sibling .ts file.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "chat.serializer.ts"), "utf8");

const resourceFn = source.match(
  /export function formatMessageResource\([\s\S]*?\n\}/,
)?.[0];
assert.ok(resourceFn, "formatMessageResource must exist");
assert.match(
  resourceFn,
  /formatMessage\(message\)/,
  "formatMessageResource must delegate to formatMessage so sender/conversationId are included",
);
assert.doesNotMatch(
  resourceFn,
  /id:\s*requireId\(message\.id\),\s*\n\s*clientId:/,
  "formatMessageResource must not inline a truncated field list",
);

console.log("formatMessageResource contract ok");
