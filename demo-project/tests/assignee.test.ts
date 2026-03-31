import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { postTask, putApi, getApi, postApi } from "./helpers";
import { getDb, closeDb } from "../src/db";

beforeEach(() => {
  const db = getDb();
  db.exec("DELETE FROM tasks");
});

afterAll(() => {
  closeDb();
});

describe("Assignee - POST /api/tasks", () => {
  it("creates task with assigned_to field", async () => {
    const res = await postTask({ title: "Task", assigned_to: "alice" });

    expect(res.status).toBe(201);
    expect(res.body.data.assigned_to).toBe("alice");
  });

  it("defaults assigned_to to null when not provided", async () => {
    const res = await postTask({ title: "Task" });

    expect(res.status).toBe(201);
    expect(res.body.data.assigned_to).toBeNull();
  });
});

describe("Assignee - PUT /api/tasks/:id", () => {
  it("updates assigned_to via PUT", async () => {
    const created = await postTask({ title: "Task" });

    const res = await putApi(`/api/tasks/${created.body.data.id}`, { assigned_to: "bob" });

    expect(res.status).toBe(200);
    expect(res.body.data.assigned_to).toBe("bob");
  });
});

describe("Assignee - POST /api/tasks/:id/assign", () => {
  it("assigns a task to a user", async () => {
    const created = await postTask({ title: "Task" });

    const res = await postApi(`/api/tasks/${created.body.data.id}/assign`, { assigned_to: "charlie" });

    expect(res.status).toBe(200);
    expect(res.body.data.assigned_to).toBe("charlie");
  });

  it("returns 404 for non-existent task", async () => {
    const res = await postApi("/api/tasks/9999/assign", { assigned_to: "alice" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe("Assignee - POST /api/tasks/:id/unassign", () => {
  it("unassigns a task", async () => {
    const created = await postTask({ title: "Task", assigned_to: "alice" });

    const res = await postApi(`/api/tasks/${created.body.data.id}/unassign`);

    expect(res.status).toBe(200);
    expect(res.body.data.assigned_to).toBeNull();
  });

  it("returns 404 for non-existent task", async () => {
    const res = await postApi("/api/tasks/9999/unassign");

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe("Assignee - GET responses include assigned_to", () => {
  it("GET /api/tasks includes assigned_to in list", async () => {
    await postTask({ title: "Task", assigned_to: "dave" });

    const res = await getApi("/api/tasks");

    expect(res.status).toBe(200);
    expect(res.body.data[0].assigned_to).toBe("dave");
  });

  it("GET /api/tasks/:id includes assigned_to", async () => {
    const created = await postTask({ title: "Task", assigned_to: "eve" });

    const res = await getApi(`/api/tasks/${created.body.data.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.assigned_to).toBe("eve");
  });
});
