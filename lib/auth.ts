import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise, { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

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
          .collection<{ _id: unknown; email: string; name?: string; hashedPassword?: string }>(
            "users"
          )
          .findOne({
            email: credentials.email.toLowerCase(),
          });
        if (!user || !user.hashedPassword) return null;
        const ok = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );
        if (!ok) return null;
        return {
          id: String(user._id as string),
          email: user.email,
          name: user.name || undefined,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token?.sub) {
        if (session.user) {
          (session.user as { id?: string }).id = token.sub;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};


