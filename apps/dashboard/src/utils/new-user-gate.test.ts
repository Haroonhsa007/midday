import { afterEach, expect, test } from "bun:test";
import { isBlockedNewUser } from "./new-user-gate";

const originalCutoff = process.env.NEW_USER_CUTOFF;
afterEach(() => {
  if (originalCutoff === undefined) delete process.env.NEW_USER_CUTOFF;
  else process.env.NEW_USER_CUTOFF = originalCutoff;
});
test("fresh installs accept new users without a cutoff", () => {
  delete process.env.NEW_USER_CUTOFF;
  expect(isBlockedNewUser(new Date())).toBe(false);
  process.env.NEW_USER_CUTOFF = "";
  expect(isBlockedNewUser(new Date())).toBe(false);
});
test("configured cutoff blocks new sign-ups and preserves older accounts", () => {
  process.env.NEW_USER_CUTOFF = "2026-01-01T00:00:00Z";
  expect(isBlockedNewUser(new Date("2026-02-01"))).toBe(true);
  expect(isBlockedNewUser("2025-12-31T00:00:00Z")).toBe(false);
  expect(isBlockedNewUser(undefined)).toBe(false);
});
