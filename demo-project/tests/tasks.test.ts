import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { postTask, getApi, putApi, deleteApi } from "./helpers";
import { getDb, closeDb } from "../src/db";

beforeEach(() => {
  const db = getDb();
  db.exec("DELETE FROM tasks");
});

afterAll(() => {
  closeDb();
});

describe("POST /api/tasks", () => {
  it("creates a task with title and returns 201 with defaults", async () => {
    const res = await postTask({ title: "Test task" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: "Test task",
      description: "",
      status: "todo",
    });
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.created_at).toBeDefined();
    expect(res.body.data.updated_at).toBeDefined();
  });

  it("creates a task with title and description", async () => {
    const res = await postTask({ title: "Task with desc", description: "A description" });

    expect(res.status).toBe(201);
    expect(res.body.data.description).toBe("A description");
  });

  it("returns 400 when title is missing", async () => {
    const res = await postTask({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when title is empty string", async () => {
    const res = await postTask({ title: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe("GET /api/tasks", () => {
  it("returns 200 with empty array when no tasks", async () => {
    const res = await getApi("/api/tasks");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns all tasks", async () => {
    await postTask({ title: "Task 1" });
    await postTask({ title: "Task 2" });

    const res = await getApi("/api/tasks");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe("GET /api/tasks/:id", () => {
  it("returns 200 with task data for existing task", async () => {
    const created = await postTask({ title: "Find me" });

    const res = await getApi(`/api/tasks/${created.body.data.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Find me");
  });

  it("returns 404 for non-existent task", async () => {
    const res = await getApi("/api/tasks/99999");

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe("PUT /api/tasks/:id", () => {
  it("updates title and returns 200 with updated task", async () => {
    const created = await postTask({ title: "Original" });

    const res = await putApi(`/api/tasks/${created.body.data.id}`, { title: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated");
  });

  it("updates description", async () => {
    const created = await postTask({ title: "Task" });

    const res = await putApi(`/api/tasks/${created.body.data.id}`, { description: "New description" });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe("New description");
  });

  it("updates status to valid value", async () => {
    const created = await postTask({ title: "Task" });

    const res = await putApi(`/api/tasks/${created.body.data.id}`, { status: "in_progress" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("in_progress");
  });

  it("updates updated_at timestamp", async () => {
    const created = await postTask({ title: "Task" });

    await new Promise((r) => setTimeout(r, 1100));

    const res = await putApi(`/api/tasks/${created.body.data.id}`, { title: "Changed" });

    expect(res.status).toBe(200);
    expect(res.body.data.updated_at).not.toBe(created.body.data.updated_at);
  });

  it("returns 404 for non-existent task", async () => {
    const res = await putApi("/api/tasks/99999", { title: "Nope" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 for invalid status", async () => {
    const created = await postTask({ title: "Task" });

    const res = await putApi(`/api/tasks/${created.body.data.id}`, { status: "invalid" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe("DELETE /api/tasks/:id", () => {
  it("returns 204 with no body for existing task", async () => {
    const created = await postTask({ title: "Delete me" });

    const res = await deleteApi(`/api/tasks/${created.body.data.id}`);

    expect(res.status).toBe(204);
    expect(res.text).toBe("");
  });

  it("returns 404 for non-existent task", async () => {
    const res = await deleteApi("/api/tasks/99999");

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("task is actually removed after delete", async () => {
    const created = await postTask({ title: "Gone" });

    await deleteApi(`/api/tasks/${created.body.data.id}`);

    const res = await getApi(`/api/tasks/${created.body.data.id}`);
    expect(res.status).toBe(404);
  });
});
