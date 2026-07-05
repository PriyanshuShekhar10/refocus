import { vi } from "vitest";

// Stub environment variables used across tests
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.MONGODB_URI = "mongodb://localhost:27017";
process.env.MONGODB_DB = "refocus_test";

// Global mock for next-auth getServerSession
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Global mock for auth options
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Global mock for SSE publish
vi.mock("@/lib/sse", () => ({
  publish: vi.fn().mockResolvedValue(undefined),
  chatChannel: vi.fn((...args: string[]) => `chat:${args.join(":")}`),
  userChannel: vi.fn((id: string) => `user:${id}`),
  sessionsChannel: vi.fn(() => "sessions"),
}));

vi.mock("@/lib/requireVerifiedEmail", () => ({
  EMAIL_NOT_VERIFIED_CODE: "EMAIL_NOT_VERIFIED",
  EMAIL_VERIFICATION_REQUIRED_MESSAGE:
    "Verify your email to use this feature. You can browse until then.",
  getUserEmailVerified: vi.fn().mockResolvedValue(true),
  emailNotVerifiedResponse: vi.fn(),
  requireVerifiedEmail: vi.fn().mockResolvedValue(null),
}));
