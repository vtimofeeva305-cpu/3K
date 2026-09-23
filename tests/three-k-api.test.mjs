import assert from "node:assert/strict";
import test from "node:test";
import { createHandler } from "../supabase/functions/three-k-api/index.js";

const sample = {
  lead: { id: "L-2482", client: "Тестовый клиент", phone: "+7 900 000-00-00" },
  deal: { id: "D-1060", client: "Тестовый клиент", product: "Sea-Doo" },
};

function makeRepository() {
  return {
    async listLeads() { return [sample.lead]; },
    async listDeals() { return [sample.deal]; },
    async listClients() { return [{ id: "C-101" }]; },
    async listManagers() { return [{ id: "anna" }]; },
    async reportSummary() { return { period: "Сентябрь 2026" }; },
    async createLead(payload) { return { ...sample.lead, ...payload }; },
    async createDeal(payload) { return { ...sample.deal, ...payload }; },
  };
}

const access = { async member() { return { id: "test-user", role: "rop" }; }, async team() { return []; } };
const handler = createHandler(makeRepository(), async () => ({ id: "test-user" }), access, { list: async () => ({ items: [], hasMore: false }) }, { list: async () => ({ items: [], hasMore: false }), create: async (kind,data) => data });

test("serves health through the deployed function path", async () => {
  const response = await handler(
    new Request("https://example.supabase.co/functions/v1/three-k-api/health"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(body.ok, true);
  assert.equal(body.service, "3K");
});

test("returns CRM collections through the isolated repository", async () => {
  for (const path of ["/leads", "/deals", "/clients", "/managers", "/reports/summary"]) {
    const response = await handler(new Request(`https://example.test${path}`));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.ok(body.data);
  }
});

test("creates a lead", async () => {
  const response = await handler(
    new Request("https://example.test/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client: "Тестовый клиент", phone: "+7 900 000-00-00", listing: "Sea-Doo", requestId: crypto.randomUUID() }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.client, "Тестовый клиент");
});

test("validates required lead fields", async () => {
  const response = await handler(
    new Request("https://example.test/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client: "Без телефона" }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.error, "access_error");
});

test("does not turn missing routes into data", async () => {
  const response = await handler(new Request("https://example.test/unknown"));
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, "not_found");
});

test("rejects data access without a real user session", async () => {
  const protectedHandler = createHandler(makeRepository(), async () => null);
  const response = await protectedHandler(new Request("https://example.test/leads"));
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "unauthorized");
});
