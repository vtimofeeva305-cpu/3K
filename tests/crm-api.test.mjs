import assert from "node:assert/strict";
import test from "node:test";
import { handler } from "../supabase/functions/crm-api/index.js";

async function parse(response) {
  return response.json();
}

test("serves a health response with CORS headers", async () => {
  const response = await handler(new Request("https://example.test/health"));
  const body = await parse(response);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(body.ok, true);
  assert.equal(body.service, "crm-api");
});

test("returns seeded CRM collections", async () => {
  for (const path of ["/leads", "/deals", "/clients", "/managers", "/reports/summary"]) {
    const response = await handler(new Request(`https://example.test${path}`));
    const body = await parse(response);

    assert.equal(response.status, 200);
    assert.ok(body.data);
  }
});

test("creates a lead", async () => {
  const response = await handler(
    new Request("https://example.test/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client: "Тестовый клиент", phone: "+7 900 000-00-00" }),
    }),
  );
  const body = await parse(response);

  assert.equal(response.status, 201);
  assert.match(body.data.id, /^L-\d+$/);
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
  const body = await parse(response);

  assert.equal(response.status, 422);
  assert.equal(body.error, "validation_error");
});

test("does not turn missing routes into data", async () => {
  const response = await handler(new Request("https://example.test/unknown"));
  const body = await parse(response);

  assert.equal(response.status, 404);
  assert.equal(body.error, "not_found");
});
