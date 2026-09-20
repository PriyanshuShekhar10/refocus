# Refocus API for mobile apps

> **For AI / automated clients — fetch the machine catalog (do not paste this file):**
>
> - `GET https://dashboard.refocus.co.in/api/docs/mobile` → JSON (CORS `*`)
> - `GET https://dashboard.refocus.co.in/api/docs/mobile?format=md` → this markdown
> - `GET https://refocus.co.in/developers/mobile-api.json` → same JSON (static)
>
> Repo source: [`docs/mobile-api.json`](./mobile-api.json) (60+ routes, exact fields/errors). Rebuild with `python3 scripts/build-mobile-api-catalog.py`.

Mobile-oriented reference for building a React Native (or other native) client against the Refocus product API.

**Canonical machine source:** `docs/mobile-api.json`  
**Human / prose mirror:** this file + [refocus.co.in/developers](https://refocus.co.in/developers)

> There is **no Bearer / access-token auth** for end users today. Sessions are NextAuth JWTs stored in **httpOnly cookies**. Your RN HTTP client **must** use a cookie jar.

---

## Overview

| | |
| --- | --- |
| **Base URL** | `https://dashboard.refocus.co.in` |
| **JSON APIs** | `Content-Type: application/json` |
| **Auth form posts** | `Content-Type: application/x-www-form-urlencoded` (NextAuth login/signout) |
| **Marketing site** | `https://refocus.co.in` (Astro; **not** the API host) |
| **Auth** | NextAuth v4 credentials (email/password or Firebase ID token) → session cookie |

All paths below are relative to the base URL. Always call **dashboard.refocus.co.in**, never the marketing apex, for `/api/*`.

### Minimum viable product path

1. Register → verify email (deep link) → login (cookies)
2. `GET /api/users/me` → require `emailVerified`
3. List / create / join sessions
4. Inside call window → Daily token → Daily React Native SDK
5. Ably token → friend chat (+ optional global chat)
6. Sign out

There is **no in-session text chat API** beyond Daily A/V. In-call extras are tasks + cheer alerts over Ably.

---

## Authentication & cookies

### How auth works

1. `POST /api/auth/register` creates the user (**no** session cookie).
2. User verifies email (link opens web or your deep link).
3. Sign in via NextAuth credentials callback (sets session cookie).
4. Send that cookie on every later API call.
5. Sign out via NextAuth signout (clears cookie).

**Production cookies** (`AUTH_COOKIE_DOMAIN=.refocus.co.in`):

| Cookie | Purpose | Domain |
| --- | --- | --- |
| `__Secure-next-auth.session-token` | Session JWT | `.refocus.co.in` |
| `__Host-next-auth.csrf-token` | NextAuth CSRF | **host-only** (`dashboard.refocus.co.in`) |

Locally (no `AUTH_COOKIE_DOMAIN`): `next-auth.session-token`, `next-auth.csrf-token`.

Flags: `httpOnly`, `sameSite=lax`, `path=/`, `secure` on HTTPS.

### React Native cookie client

- Persist **all** `Set-Cookie` values from dashboard responses (jar keyed by host).
- CSRF is `__Host-` → store/send only for `dashboard.refocus.co.in`.
- Session may be scoped to `.refocus.co.in` — still send it when calling the dashboard host.
- **Never** send a forged `Origin` / `Referer`. Middleware returns **403** `{ "error": "Cross-origin request blocked" }` if those hosts ≠ request host. Omitting both is fine for native fetch.
- No CORS headers — use native HTTP, not a random WebView origin against the API.
- Do **not** expect `Authorization: Bearer …` for user APIs.

### Register

`POST /api/auth/register`  
`Content-Type: application/json`

| Field | Required | Notes |
| --- | --- | --- |
| `email` | yes | |
| `password` | yes | Weak → `requirements` in body |
| `name` or `firstName` | no | |
| `lastName` | no | |

**200** `{ "id": "<userId>" }`

| Status | Meaning |
| --- | --- |
| 400 | Missing/invalid/disposable email, weak password |
| 403 | Banned email |
| 409 | User already exists |
| 429 | Auth rate limit |

Registration emails a verification link. It does **not** log the user in.

### Login (exact NextAuth protocol)

There is **no** `POST /api/auth/login`.

```http
GET /api/auth/csrf
→ 200 { "csrfToken": "…" }  (+ Set-Cookie CSRF)
```

```http
POST /api/auth/callback/credentials
Content-Type: application/x-www-form-urlencoded
```

**Body fields (form-urlencoded):**

| Field | Value |
| --- | --- |
| `csrfToken` | from step 1 |
| `callbackUrl` | e.g. `https://dashboard.refocus.co.in/dashboard` |
| `json` | literal `true` (required for JSON response in RN) |
| `email` + `password` | credentials login |
| **or** `firebaseIdToken` (+ optional `displayName`) | Google via Firebase |

**With `json=true`:**

- Success: **200** `{ "url": "<callbackUrl>" }` + `Set-Cookie` session token  
- Failure: often **401** `{ "url": "…/api/auth/error?error=CredentialsSignin" }` (or similar). Parse `error` from the `url` query.

Without `json=true` you get a **302** — avoid that in RN.

Optional probe: `GET /api/auth/session` → `{ "user": { "id", "email", "name", "image" }, "expires" }` when cookie present; empty/null user when logged out.

### Sign out

```http
POST /api/auth/signout
Content-Type: application/x-www-form-urlencoded
```

Body: `csrfToken`, `callbackUrl`, `json=true` → `{ "url": "…" }` and cleared session cookie.

### Email verification (deep links)

`GET /api/auth/verify-email?token=…` is a **browser redirect**, not JSON:

- Success → `/auth/verify-email?status=success`
- Invalid/missing → `status=invalid` or `missing`

For RN: open the email link in an in-app browser / universal link / custom scheme that lands on your verify screen, or tell users to verify in the mail client then return to the app and re-check `GET /api/users/me`.

`POST /api/auth/resend-verification` (session required) → `{ "ok": true }` or `{ "ok": true, "alreadyVerified": true }`.

### Password reset

| Method | Path | Body / query | Success |
| --- | --- | --- | --- |
| `POST` | `/api/auth/forgot-password` | `{ "email" }` | `{ "ok": true }` (always; no enumeration) |
| `GET` | `/api/auth/reset-password?token=` | | `{ "valid": true \| false }` |
| `POST` | `/api/auth/reset-password` | `{ "token", "password" }` | `{ "ok": true }` |

### Change password

`POST /api/auth/change-password` (session)  
`{ "currentPassword", "newPassword" }` → `{ "ok": true }`

---

## Booking & access gates

Most product **mutations** require:

1. Valid session cookie  
2. Verified email  
3. Not community-banned (where checked)

### Email not verified — **403**

```json
{
  "error": "Verify your email to use this feature. You can browse until then.",
  "code": "EMAIL_NOT_VERIFIED"
}
```

### First-session attendance gate — **403**

Users with **zero attended sessions** may only hold **one** upcoming booking / pending session request at a time:

```json
{
  "error": "Attend your first session before booking another. Finish the one you already have, then you can schedule more.",
  "code": "FIRST_SESSION_REQUIRED"
}
```

Applies to: create session, join, create session-request, accept session-request, chat `session-request` messages.

### Call window

| Constant | Value |
| --- | --- |
| `CALL_JOIN_GRACE_MINUTES` | **10** (API allows Daily token from 10 min before start until 10 min after end) |
| `CALL_JOIN_VISIBLE_MINUTES` | **10** (when UI should show Join) |
| `WRAP_UP_MINUTES` | **5** (token expiry padding after end) |

Outside the window, Daily token returns **403**.

---

## Current user

### `GET /api/users/me`

**200**

```json
{
  "user": {
    "email": "…",
    "username": "…",
    "name": "…",
    "firstname": "…",
    "lastname": "…",
    "about": "…",
    "aboutMe": {},
    "interests": [],
    "location": null,
    "website": null,
    "avatarUrl": "…",
    "emailVerified": true,
    "communityBanned": false,
    "communityMuted": false,
    "communityMutedUntil": null,
    "attendance": { "percent": 0, "booked": 0, "attended": 0 }
  }
}
```

### `PATCH /api/users/me`

Verified email. Optional: `username`, `firstname`, `lastname`, `about`, `aboutMe`, `interests`, `location`, `website`.  
Username: `^[a-z0-9_-]{3,20}$`. **409** if taken.

### Username availability

`GET /api/users/username?q=` → `{ "available": true|false }` (or `available: false` + format `error`).

### Preferences

`GET` / `PATCH` `/api/users/preferences`  

Keys: `defaultSessionLength` (25|50|75), `focusModeDefault`, `publicProfile`, `allowFriendRequests`, `showInGlobalChat`, `emailSessionReminders`, `sessionReminderTiming`, `emailFriendRequests`, `emailWeeklyDigest`, `emailCommunityMentions`, `timezone`, `dashboardWallpaperUrl`.

Writes need verified email. Wallpaper is mainly web dashboard chrome — optional for mobile.

### Avatar

`POST /api/users/me/avatar` — `multipart/form-data`, field name **`avatar`**.  
JPEG/PNG/WebP/GIF, max **5 MB**. Session + verified email.

---

## Sessions

Durations: **25 | 50 | 75**.  
Types: **`focus` | `deep-work` | `learning`**.  
Start must be on a **30-minute** UTC mark (`:00` / `:30`). Max horizon: **90 days**.

### List — `GET /api/sessions`

| Query | Behavior |
| --- | --- |
| `from` + `to` | ISO range — open slots + yours + occupied chips |
| `mineUpcoming=1` | Your future/in-progress (≤100); no `from`/`to` |

**200** `{ "currentUserId", "sessions": [...], "occupied": [...] }`

**Session (list item):**

- `id`, `owner_id`, `start`, `end`, `durationMin`, `sessionType`, `name`, `color`
- `status`: `available` | `booked` | `in-progress` | `completed`
- `participants[]` (incl. `quiet`, profile fields, `attendance`)
- `owner` object

**Occupied chip:** `{ id, start, end, participantCount, people: [{ id, avatarUrl, initials }] }`

### Create — `POST /api/sessions`

```json
{
  "start": "2026-09-21T10:00:00.000Z",
  "durationMin": 50,
  "sessionType": "focus",
  "quietOwner": false
}
```

**200** `{ "id": "<sessionId>" }`  
**409** overlap · **400** validation · **403** email / first-session / ban

### Get one — `GET /api/sessions/[id]`

Sparse compared to list — use list for calendar fields:

```json
{
  "id": "…",
  "owner_id": "…",
  "start": "…",
  "end": "…",
  "participants": [{ "user_id", "joined_at", "quiet?" }],
  "youQuiet": false,
  "partner": { "userId", "name", "username", "avatarUrl" }
}
```

Booked sessions return **404** to non-participants.

### Join — `POST /api/sessions/[id]/join`

Body (optional): `{ "quiet": true }` → `{ "ok": true }` (idempotent if already in).

| Status | Example |
| --- | --- |
| 400 | Already started / already ended |
| 409 | Already 2 participants / time overlap |
| 403 | Email / first-session / ban / blocked |

### Leave — `POST /api/sessions/[id]/leave`

Body optional: `{ "message" }` (≤500) → `{ "ok": true }`  
Owner cannot leave (**400** — use DELETE). Non-participant → **403**.

### Cancel — `DELETE /api/sessions/[id]`

Owner only. Body optional: `{ "message" }` → `{ "ok": true }`.  
If a partner is present, ownership can transfer and the slot becomes available again (not always a hard delete).

### Personalize — `PATCH /api/sessions/[id]`

`{ "name"?, "color"? }` → `{ "ok": true }`  
Name: participant. Color: owner (`#RGB` / `#RRGGBB`).

### Daily.co token — `POST /api/sessions/[id]/daily/token`

Must be owner/participant, verified, not banned, **inside call window**.

```json
{
  "token": "<daily-meeting-token>",
  "roomName": "…",
  "domain": "….daily.co"
}
```

Join with [Daily React Native](https://docs.daily.co/reference/rn-daily-js) using `token` + room on `domain`. First successful request records `call_joined_at` (attendance).

### In-call extras

| Method | Path | Notes |
| --- | --- | --- |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/sessions/[id]/tasks` | Task rail; Ably `session:{id}:tasks` |
| `POST` | `/api/sessions/[id]/alert` | Partner cheer → `{ "ok": true }`; Ably `session:{id}:alerts` |
| `POST` | `/api/sessions/[id]/attendance` | Completion near end (≈60s grace) |

---

## Friends & session requests

### Friends list

`GET /api/friends?limit=50&cursor=<user_id>`

```json
{
  "friends": [
    {
      "user_id": "…",
      "email": "…",
      "name": "…",
      "username": "…",
      "avatarUrl": "…",
      "isAdmin": false,
      "since": "…"
    }
  ],
  "nextCursor": null,
  "total": 0
}
```

`DELETE /api/friends/[friendId]` → unfriend.

### Friend requests

| Method | Path | Body / query |
| --- | --- | --- |
| `POST` | `/api/friends/requests` | `{ "to_user_id" }` → `{ "ok": true, "alreadyPending"? }` or `{ "ok": true, "alreadyFriends": true }` |
| `GET` | `/api/friends/requests` | `?type=incoming\|outgoing` (default incoming), optional `?status=` — default returns all statuses |
| `POST` | `/api/friends/requests/[id]` | `{ "action": "accept" \| "decline" }` → `{ "ok": true }` |

GET item shape: `id`, `from_user_id`, `to_user_id`, emails, avatar URLs, `status`, `created_at`.

### Session requests

**Create** `POST /api/session-requests`

```json
{
  "to_user_id": "<friendUserId>",
  "start": "2026-09-21T10:00:00.000Z",
  "durationMin": 50,
  "message": "optional"
}
```

→ `{ "ok": true, "id": "<sessionRequestId>" }` (must be friends, not blocked).

**List** `GET /api/session-requests?type=incoming|outgoing&status=pending|accepted|declined`

Item fields: `id`, `from_user_id`, `to_user_id`, emails, avatars, `start`, `durationMin`, `message`, `responseMessage`, `status`, `created_at`, `responded_at`.

**Respond** `POST /api/session-requests/[id]`

```json
{ "action": "accept", "message": "optional ≤500" }
```

→ `{ "ok": true, "sessionId": "<id>|null" }` (`sessionId` set on accept).

**Cancel pending** `DELETE /api/session-requests/[id]` (requester) → `{ "ok": true }`.

You can also create a session request via chat (`type: "session-request"`).

---

## Chat & Ably

### Friend chat REST

`GET /api/chat/[friendId]` →

```json
{
  "currentUserId": "…",
  "messages": [
    {
      "id": "…",
      "from_user_id": "…",
      "to_user_id": "…",
      "type": "text",
      "content": "…",
      "payload": null,
      "created_at": "…",
      "edited_at": null,
      "deleted": false,
      "deleted_at": null
    }
  ]
}
```

(Last ~200, chronological.) Must be friends.

`POST /api/chat/[friendId]`

- Text: `{ "type": "text", "content": "…" }` (≤2000) → `{ "id" }`
- Session request: `{ "type": "session-request", "start", "durationMin", "message?" }` → `{ "id", "sessionRequestId" }`

Also: `GET /api/chat/unread-counts` → `{ "counts": { "<friendId>": 1 } }`  
`POST /api/chat/[friendId]/read` — mark read  
`PATCH` / `DELETE` `/api/chat/[friendId]/[messageId]` — edit/delete

### Global chat

`GET /api/global-chat?cursor=&limit=&direction=older|newer`  
`POST /api/global-chat` `{ "content" }` (≤2000) → `{ "id" }`

Message fields include `user_id`, `user_name`, `username`, `avatar_url`, `content`, `created_at`, moderation flags, etc.

### Ably realtime

`GET /api/ably/token` → Ably **TokenRequest** JSON (session required).

Initialize Ably with `authCallback` / `authUrl` that hits this endpoint **with cookies**, or create the token from the TokenRequest client-side.

**Channel names:**

| Channel | Pattern |
| --- | --- |
| DM | `chat:{sortedUserA}:{sortedUserB}` |
| User inbox | `user:{userId}:chat` |
| Global | `chat:global` |
| Session calendar | `sessions:updates` |
| Welcome board | `community:welcome` |
| Tasks | `session:{sessionId}:tasks` |
| Alerts | `session:{sessionId}:alerts` |

Token capabilities include those patterns (subscribe/publish as issued by the server).

---

## Community (basics)

Session required; writes need verified email + not banned/muted.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/community/posts?cursor=&limit=` | Feed (limit ≤ 50) |
| `POST` | `/api/community/posts` | `{ "content" }` ≤2000; 10/hour |
| `POST` | `/api/community/posts/[postId]/like` | Toggle like |
| `GET`/`POST` | `/api/community/posts/[postId]/comments` | Comments |

---

## Public profile

`GET /api/profile/[username]` — no session required for public profiles.  
Username `^[a-z0-9_-]{3,20}$`. **404** if missing or private.

---

## Safety

### Report

`POST /api/reports`

```json
{
  "targetType": "friend_message",
  "targetId": "…",
  "reason": "harassment",
  "details": "optional ≤500",
  "reportedUserId": "optional"
}
```

`targetType`: `friend_message` | `global_message` | `community_post` | `community_comment` | `session_call` | `user`  
`reason`: `harassment` | `spam` | `inappropriate` | `threats` | `other`  
→ `{ "ok": true, "reportId": "…", "duplicate"? }`

### Block

`POST /api/users/blocks` `{ "blocked_user_id" }` → `{ "ok": true, "created"? }`  
`DELETE /api/users/blocks/[userId]` → `{ "ok": true }`

---

## Errors

| Status | Typical meaning |
| --- | --- |
| **401** | Missing/invalid session |
| **403** | Origin block, `EMAIL_NOT_VERIFIED`, `FIRST_SESSION_REQUIRED`, forbidden, community ban, outside call window |
| **404** | Not found |
| **409** | Conflict (overlap, full session, username, already responded) |
| **429** | Rate limited |

**429**

```json
{
  "error": "Too many requests",
  "message": "Please slow down and try again later.",
  "retryAfter": 42
}
```

Headers: `Retry-After`, `X-RateLimit-*`.

Buckets (approx): **auth** 5/min IP · **api** 100/min user · **chat** 30/min user.

---

## Suggested RN architecture

1. Shared axios/fetch instance + cookie jar for `https://dashboard.refocus.co.in`
2. Auth module: csrf → credentials callback → persist cookies → `/api/auth/session` / `/api/users/me`
3. Deep-link handler for email verification status
4. Sessions module: list (`mineUpcoming` + calendar range), create, join, leave, delete
5. Call module: poll join window (10 min grace) → Daily token → `@daily-co/react-native-daily-js` (or current Daily RN package)
6. Realtime: Ably from `/api/ably/token`; subscribe to DM + user channels
7. Friends / session-requests / chat screens
8. Sign-out clears jar

### Dependencies you’ll need

- Cookie-capable HTTP client  
- Daily React Native SDK (video)  
- Ably JS/RN client (chat presence)  
- Optional: Firebase Auth (only if you support Google via `firebaseIdToken`)

---

## Out of scope

- `/api/admin/*`, cron, ops mail  
- Bearer `CRON_SECRET` / Daily server admin keys  
- Marketing host product JSON  
- Dashboard wallpaper (optional web chrome)  
- A future mobile OAuth/Bearer API (not implemented)

When APIs change, update this file first, then the public `/developers` page on the `landing` branch.
