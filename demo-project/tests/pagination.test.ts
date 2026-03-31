import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { postTask, getApi } from "./helpers";
import { getDb, closeDb } from "../src/db";

beforeEach(() => {
  const db = getDb();
  db.exec("DELETE FROM tasks");
});

afterAll(() => {
  closeDb();
});

describe("GET /api/tasks - pagination", () => {
  it("returns default pagination meta (limit=20, offset=0)", async () => {
    await postTask({ title: "Task 1" });
    await postTask({ title: "Task 2" });

    const res = await getApi("/api/tasks");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toEqual({
      total: 2,
      limit: 20,
      offset: 0,
      hasMore: false,
    });
  });

  it("respects custom limit and offset", async () => {
    for (let i = 1; i <= 5; i++) {
      await postTask({ title: `Task ${i}` });
    }

    const res = await getApi("/api/tasks?limit=2&offset=1");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toEqual({
      total: 5,
      limit: 2,
      offset: 1,
      hasMore: true,
    });
  });

  it("hasMore is false when last page is reached", async () => {
    for (let i = 1; i <= 3; i++) {
      await postTask({ title: `Task ${i}` });
    }

    const res = await getApi("/api/tasks?limit=2&offset=2");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.hasMore).toBe(false);
    expect(res.body.meta.total).toBe(3);
  });

  it("caps limit at 100", async () => {
    await postTask({ title: "Task 1" });

    const res = await getApi("/api/tasks?limit=200");

    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(100);
  });

  it("falls back to defaults for non-numeric limit and offset", async () => {
    await postTask({ title: "Task 1" });

    const res = await getApi("/api/tasks?limit=abc&offset=xyz");

    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(20);
    expect(res.body.meta.offset).toBe(0);
    expect(res.body.data).toHaveLength(1);
  });

  it("falls back to defaults for negative limit and offset", async () => {
    await postTask({ title: "Task 1" });

    const res = await getApi("/api/tasks?limit=-5&offset=-10");

    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(20);
    expect(res.body.meta.offset).toBe(0);
  });

  it("works correctly with filters", async () => {
    await postTask({ title: "High 1", priority: "high" });
    await postTask({ title: "High 2", priority: "high" });
    await postTask({ title: "High 3", priority: "high" });
    await postTask({ title: "Low 1", priority: "low" });

    const res = await getApi("/api/tasks?priority=high&limit=2&offset=0");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toEqual({
      total: 3,
      limit: 2,
      offset: 0,
      hasMore: true,
    });
    expect(res.body.data.every((t: any) => t.priority === "high")).toBe(true);
  });
});
