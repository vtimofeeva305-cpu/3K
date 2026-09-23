import assert from "node:assert/strict";
import test from "node:test";
import { createHandler } from "../supabase/functions/three-k-api/index.js";
import { hashToken } from "../supabase/functions/three-k-api/access.js";

const self = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
function setup(role) {
  const calls = [];
  const access = {
    member: async () => role ? { id: self, role } : null,
    team: async () => [], rules: async () => ({}),
    createInvitation: async () => { calls.push("invite"); return {}; },
    invitations: async () => [],
    accept: async () => { calls.push("accept"); return { role: "manager" }; },
    revoke: async () => { calls.push("revoke"); return {}; },
    role: async () => { calls.push("role"); return {}; },
    workday: async () => { calls.push("workday"); return {}; },
    setRule: async () => { calls.push("rule"); return {}; },
  };
  const handler = createHandler({ listLeads: async () => [], reportSummary: async () => ({}) },
    async () => ({ id: self, user_metadata: { role: "superadmin" } }), access);
  const request = (path, body) => handler(new Request(`https://example.test${path}`, body === undefined ? {} : {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }));
  return { request, calls, access };
}

test("nonmembers cannot read CRM even with forged metadata", async () => {
  const { request } = setup(null);
  for (const path of ["/leads", "/team", "/assignment-rules", "/reports/summary", "/invitations"]) {
    assert.equal((await request(path)).status, 403, path);
  }
  assert.deepEqual((await (await request("/me")).json()).data, { member: null });
  assert.equal((await request("/invitations/accept", { token: "test" })).status, 200);
});

test("manager matrix rejects privileged mutations before repository access", async () => {
  const { request, calls } = setup("manager");
  assert.equal((await request("/leads")).status, 200);
  assert.equal((await request("/team")).status, 200);
  assert.equal((await request("/reports/summary")).status, 403);
  for (const path of ["/invitations", `/invitations/${other}/revoke`, `/team/${self}/role`, `/team/${other}/workday`, "/assignment-rules"]) {
    assert.equal((await request(path, { role: "superadmin", working: true })).status, 403, path);
  }
  assert.deepEqual(calls, []);
  assert.equal((await request(`/team/${self}/workday`, { working: true })).status, 200);
});

test("ROP can lead the team but cannot assign roles", async () => {
  const { request } = setup("rop");
  for (const path of ["/invitations", `/team/${other}/workday`, "/assignment-rules"]) {
    assert.equal((await request(path, {})).status, 200);
  }
  assert.equal((await request("/reports/summary")).status, 200);
  assert.equal((await request(`/team/${other}/role`, { role: "rop" })).status, 403);
});

test("superadmin assigns ROP, role changes take effect without changing JWT", async () => {
  const { request, access } = setup("superadmin");
  assert.equal((await request(`/team/${other}/role`, { role: "rop" })).status, 200);
  access.member = async () => ({ id: self, role: "manager" });
  assert.equal((await request("/reports/summary")).status, 403);
});

test("tokens use SHA-256, not the bearer value stored in the database", async () => {
  assert.equal(await hashToken("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
