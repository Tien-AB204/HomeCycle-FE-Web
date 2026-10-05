import assert from "node:assert/strict";
import test from "node:test";
import { hasSeenGuide, isNewAccount } from "./onboardingGuide.js";

test("only accounts joined within 7 days count as new", () => {
  const now = new Date("2026-10-05T00:00:00Z").getTime();

  assert.equal(isNewAccount("2026-10-01T00:00:00Z", now), true);
  assert.equal(isNewAccount("2026-09-20T00:00:00Z", now), false);
  assert.equal(isNewAccount(null, now), true);
  assert.equal(isNewAccount("not a date", now), true);
});

test("unreadable storage never forces the guide", () => {
  assert.equal(hasSeenGuide("u1"), true);
});
