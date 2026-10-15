/**
 * Contract tests for the endpoints the mobile app depends on.
 *
 * Driven by docs/mobile-api.json (the published app API catalog): every route
 * listed there must keep existing with the same HTTP method, and every route
 * that requires a session must keep answering 401 { error } when signed out.
 * These guard refactors (see docs/REFACTOR-PLAN.md) from silently breaking
 * shipped app builds.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockCollection, mockDb, mockRequest, mockSession } from "../helpers";

const db = mockDb({});
vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
  default: Promise.resolve({ db: () => db }),
}));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 99, reset: 0 }),
  rateLimitedResponse: vi.fn(),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

type CatalogRoute = { method: string; path: string; auth: string };

const catalog = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../docs/mobile-api.json"), "utf8"),
) as { routes: CatalogRoute[] };

/** Routes the app calls that were added after the catalog was generated. */
const EXTRA_ROUTES: CatalogRoute[] = [
  { method: "GET", path: "/api/users/me/matching-profile", auth: "session" },
  { method: "PUT", path: "/api/users/me/matching-profile", auth: "session" },
  { method: "POST", path: "/api/users/me/delete", auth: "session" },
  { method: "POST", path: "/api/push/devices", auth: "session" },
  { method: "DELETE", path: "/api/push/devices", auth: "session" },
];

const ROUTES = [...catalog.routes, ...EXTRA_ROUTES];
const SAMPLE_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

function routeFile(apiPath: string) {
  return path.join(__dirname, "../..", "app", apiPath, "route.ts");
}

function paramsFor(apiPath: string) {
  const params: Record<string, string> = {};
  for (const [, name] of apiPath.matchAll(/\[(\w+)\]/g)) {
    params[name] = name === "username" ? "someone" : SAMPLE_ID;
  }
  return { params: Promise.resolve(params) };
}

function concreteUrl(apiPath: string) {
  return apiPath.replace(/\[(\w+)\]/g, (_m, name) => (name === "username" ? "someone" : SAMPLE_ID));
}

describe("mobile API contract: routes exist", () => {
  it("catalog is non-empty", () => {
    expect(catalog.routes.length).toBeGreaterThan(50);
  });

  it.each(ROUTES.map((r) => [`${r.method} ${r.path}`, r] as const))(
    "%s is still exported",
    (_label, route) => {
      const file = routeFile(route.path);
      expect(fs.existsSync(file), `missing ${file}`).toBe(true);
      const src = fs.readFileSync(file, "utf8");
      const exported = new RegExp(
        `export\\s+(async\\s+)?function\\s+${route.method}\\b|export\\s+(const|\\{)[^;]*\\b${route.method}\\b`,
      ).test(src);
      expect(exported, `${route.method} not exported from ${file}`).toBe(true);
    },
  );
});

describe("mobile API contract: signed-out requests get 401 { error }", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(null);
    (db.collection as ReturnType<typeof vi.fn>).mockImplementation(() => mockCollection());
  });

  const authed = ROUTES.filter((r) => r.auth === "session" || r.auth === "session+verified");

  it.each(authed.map((r) => [`${r.method} ${r.path}`, r] as const))(
    "%s",
    async (_label, route) => {
      const mod = (await import(routeFile(route.path))) as Record<
        string,
        (req: unknown, ctx: unknown) => Promise<Response>
      >;
      const handler = mod[route.method];
      const hasBody = !["GET", "DELETE"].includes(route.method);
      const req = mockRequest(concreteUrl(route.path), {
        method: route.method,
        ...(hasBody ? { body: {} } : {}),
      });
      const res = await handler(req, paramsFor(route.path));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(typeof json.error).toBe("string");
    },
  );
});
