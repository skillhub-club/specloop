import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { postTask, putApi, getApi } from "./helpers";
import { getDb, closeDb } from "../src/db";

beforeEach(() => {
  const db = getDb();
  db.exec("DELETE FROM tasks");
});

afterAll(() => {
  closeDb();
});

describe("Priority field - POST /api/tasks", () => {
  it("defaults priority to 'medium' when not provided", async () => {
    const res = await postTask({ title: "No priority" });

    expect(res.status).toBe(201);
    expect(res.body.data.priority).toBe("medium");
  });

  it("accepts explicit priority value", async () => {
    const res = await postTask({ title: "Urgent task", priority: "urgent" });

    expect(res.status).toBe(201);
    expect(res.body.data.priority).toBe("urgent");
  });

  it("accepts all valid priority values", async () => {
    for (const priority of ["low", "medium", "high", "urgent"]) {
      const res = await postTask({ title: `${priority} task`, priority });

      expect(res.status).toBe(201);
      expect(res.body.data.priority).toBe(priority);
    }
  });

  it("returns 400 for invalid priority on POST", async () => {
    const res = await postTask({ title: "Bad priority", priority: "critical" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe("Priority field - PUT /api/tasks/:id", () => {
  it("updates priority and returns updated task", async () => {
    const created = await postTask({ title: "Task" });

    const res = await putApi(`/api/tasks/${created.body.data.id}`, { priority: "high" });

    expect(res.status).toBe(200);
    expect(res.body.data.priority).toBe("high");
  });

  it("returns 400 for invalid priority on PUT", async () => {
    const created = await postTask({ title: "Task" });

    const res = await putApi(`/api/tasks/${created.body.data.id}`, { priority: "super-high" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("persists priority change in database", async () => {
    const created = await postTask({ title: "Task", priority: "low" });

    await putApi(`/api/tasks/${created.body.data.id}`, { priority: "urgent" });

    const res = await getApi(`/api/tasks/${created.body.data.id}`);
    expect(res.body.data.priority).toBe("urgent");
  });
});
