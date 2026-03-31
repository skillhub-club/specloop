import express from "express";
import { initDb, getDb } from "./db";

const app = express();
app.use(express.json());

initDb();

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// API key authentication middleware for /api/* routes
const API_KEY = process.env.API_KEY || "dev-key-123";
app.use("/api", (req, res, next) => {
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];
const VALID_SORT_FIELDS = ["created_at", "updated_at", "priority", "title"];
const VALID_ORDER_VALUES = ["asc", "desc"];
const PRIORITY_ORDER_EXPR = "CASE priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END";

// POST /api/tasks - create a task
app.post("/api/tasks", (req, res) => {
  const { title, description, priority, assigned_to } = req.body;
  if (!title || (typeof title === "string" && title.trim() === "")) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
    res.status(400).json({ error: "Invalid priority. Must be one of: low, medium, high, urgent" });
    return;
  }
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO tasks (title, description, priority, assigned_to) VALUES (?, ?, ?, ?)"
  );
  const result = stmt.run(title, description ?? "", priority ?? "medium", assigned_to ?? null);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ data: task });
});

// GET /api/tasks - list all tasks (supports filtering, pagination)
app.get("/api/tasks", (req, res) => {
  const db = getDb();
  const conditions: string[] = [];
  const values: any[] = [];

  const { status, priority, assigned_to } = req.query;

  if (typeof status === "string" && status.length > 0) {
    conditions.push("status = ?");
    values.push(status);
  }
  if (typeof priority === "string" && priority.length > 0) {
    conditions.push("priority = ?");
    values.push(priority);
  }
  if (typeof assigned_to === "string" && assigned_to.length > 0) {
    conditions.push("assigned_to = ?");
    values.push(assigned_to);
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  // Pagination
  let limit = parseInt(req.query.limit as string, 10);
  if (isNaN(limit) || limit < 0) limit = 20;
  if (limit > 100) limit = 100;

  let offset = parseInt(req.query.offset as string, 10);
  if (isNaN(offset) || offset < 0) offset = 0;

  // Sorting
  let sortField = req.query.sort as string;
  let order = req.query.order as string;
  if (!sortField || !VALID_SORT_FIELDS.includes(sortField)) {
    sortField = "created_at";
    order = "desc";
  }
  if (!order || !VALID_ORDER_VALUES.includes(order.toLowerCase())) {
    order = "desc";
  }
  order = order.toLowerCase();
  const orderClause = sortField === "priority"
    ? ` ORDER BY ${PRIORITY_ORDER_EXPR} ${order}, id ${order}`
    : ` ORDER BY ${sortField} ${order}, id ${order}`;

  const total = (db.prepare(`SELECT COUNT(*) as count FROM tasks${where}`).get(...values) as any).count;
  const tasks = db.prepare(`SELECT * FROM tasks${where}${orderClause} LIMIT ? OFFSET ?`).all(...values, limit, offset);

  res.json({
    data: tasks,
    meta: { total, limit, offset, hasMore: offset + limit < total },
  });
});

// GET /api/tasks/:id - get a single task
app.get("/api/tasks/:id", (req, res) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json({ data: task });
});

// PUT /api/tasks/:id - update a task
app.put("/api/tasks/:id", (req, res) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const { title, description, status, priority, assigned_to } = req.body;
  if (status !== undefined && !["todo", "in_progress", "done"].includes(status)) {
    res.status(400).json({ error: "Invalid status. Must be one of: todo, in_progress, done" });
    return;
  }
  if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
    res.status(400).json({ error: "Invalid priority. Must be one of: low, medium, high, urgent" });
    return;
  }
  const updates: string[] = [];
  const values: any[] = [];
  if (title !== undefined) { updates.push("title = ?"); values.push(title); }
  if (description !== undefined) { updates.push("description = ?"); values.push(description); }
  if (status !== undefined) { updates.push("status = ?"); values.push(status); }
  if (priority !== undefined) { updates.push("priority = ?"); values.push(priority); }
  if (assigned_to !== undefined) { updates.push("assigned_to = ?"); values.push(assigned_to); }
  updates.push("updated_at = datetime('now')");
  values.push(req.params.id);
  db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  res.json({ data: updated });
});

// POST /api/tasks/:id/assign - assign a task
app.post("/api/tasks/:id/assign", (req, res) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const { assigned_to } = req.body;
  db.prepare("UPDATE tasks SET assigned_to = ?, updated_at = datetime('now') WHERE id = ?").run(assigned_to, req.params.id);
  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  res.json({ data: updated });
});

// POST /api/tasks/:id/unassign - unassign a task
app.post("/api/tasks/:id/unassign", (req, res) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  db.prepare("UPDATE tasks SET assigned_to = NULL, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  res.json({ data: updated });
});

// DELETE /api/tasks/:id - delete a task
app.delete("/api/tasks/:id", (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.status(204).send();
});

// GET /api/stats - task statistics
app.get("/api/stats", (_req, res) => {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as count FROM tasks").get() as any).count;

  const statusRows = db.prepare("SELECT status, COUNT(*) as count FROM tasks GROUP BY status").all() as any[];
  const byStatus = { todo: 0, in_progress: 0, done: 0 };
  for (const row of statusRows) {
    if (row.status in byStatus) {
      (byStatus as any)[row.status] = row.count;
    }
  }

  const priorityRows = db.prepare("SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority").all() as any[];
  const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
  for (const row of priorityRows) {
    if (row.priority in byPriority) {
      (byPriority as any)[row.priority] = row.count;
    }
  }

  const unassigned = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE assigned_to IS NULL").get() as any).count;

  res.json({
    data: { total, byStatus, byPriority, unassigned },
  });
});

export default app;
