<h1 align="center">Refocus – Next.js + NextAuth + MongoDB</h1>

This project now uses Next.js (App Router), NextAuth for authentication, and MongoDB as the database. Supabase has been fully removed.

## Features

- Next.js App Router, Server and Client Components
- Authentication with NextAuth (Credentials provider) and MongoDB Adapter
- MongoDB via official Node driver
- Styling with Tailwind CSS and components via shadcn/ui

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

## Notes

- Registration happens via `POST /api/auth/register` and stores a hashed password in `users`.
- Login uses NextAuth Credentials at `/auth/login`.
- Friends and Sessions APIs are backed by MongoDB.

## Deploy

Deploy to Vercel or your platform of choice. Ensure env vars above are set in the hosting environment.

## Contributing

Please open issues and PRs in this repository.
