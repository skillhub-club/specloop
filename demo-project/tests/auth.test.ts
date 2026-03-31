import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { getDb, closeDb } from "../src/db";
import { API_KEY } from "./helpers";

beforeEach(() => {
  const db = getDb();
  db.exec("DELETE FROM tasks");
});

afterAll(() => {
  closeDb();
});

describe("API key authentication", () => {
  it("allows request with valid API key", async () => {
    const res = await request(app)
      .get("/api/tasks")
      .set("X-API-Key", API_KEY);

    expect(res.status).toBe(200);
  });

  it("returns 401 when X-API-Key header is missing", async () => {
    const res = await request(app).get("/api/tasks");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 401 when X-API-Key is wrong", async () => {
    const res = await request(app)
      .get("/api/tasks")
      .set("X-API-Key", "wrong-key");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("GET /health is accessible without API key", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("auth applies to POST /api/tasks", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ title: "No auth" });

    expect(res.status).toBe(401);
  });

  it("auth applies to PUT /api/tasks/:id", async () => {
    const res = await request(app)
      .put("/api/tasks/1")
      .send({ title: "No auth" });

    expect(res.status).toBe(401);
  });

  it("auth applies to DELETE /api/tasks/:id", async () => {
    const res = await request(app).delete("/api/tasks/1");

    expect(res.status).toBe(401);
  });
});
