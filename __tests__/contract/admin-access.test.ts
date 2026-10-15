/**
 * Access contract for every admin API route: signed out → 401, signed in as a
 * non-admin → 403. Discovered from the filesystem, so new admin routes are
 * covered automatically. Guards the route-wrapper refactor
 * (docs/REFACTOR-PLAN.md, Phase 3).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getServerSession } from "next-auth";
import { mockCollection, mockDb, mockRequest, mockSession } from "../helpers";

const users = mockCollection();
const db = mockDb({ users });
vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
  default: Promise.resolve({ db: () => db }),
}));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 99, reset: 0 }),
  rateLimitedResponse: vi.fn(),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

const ADMIN_DIR = path.join(__dirname, "../../app/api/admin");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const SAMPLE_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return routeFiles(full);
    return e.name === "route.ts" ? [full] : [];
  });
}

const CASES = routeFiles(ADMIN_DIR).flatMap((file) => {
  const src = fs.readFileSync(file, "utf8");
  const apiPath = "/api/admin" + path.dirname(file).slice(ADMIN_DIR.length).replace(/\\/g, "/");
  return METHODS.filter((m) =>
    new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(src),
  ).map((method) => ({ file, apiPath, method }));
});

async function call(c: (typeof CASES)[number]) {
  const mod = (await import(c.file)) as Record<string, (req: unknown, ctx: unknown) => Promise<Response>>;
  const params: Record<string, string> = {};
  for (const [, name] of c.apiPath.matchAll(/\[(\w+)\]/g)) params[name] = SAMPLE_ID;
  const url = c.apiPath.replace(/\[(\w+)\]/g, SAMPLE_ID);
  const hasBody = !["GET", "DELETE"].includes(c.method);
  return mod[c.method](
    mockRequest(url, { method: c.method, ...(hasBody ? { body: {} } : {}) }),
    { params: Promise.resolve(params) },
  );
}

describe("admin API access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    users.findOne.mockResolvedValue({ _id: SAMPLE_ID, role: null });
  });

  it("finds the admin routes", () => {
    expect(CASES.length).toBeGreaterThan(30);
  });

  // "Am I an admin?" probe: answers 200 for everyone, but reveals nothing to non-admins.
  const PROBE = "/api/admin/me";

  it(`GET ${PROBE} reports isAdmin false and leaks nothing to non-admins`, async () => {
    const probe = CASES.find((c) => c.apiPath === PROBE && c.method === "GET")!;
    for (const session of [null, { user: { id: "bbbbbbbbbbbbbbbbbbbbbbbb", email: "member@example.com" } }]) {
      vi.mocked(getServerSession).mockResolvedValue(session as never);
      const res = await call(probe);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toMatchObject({ isAdmin: false, userId: null, email: null });
      expect(json.adminCount).toBeUndefined();
    }
  });

  it.each(CASES.filter((c) => c.apiPath !== PROBE).map((c) => [`${c.method} ${c.apiPath}`, c] as const))(
    "%s rejects signed-out (401) and non-admin (403)",
    async (_label, c) => {
      mockSession(null);
      expect((await call(c)).status).toBe(401);

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "bbbbbbbbbbbbbbbbbbbbbbbb", email: "member@example.com" },
      } as never);
      expect((await call(c)).status).toBe(403);
    },
  );
});
