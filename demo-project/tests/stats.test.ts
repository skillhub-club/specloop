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

describe("GET /api/stats", () => {
  it("returns correct stats for empty database", async () => {
    const res = await getApi("/api/stats");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      total: 0,
      byStatus: { todo: 0, in_progress: 0, done: 0 },
      byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
      unassigned: 0,
    });
  });

  it("counts tasks by status correctly", async () => {
    const t1 = await postTask({ title: "Todo 1" });
    const t2 = await postTask({ title: "Todo 2" });
    await putApi(`/api/tasks/${t1.body.data.id}`, { status: "in_progress" });
    await putApi(`/api/tasks/${t2.body.data.id}`, { status: "done" });
    await postTask({ title: "Todo 3" });

    const res = await getApi("/api/stats");

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.byStatus).toEqual({ todo: 1, in_progress: 1, done: 1 });
  });

  it("counts tasks by priority correctly", async () => {
    await postTask({ title: "Low", priority: "low" });
    await postTask({ title: "Medium 1" }); // default medium
    await postTask({ title: "Medium 2" }); // default medium
    await postTask({ title: "High", priority: "high" });
    await postTask({ title: "Urgent", priority: "urgent" });

    const res = await getApi("/api/stats");

    expect(res.status).toBe(200);
    expect(res.body.data.byPriority).toEqual({ low: 1, medium: 2, high: 1, urgent: 1 });
  });

  it("counts unassigned tasks correctly", async () => {
    await postTask({ title: "Unassigned 1" });
    await postTask({ title: "Unassigned 2" });
    await postTask({ title: "Assigned", assigned_to: "alice" });

    const res = await getApi("/api/stats");

    expect(res.status).toBe(200);
    expect(res.body.data.unassigned).toBe(2);
    expect(res.body.data.total).toBe(3);
  });

  it("requires authentication", async () => {
    const request = (await import("supertest")).default;
    const app = (await import("../src/app")).default;
    const res = await request(app).get("/api/stats");

    expect(res.status).toBe(401);
  });

  it("returns accurate counts with mixed data", async () => {
    // Create diverse tasks
    await postTask({ title: "T1", priority: "high", assigned_to: "alice" });
    await postTask({ title: "T2", priority: "low" });
    await postTask({ title: "T3", priority: "urgent", assigned_to: "bob" });
    const t4 = await postTask({ title: "T4", priority: "medium" });
    await putApi(`/api/tasks/${t4.body.data.id}`, { status: "done" });
    const t5 = await postTask({ title: "T5", priority: "high", assigned_to: "charlie" });
    await putApi(`/api/tasks/${t5.body.data.id}`, { status: "in_progress" });

    const res = await getApi("/api/stats");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      total: 5,
      byStatus: { todo: 3, in_progress: 1, done: 1 },
      byPriority: { low: 1, medium: 1, high: 2, urgent: 1 },
      unassigned: 2,
    });
  });
});
