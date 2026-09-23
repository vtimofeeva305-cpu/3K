import assert from "node:assert/strict";
import test from "node:test";
import { validateClient, clientRoute } from "../supabase/functions/three-k-api/clients.js";
import { createHandler } from "../supabase/functions/three-k-api/index.js";

const payload = { form: "Физлицо", name: "Тест", phone: "8 (900) 000-00-01", inn: "", email: "" };
test("normalizes client fields and rejects invalid values", () => {
  assert.equal(validateClient(payload).phone, "+79000000001");
  assert.throws(() => validateClient({ ...payload, name: " " }), /ФИО/);
  assert.throws(() => validateClient({ ...payload, phone: "abc" }), /телефон/);
  assert.throws(() => validateClient({ ...payload, email: "broken" }), /почт/);
  assert.throws(() => validateClient({ ...payload, inn: "123" }), /ИНН/);
  assert.throws(() => validateClient({ ...payload, account: "123" }), /счёт/);
});
test("creation passes only validated fields and a retry identity to storage", async () => {
  let captured;
  const repository = { create: async (...args) => { captured = args; return { id: "C-1" }; } };
  const member = { id: "actor" };
  const response = await clientRoute(repository, member, "POST", new URL("https://test/clients"), "/clients", {
    ...payload, requestId: "00000000-0000-4000-8000-000000000001", role: "superadmin",
  });
  assert.equal(response.id, "C-1");
  assert.equal(captured[0].role, undefined);
  assert.equal(captured[0].phone, "+79000000001");
  assert.equal(captured[1], "actor");
});
test("updates require version and reject invalid identifiers", async () => {
  await assert.rejects(clientRoute({}, {}, "POST", new URL("https://test/clients/C-1"), "/clients/C-1", payload), /Версия/);
  await assert.rejects(clientRoute({}, {}, "GET", new URL("https://test/clients/invalid"), "/clients/invalid", null), /идентификатор/);
});
test("pagination is bounded; search is passed as data", async () => {
  let query;
  await clientRoute({ list: async q => { query = q; return []; } }, {}, "GET", new URL("https://test/clients?q=9000000001&limit=999&offset=0"), "/clients", null);
  assert.equal(query.limit, 100);
  assert.equal(query.q, "9000000001");
});
test("client mutations cannot bypass membership", async () => {
  const handler = createHandler({}, async () => ({ id: "outsider" }), { member: async () => null });
  const response = await handler(new Request("https://test/clients", { method: "POST", body: JSON.stringify(payload) }));
  assert.equal(response.status, 403);
});

test("task creation rejects blank titles, invalid dates and missing retry keys", async () => {
  for (const payload of [
    { title: " ", date: "2026-10-01" },
    { title: "Позвонить", date: "2026-02-30" },
    { title: "Позвонить", date: "2026-10-01" },
  ]) await assert.rejects(clientRoute({}, {}, "POST", new URL("https://test/clients/C-1/tasks"), "/clients/C-1/tasks", payload), error => error.status === 422);
});
