import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise, { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { ObjectId } from "mongodb";
import { resolveAvatarUrl } from "@/lib/userAvatar";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate limit by IP AND Email to prevent credential stuffing or locking out accounts via proxy
        const ip = getClientIp(req);
        const email = credentials.email.toLowerCase();
        
        const [ipLimit, emailLimit] = await Promise.all([
          checkRateLimit(ip, "auth"),
          checkRateLimit(email, "auth")
        ]);

        if (!ipLimit.success || !emailLimit.success) {
          throw new Error("Too many authentication attempts. Please try again later.");
        }

        const db = await getDb();
        const user = await db
          .collection<{
            _id: unknown;
            email: string;
            name?: string;
            hashedPassword?: string;
            avatar_url?: string | null;
            image?: string | null;
          }>("users")
          .findOne({
            email: credentials.email.toLowerCase(),
          });
        if (!user || !user.hashedPassword) return null;
        const ok = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );
        if (!ok) return null;
        const image = user.avatar_url ?? user.image ?? undefined;
        return {
          id: String(user._id as string),
          email: user.email,
          name: user.name || undefined,
          image: image || undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user?.image) {
        token.picture = user.image;
      }
      if (trigger === "update" && session) {
        const nextImage = (session as { image?: string | null }).image;
        if (nextImage !== undefined) {
          token.picture = nextImage || undefined;
        }
      }
      // JWT may predate profile photo upload; backfill once per token.
      if (
        token.sub &&
        !token.picture &&
        token.avatarLookupDone !== true &&
        ObjectId.isValid(token.sub)
      ) {
        token.avatarLookupDone = true;
        try {
          const db = await getDb();
          const doc = (await db.collection("users").findOne(
            { _id: new ObjectId(token.sub) },
            { projection: { avatar_url: 1, image: 1 } },
          )) as { avatar_url?: string | null; image?: string | null } | null;
          const url = resolveAvatarUrl(doc);
          if (url) token.picture = url;
        } catch {
          // ignore lookup failures
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.sub) {
        if (session.user) {
          (session.user as { id?: string }).id = token.sub;
        }
      }
      if (token.picture && session.user) {
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};


