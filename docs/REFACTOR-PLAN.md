# Refactor plan: make the dashboard swappable

> **How we run this:** one phase at a time. Each phase ships on its own, only when CI is green, coverage hasn't dropped, and the contract/E2E suites pass. Tick the boxes below as phases land.

## Progress

- [ ] **Phase 0:** Safety net: CI gate, coverage baseline, API contract tests, characterisation tests, Playwright E2E, provider contract suites
- [ ] **Phase 1:** Video provider layer (`lib/providers/video`), `ClientCall` split, `video_provider` per session
- [ ] **Phase 2:** Email provider layer (`lib/providers/email`)
- [ ] **Phase 3:** Route wrappers `withUser` / `withAdmin` / `withCron`; migrate the 81 routes
- [ ] **Phase 4:** Repositories for sessions, users and community
- [ ] **Phase 5:** Payments-ready skeleton and entitlements (`can(user, feature)`)
- [ ] **Phase 6:** Split the largest components (AdminPanel, settings, FriendChat)
- [ ] **Config:** `lib/config.ts`, typed and validated provider env vars

## Context
You want to be able to change vendors later (video SDK, email, realtime, push) or add things like a payment gateway, without hunting through the whole codebase. Today, vendor code is spread across many files:

| Concern | Today | Coupling |
|---|---|---|
| Video calls (Daily) | `lib/daily.ts`, `lib/dailyAccounts.ts`, `lib/dailyEnv.ts`, plus Daily Prebuilt embedded directly in `ClientCall.tsx` | Medium: the server side is contained, but the call screen is Daily-only |
| Email (Resend) | 9 `lib/email/send*.ts` files, each calling `resend.emails.send` itself | High |
| Realtime (Ably) | Publishing is centralised in `lib/ably-server.ts`; 15 files import Ably | Low–medium |
| Push (Firebase) | `lib/push/*` | Low (already a module) |
| Auth | `getServerSession(authOptions)` repeated **81 times** in API routes, each with its own 401 handling | High (repetition) |
| Database | 55 of 110 API routes query MongoDB collections directly | High |
| Payments | Nothing yet; no idea of a plan or premium user | n/a |
| UI | Several 1,000–2,800-line components (`AdminPanel` 2,783, `FriendChat` 1,468, `settings` 1,269, `ClientCall` 1,135) | Hard to change safely |

**Goal:** each vendor sits behind a small interface in one folder, so swapping it means writing one new adapter file and changing one setting. A payment gateway gets a ready place to plug into.

**Constraints:**
- Behaviour stays identical.
- The API contract stays unchanged, because the Expo app uses the same endpoints.
- Done in small, separately deployable steps, each covered by the existing 468 tests.

## Phase 0: Safety net first (before any refactor)
Today there are 468 Vitest unit tests, but **no automatic test run on push**, **no browser tests**, and **no coverage measurement**. A refactor of this size needs all three, so nothing reaches production broken.

1. **CI gate** (`.github/workflows/ci.yml`): on every push and PR to `test-dash`, run typecheck, lint, `vitest run` with coverage, and `next build`. Deploys happen only from a green commit. The existing Vercel deploy step stays as it is, but I deploy only after CI passes.
2. **Coverage baseline:** add `@vitest/coverage-v8` and record current coverage for `lib/` and `app/api/`. Every phase must keep or raise it, and every moved function keeps its tests.
3. **API contract tests (protects the Expo app):** for each endpoint the app uses, assert the response *shape* (status codes, field names and types). The list comes from the app's `src/lib/api/refocus.ts`, read only. Covers sessions list, detail, join, leave and delete; Daily token; users/me; matching-profile; friends; requests; community; reports; push devices. Written **before** the refactor against current behaviour, so any accidental change fails the build.
4. **Characterisation tests for code that's about to move** (written first, against current behaviour):
   - Daily room and token creation, including multi-account rotation;
   - each email sender: recipient, subject and template chosen, with a fake mail adapter;
   - the 401/403/429 behaviour of a sample of routes from each area;
   - session repository behaviour: join, leave, delete rules, the started-session rules, no-show cleanup.
5. **End-to-end browser tests (Playwright, `e2e/`):** run against a Vercel preview deployment with two seeded test accounts, never real users:
   - sign in, book a slot, second account joins, both see "matched";
   - open the session page; the call frame loads (provider token issued);
   - report a bug; leave or delete rules; settings save; account deletion on a throwaway account;
   - admin: tabs load, rematch dry run.

   Run in CI on preview deploys, and before every production deploy in this project.
6. **Provider contract tests:** one shared test suite per provider interface (video, email, payments) that every adapter must pass. A fake adapter passes it in unit tests, so a future LiveKit or Razorpay adapter is checked against the same rules.

**Rule for every later phase:** tests first, then the move. A phase ships only when CI is green, coverage hasn't dropped, the contract and E2E suites pass on the preview deploy, and a production smoke check passes after deploy. If anything regresses after deploy, roll back immediately with `vercel rollback`.

## Approach: `lib/providers/` with one interface and adapter per concern
Each provider has `types.ts` (the interface), one adapter (for example `daily.ts`), and `index.ts`, which picks the adapter from an environment variable (default: the current vendor). The rest of the app imports only `@/lib/providers/<x>`.

### Phase 1: Video (most likely swap; prepares for LiveKit)
- `lib/providers/video/types.ts`: `createRoom(sessionId, opts)`, `createJoinToken(roomName, user, opts)`, `deleteRoom`, and a `clientConfig` (provider name plus the URL or token the browser needs).
- `daily.ts` adapter: moves the existing `createOrGetDailyRoom` / `createDailyMeetingToken` logic and multi-account rotation out of `lib/daily*.ts`, unchanged.
- **Routes:**
  - `app/api/sessions/[id]/daily/token/route.ts`: becomes a provider-neutral `/video/token` route. The old path stays as an alias so existing app builds keep working.
  - `app/api/admin/daily/route.ts` and `lib/adminTestCall.ts` move to the interface.
- **Client:** split `ClientCall.tsx` into:
  - a `useSessionCall` hook for the session logic (timer, attendance, report, partner info);
  - a `<VideoStage provider=…>` component holding only the Daily Prebuilt embed.

  A future `LiveKitStage` would then sit beside it with nothing else changing.
- Store `video_provider` on each session (default `daily`), so a future migration can run both providers side by side.

### Phase 2: Email
- `lib/providers/email/`: `send({ to, subject, html, text, tags })`, with a Resend adapter that includes the existing sandbox and failure logging.
- The 9 `send*Email.ts` files keep building their templates but call `email.send()`. Swapping to Postmark, SES or similar becomes one file.

### Phase 3: Auth and route helpers (removes most of the repetition)
- `lib/api/handler.ts`: `withUser(handler)`, `withAdmin(handler)` and `withCron(handler)` wrappers. They resolve the session, return 401/403, run the existing rate limit when asked, and turn `ReportValidationError`-style errors into JSON.
- Migrate the 81 routes mechanically in batches by area (sessions, community, friends, admin), with no logic changes.

### Phase 4: Data access for core areas
- Small repository modules for the areas most routes touch:
  - `lib/repos/sessions.ts`: find by id, list for user, add or remove participant, using the existing `hasSessionStarted` and overlap helpers;
  - `lib/repos/users.ts`;
  - `lib/repos/community.ts`.
- Routes call these instead of `db.collection(...)`. Collection names and query shapes live in one place. This is also where `video_provider` and a future `plan` field are read.
- Not a full ORM; less-used areas stay as they are.

### Phase 5: Payments-ready skeleton (no gateway yet)
- `lib/providers/payments/types.ts`: `createCheckout`, `handleWebhook`, `getCustomerPortalUrl`.
- `lib/entitlements.ts`: `getPlan(user)` → `"free"` for everyone today, and `can(user, feature)`.
  - Feature gates go through `can()`, so adding Razorpay or Stripe later means one adapter plus a `/api/billing/webhook` route.
  - Everything returns "allowed", so nothing changes for users.

### Phase 6: Split the largest components (as the areas are touched)
- `AdminPanel.tsx` → one file per tab, since `AdminBugs` and the Rematch tab already follow this pattern.
- `settings.tsx` → one file per section.
- `FriendChat.tsx` → list, thread and composer.
- Pure moves; no visual changes.

### Config
- `lib/config.ts`: one typed place that reads and validates the environment variables for each provider (for example `VIDEO_PROVIDER=daily`, `EMAIL_PROVIDER=resend`), failing clearly on startup when something required is missing.

## Out of scope
- The Expo app repo. The API contract is kept, and the old Daily token route stays as an alias.
- The marketing site.
- Actually integrating LiveKit or a payment gateway. Each of those is its own follow-up, made easy by this work.

## Order and delivery
Each phase is its own commit and deploy: **0** → 1 → 2 → 3 → 4 → 5, with 6 done alongside. E2E tests need two test accounts (e.g. `e2e-a@refocus.co.in` and `e2e-b@refocus.co.in`); I'll create them only with your OK, and they're excluded from stats and matching. Phases 1–3 deliver most of the value; 4–6 can wait if needed.

## Verification (every phase)
- `npx vitest run` (all 468 tests) plus `npx tsc --noEmit`. Add unit tests for each provider interface, using a fake adapter, and for the `withUser` / `withAdmin` wrappers.
- A clean production build from a fresh checkout, then deploy.
- Smoke-test in production after each deploy:
  - join a session call from the website and from the app (video phase);
  - trigger a match email and a password reset (email phase);
  - sign in, book, leave and report (auth and data phases);
  - open the admin tabs and the Daily test call.
- After each step, `grep` confirms the vendor import exists only inside `lib/providers/<x>/`.
