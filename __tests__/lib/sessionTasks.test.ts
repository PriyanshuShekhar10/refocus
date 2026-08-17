import { describe, expect, it } from "vitest";
import {
  SESSION_TASK_TITLE_MAX,
  normalizeTaskTitle,
  partnerFirstName,
  serializeSessionTasks,
  taskProgress,
  tasksForOwner,
} from "@/lib/sessionTasks";

describe("sessionTasks helpers", () => {
  it("trims and caps titles", () => {
    expect(normalizeTaskTitle("  hello   world  ")).toBe("hello world");
    expect(normalizeTaskTitle("   ")).toBeNull();
    expect(normalizeTaskTitle("x".repeat(200))?.length).toBe(SESSION_TASK_TITLE_MAX);
  });

  it("splits lists and progress by owner", () => {
    const tasks = serializeSessionTasks([
      {
        id: "a",
        ownerId: "you",
        title: "A",
        done: true,
        sort: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "b",
        ownerId: "you",
        title: "B",
        done: false,
        sort: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "c",
        ownerId: "them",
        title: "C",
        done: true,
        sort: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    expect(tasksForOwner(tasks, "you")).toHaveLength(2);
    expect(taskProgress(tasksForOwner(tasks, "you"))).toEqual({ done: 1, total: 2 });
  });

  it("uses the first name for partner labels", () => {
    expect(partnerFirstName("Priya Sharma")).toBe("Priya");
    expect(partnerFirstName(null)).toBeNull();
  });
});
