import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { vi } from "vitest";
import { getServerSession } from "next-auth";

/**
 * Create a mock NextRequest with JSON body.
 */
export function mockRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
): NextRequest {
  const { method = "POST", body } = options;
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    ...(body !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
}

/**
 * Parse a NextResponse JSON body and status.
 */
export async function parseResponse(res: Response) {
  const json = await res.json();
  return { status: res.status, json };
}

/**
 * Create a mock MongoDB collection with chainable methods.
 */
export function mockCollection(overrides: Record<string, unknown> = {}) {
  const col = {
    findOne: vi.fn().mockResolvedValue(null),
    insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId() }),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
    createIndex: vi.fn().mockResolvedValue("email_1"),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      project: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
      toArray: vi.fn().mockResolvedValue([]),
    }),
    ...overrides,
  };
  return col;
}

/**
 * Create a mock DB that returns named collections.
 */
export function mockDb(collections: Record<string, ReturnType<typeof mockCollection>>) {
  return {
    collection: vi.fn((name: string) => {
      if (collections[name]) return collections[name];
      return mockCollection();
    }),
  };
}

/**
 * Set getServerSession to return a mock session for a given userId.
 */
export function mockSession(userId: string | null) {
  const fn = vi.mocked(getServerSession);
  if (userId) {
    fn.mockResolvedValue({
      user: { id: userId },
    } as never);
  } else {
    fn.mockResolvedValue(null as never);
  }
}
