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

describe("GET /api/tasks - sorting", () => {
  it("defaults to created_at desc", async () => {
    const t1 = await postTask({ title: "First" });
    const t2 = await postTask({ title: "Second" });
    const t3 = await postTask({ title: "Third" });

    const res = await getApi("/api/tasks");

    expect(res.status).toBe(200);
    const ids = res.body.data.map((t: any) => t.id);
    expect(ids).toEqual([t3.body.data.id, t2.body.data.id, t1.body.data.id]);
  });

  it("sorts by created_at asc", async () => {
    const t1 = await postTask({ title: "First" });
    const t2 = await postTask({ title: "Second" });
    const t3 = await postTask({ title: "Third" });

    const res = await getApi("/api/tasks?sort=created_at&order=asc");

    expect(res.status).toBe(200);
    const ids = res.body.data.map((t: any) => t.id);
    expect(ids).toEqual([t1.body.data.id, t2.body.data.id, t3.body.data.id]);
  });

  it("sorts by title asc", async () => {
    await postTask({ title: "Charlie" });
    await postTask({ title: "Alice" });
    await postTask({ title: "Bob" });

    const res = await getApi("/api/tasks?sort=title&order=asc");

    expect(res.status).toBe(200);
    const titles = res.body.data.map((t: any) => t.title);
    expect(titles).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("sorts by title desc", async () => {
    await postTask({ title: "Charlie" });
    await postTask({ title: "Alice" });
    await postTask({ title: "Bob" });

    const res = await getApi("/api/tasks?sort=title&order=desc");

    expect(res.status).toBe(200);
    const titles = res.body.data.map((t: any) => t.title);
    expect(titles).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("sorts by priority using semantic urgency order (desc = urgent first)", async () => {
    await postTask({ title: "Low", priority: "low" });
    await postTask({ title: "Urgent", priority: "urgent" });
    await postTask({ title: "Medium", priority: "medium" });
    await postTask({ title: "High", priority: "high" });

    const res = await getApi("/api/tasks?sort=priority&order=desc");

    expect(res.status).toBe(200);
    const priorities = res.body.data.map((t: any) => t.priority);
    expect(priorities).toEqual(["urgent", "high", "medium", "low"]);
  });

  it("sorts by priority asc (low first)", async () => {
    await postTask({ title: "High", priority: "high" });
    await postTask({ title: "Urgent", priority: "urgent" });
    await postTask({ title: "Low", priority: "low" });
    await postTask({ title: "Medium", priority: "medium" });

    const res = await getApi("/api/tasks?sort=priority&order=asc");

    expect(res.status).toBe(200);
    const priorities = res.body.data.map((t: any) => t.priority);
    expect(priorities).toEqual(["low", "medium", "high", "urgent"]);
  });

  it("falls back to default sort for invalid sort field", async () => {
    const t1 = await postTask({ title: "First" });
    const t2 = await postTask({ title: "Second" });

    const res = await getApi("/api/tasks?sort=invalid_field&order=asc");

    expect(res.status).toBe(200);
    const ids = res.body.data.map((t: any) => t.id);
    expect(ids).toEqual([t2.body.data.id, t1.body.data.id]);
  });

  it("falls back to default order for invalid order value", async () => {
    const t1 = await postTask({ title: "First" });
    const t2 = await postTask({ title: "Second" });

    const res = await getApi("/api/tasks?sort=created_at&order=sideways");

    expect(res.status).toBe(200);
    const ids = res.body.data.map((t: any) => t.id);
    expect(ids).toEqual([t2.body.data.id, t1.body.data.id]);
  });

  it("works with filters and pagination", async () => {
    await postTask({ title: "Alpha", priority: "high" });
    await postTask({ title: "Charlie", priority: "high" });
    await postTask({ title: "Bravo", priority: "high" });
    await postTask({ title: "Delta", priority: "low" });

    const res = await getApi("/api/tasks?priority=high&sort=title&order=asc&limit=2&offset=0");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    const titles = res.body.data.map((t: any) => t.title);
    expect(titles).toEqual(["Alpha", "Bravo"]);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.hasMore).toBe(true);
  });
});
