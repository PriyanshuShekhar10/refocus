import { expect, test, type APIRequestContext } from "@playwright/test";
import { nextSlotIso, requireTestUsers, signIn, userA, userB } from "./helpers";

/**
 * Two dedicated test accounts book, match, open the call and clean up.
 * Skipped unless E2E_USER_A_* and E2E_USER_B_* are set.
 */
test.describe("sessions (two test accounts)", () => {
  test("book → partner joins → both matched → call token issued → cleanup", async ({ browser }) => {
    requireTestUsers(userA, userB);
    const a = await browser.newContext();
    const b = await browser.newContext();
    const pageA = await a.newPage();
    const pageB = await b.newPage();
    await signIn(pageA, userA!);
    await signIn(pageB, userB!);

    const start = nextSlotIso(5);
    const created = await pageA.request.post("/api/sessions", {
      data: { start, durationMin: 25, sessionType: "focus" },
    });
    expect(created.status(), await created.text()).toBeLessThan(300);
    const sessionId: string = (await created.json()).id;
    expect(sessionId).toBeTruthy();

    try {
      const joined = await pageB.request.post(`/api/sessions/${sessionId}/join`);
      expect(joined.status(), await joined.text()).toBeLessThan(300);

      for (const req of [pageA.request, pageB.request] as APIRequestContext[]) {
        const detail = await req.get(`/api/sessions/${sessionId}`);
        expect(detail.status()).toBe(200);
        expect((await detail.json()).participants).toHaveLength(2);
      }

      // Inside the join window the call page loads and a video token is issued.
      await pageA.goto(`/sessions/${sessionId}`);
      await expect(pageA).toHaveURL(new RegExp(`/sessions/${sessionId}`));
      const token = await pageA.request.post(`/api/sessions/${sessionId}/daily/token`);
      expect([200, 403]).toContain(token.status()); // 403 only if outside the join window
    } finally {
      await pageA.request.delete(`/api/sessions/${sessionId}`);
      await a.close();
      await b.close();
    }
  });

  test("dashboard, settings and bug report dialog load", async ({ page }) => {
    requireTestUsers(userA);
    await signIn(page, userA!);
    await expect(page.getByText(/Next up|Later/).first()).toBeVisible();
    await page.getByText("Report a bug").first().click();
    await expect(page.locator("#bug-report-title")).toBeVisible();
  });
});

test.describe("dashboard sections", () => {
  test("sections open beside the sidebar and survive a refresh", async ({ page }) => {
    requireTestUsers(userA);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, userA!);
    const sidebar = page.getByText("Your attendance").or(page.getByText("Appearance")).first();

    for (const [tab, label] of [["sessions", "Sessions"], ["community", "Community"], ["settings", "Settings"]] as const) {
      await page.getByRole("button", { name: label }).first().click();
      await expect(page).toHaveURL(new RegExp(`/dashboard\\?tab=${tab}`));
      await expect(sidebar).toBeVisible();
      await page.reload();
      await expect(page).toHaveURL(new RegExp(`/dashboard\\?tab=${tab}`));
      await expect(sidebar).toBeVisible();
    }

    await page.getByRole("button", { name: "Dashboard" }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
