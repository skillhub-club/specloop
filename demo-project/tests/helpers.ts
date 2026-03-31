import supertest from "supertest";
import app from "../src/app";

const API_KEY = "dev-key-123";

/** supertest agent with API key pre-set */
export function api() {
  return supertest(app);
}

/** Helper: POST /api/tasks with auth */
export function postTask(body: Record<string, any>) {
  return api().post("/api/tasks").set("X-API-Key", API_KEY).send(body);
}

/** Helper: GET with auth */
export function getApi(path: string) {
  return api().get(path).set("X-API-Key", API_KEY);
}

/** Helper: PUT with auth */
export function putApi(path: string, body: Record<string, any>) {
  return api().put(path).set("X-API-Key", API_KEY).send(body);
}

/** Helper: DELETE with auth */
export function deleteApi(path: string) {
  return api().delete(path).set("X-API-Key", API_KEY);
}

/** Helper: POST with auth (generic) */
export function postApi(path: string, body?: Record<string, any>) {
  const req = api().post(path).set("X-API-Key", API_KEY);
  return body ? req.send(body) : req.send();
}

export { API_KEY };
