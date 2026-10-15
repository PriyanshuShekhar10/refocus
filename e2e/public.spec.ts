import { expect, test } from "@playwright/test";

/** Checks that need no account and change nothing. Safe against production. */
test.describe("public", () => {
  test("sign-in page renders @mobile", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test("signed-out visitors are sent to sign in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("signed-out API calls get 401 JSON", async ({ request }) => {
    for (const path of ["/api/users/me", "/api/sessions", "/api/friends"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(401);
      expect(typeof (await res.json()).error, path).toBe("string");
    }
  });

  test("wrong password shows an error and stays on sign in", async ({ page }) => {
    await page.goto("/auth/login");
    await page.locator("#email").fill("nobody-e2e@refocus.co.in");
    await page.locator("#password").fill("definitely-wrong-1A!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole("alert").or(page.locator('[role="alert"], .text-red-500, [data-error]')).first()).toBeVisible();
  });
});
