import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { postTask, getApi, putApi } from "./helpers";
import { getDb, closeDb } from "../src/db";

beforeEach(() => {
  const db = getDb();
  db.exec("DELETE FROM tasks");
});

afterAll(() => {
  closeDb();
});

describe("GET /api/tasks - filtering", () => {
  it("filters by status", async () => {
    await postTask({ title: "Todo task" });
    const t2 = await postTask({ title: "Done task" });
    await putApi(`/api/tasks/${t2.body.data.id}`, { status: "done" });

    const res = await getApi("/api/tasks?status=todo");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Todo task");
  });

  it("filters by priority", async () => {
    await postTask({ title: "High task", priority: "high" });
    await postTask({ title: "Low task", priority: "low" });

    const res = await getApi("/api/tasks?priority=high");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("High task");
  });

  it("filters by assigned_to", async () => {
    await postTask({ title: "Alice task", assigned_to: "alice" });
    await postTask({ title: "Bob task", assigned_to: "bob" });

    const res = await getApi("/api/tasks?assigned_to=alice");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Alice task");
  });

  it("combines multiple filters with AND logic", async () => {
    await postTask({ title: "Match", priority: "high" });
    await postTask({ title: "Wrong priority", priority: "low" });
    const t3 = await postTask({ title: "Wrong status", priority: "high" });
    await putApi(`/api/tasks/${t3.body.data.id}`, { status: "done" });

    const res = await getApi("/api/tasks?status=todo&priority=high");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Match");
  });

  it("returns empty results for non-matching filter values", async () => {
    await postTask({ title: "Task 1" });
    await postTask({ title: "Task 2" });

    const res = await getApi("/api/tasks?status=nonexistent");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("ignores unrecognized filter keys", async () => {
    await postTask({ title: "Task 1" });
    await postTask({ title: "Task 2" });

    const res = await getApi("/api/tasks?foo=bar&baz=qux");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("returns all tasks when no filters provided", async () => {
    await postTask({ title: "Task 1" });
    await postTask({ title: "Task 2" });
    await postTask({ title: "Task 3" });

    const res = await getApi("/api/tasks");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
  });
});
