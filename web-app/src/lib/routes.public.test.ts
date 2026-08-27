/**
 * Lightweight self-check for public route matching.
 * Run: npx --yes tsx src/lib/routes.public.test.ts
 */
import assert from "node:assert/strict";

import { isPublicRoute } from "./routes";

assert.equal(isPublicRoute("/"), true);
assert.equal(isPublicRoute("/listings"), true);
assert.equal(isPublicRoute("/listings/1"), true);
assert.equal(isPublicRoute("/listings/42"), true);

assert.equal(isPublicRoute("/listings/mine"), false);
assert.equal(isPublicRoute("/listings/create"), false);
assert.equal(isPublicRoute("/listings/1/edit"), false);
assert.equal(isPublicRoute("/listings/1/delete"), false);
assert.equal(isPublicRoute("/listings/abc"), false);
assert.equal(isPublicRoute("/bookings"), false);
assert.equal(isPublicRoute("/login"), false);

console.log("routes.public.test.ts: ok");
