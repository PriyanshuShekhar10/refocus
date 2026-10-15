import { expect, test, type Page } from "@playwright/test";

export type TestUser = { email: string; password: string };

function user(prefix: "A" | "B"): TestUser | null {
  const email = process.env[`E2E_USER_${prefix}_EMAIL`];
  const password = process.env[`E2E_USER_${prefix}_PASSWORD`];
  return email && password ? { email, password } : null;
}

export const userA = user("A");
export const userB = user("B");

/** Skip the current test unless the dedicated test accounts are configured. */
export function requireTestUsers(...needed: Array<TestUser | null>) {
  test.skip(
    needed.some((u) => !u),
    "Set E2E_USER_A_* / E2E_USER_B_* to run signed-in flows",
  );
}

export async function signIn(page: Page, u: TestUser) {
  await page.goto("/auth/login");
  await page.locator("#email").fill(u.email);
  await page.locator("#password").fill(u.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/dashboard**");
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Next 30-minute slot at least `minAheadMin` minutes from now, as ISO. */
export function nextSlotIso(minAheadMin = 5): string {
  const step = 30 * 60_000;
  const t = Date.now() + minAheadMin * 60_000;
  return new Date(Math.ceil(t / step) * step).toISOString();
}
