<h1 align="center">Refocus</h1>

## Features

- Next.js App Router, Server and Client Components
- Authentication with NextAuth (Credentials provider) and MongoDB Adapter
- MongoDB via official Node driver
- Styling with Tailwind CSS and components via shadcn/ui
- Friends management and session requests
- Realtime chat between friends with embedded session requests
- Unread message badges and live updates via Server‑Sent Events (SSE)

## Getting started (local)

1. Copy `.env.example` to `.env.local` (create one if missing) and set:

```
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
NEXTAUTH_SECRET=your-long-random-secret
NEXTAUTH_URL=http://localhost:3000
```

2. Install deps and run dev server

```
npm install
npm run dev
```

App runs at http://localhost:3000.

### Useful scripts

```
# development
npm run dev

# typecheck + lint + production build
npm run build

# start production server (after build)
npm run start
```

## Notes

- Registration happens via `POST /api/auth/register` and stores a hashed password in `users`.
- Login uses NextAuth Credentials at `/auth/login`.
- Friends and Sessions APIs are backed by MongoDB.
- Settings page includes a Logout button that redirects to `/`.

## Chat & Realtime

- Chat messages are stored in `messages` (MongoDB). New messages set `read_at: null` for the recipient.
- Unread counts endpoint: `GET /api/chat/unread-counts` returns per‑friend counts.
- Mark as read: `POST /api/chat/[friendId]/read` marks messages from that friend as read.
- Realtime transport uses SSE:
  - Per‑conversation events: `GET /api/chat/[friendId]/events`
  - Per‑user unread events: `GET /api/chat/events`
- Chat UI (`app/(product)/components/FriendChat.tsx`):
  - Compose text or send session requests (datetime, duration, message)
  - Accept/decline incoming requests with optional message; delete your own pending requests
  - Realtime updates via EventSource; unread counts update in friends list

## Session Requests

- Create: `POST /api/session-requests` with `{ to_user_id, start, durationMin, message? }`
- List: `GET /api/session-requests?type=incoming|outgoing&status=...`
- Respond: `POST /api/session-requests/[id]` with `{ action: 'accept'|'decline', message? }`
  - Accept creates a session with both users
- Delete (requester only, pending): `DELETE /api/session-requests/[id]`

## Deploy

Deploy to Vercel or your platform of choice. Ensure env vars above are set in the hosting environment.

## Contributing

Please open issues and PRs in this repository.
