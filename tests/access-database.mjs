import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createAccessRepository } from "../supabase/functions/three-k-api/access.js";
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const db = new PGlite();
const ids = [1, 2, 3, 4].map((n) => `00000000-0000-4000-8000-00000000000${n}`);
function tagged(client) {
  const sql = (strings, ...values) => client.query(strings.reduce((query, text, i) => query + (i ? `$${i}` : "") + text, ""), values).then((result) => result.rows);
  sql.begin = (callback) => db.transaction((tx) => callback(tagged(tx)));
  return sql;
}
try {
  await db.exec("create role anon; create role authenticated; create role service_role; create schema auth; create schema three_k; create table auth.users(id uuid primary key); create table auth.identities(user_id uuid, provider text, provider_id text, identity_data jsonb);");
  await db.exec(await readFile(new URL("../supabase/migrations/20260923210426_team_roles_and_invitations.sql", import.meta.url), "utf8"));
  for (const [i, id] of ids.entries()) {
    await db.query("insert into auth.users values ($1)", [id]);
    await db.query("insert into auth.identities values ($1, 'custom:three-k-telegram', $2, '{\"name\":\"Test\"}')", [id, `test-${i}`]);
  }
  await db.query("insert into three_k.members(user_id,telegram_subject,display_name,role) values ($1,'test-0','Test','superadmin')", [ids[0]]);
  const repo = createAccessRepository(async () => tagged(db));
  const actor = await repo.member(ids[0]);
  const invitation = await repo.createInvitation(actor);
  assert.match(invitation.token, /^[a-f0-9]{64}$/);
  const row = (await db.query("select * from three_k.invitations")).rows[0];
  assert.notEqual(row.token_hash, invitation.token);
  assert.equal(new Date(row.expires_at) - new Date(row.created_at), 7 * 86400000);
  assert.equal((await repo.invitations())[0].token_hash, undefined);
  const results = await Promise.allSettled(ids.slice(1, 3).map((id) => repo.accept({ id }, invitation.token)));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "fulfilled").value.role, "manager");
  assert.equal(results.find((result) => result.status === "rejected").reason.status, 410);
  assert.equal((await repo.team()).length, 2);
  const unused = ids.find((id) => id !== ids[0] && !results.find((r) => r.status === "fulfilled" && r.value.id === id));
  const revoked = await repo.createInvitation(actor);
  await repo.revoke(revoked.id);
  await assert.rejects(repo.accept({ id: unused }, revoked.token), (error) => error.status === 410);
  const expired = await repo.createInvitation(actor);
  await db.query("update three_k.invitations set created_at=now()-interval '8 days', expires_at=now()-interval '1 day' where id=$1", [expired.id]);
  await assert.rejects(repo.accept({ id: unused }, expired.token), (error) => error.status === 410);
  await assert.rejects(repo.accept({ id: unused }, "invalid"), (error) => error.status === 422);
  await assert.rejects(repo.role(ids[0], "manager"), (error) => error.status === 409);
  await assert.rejects(repo.role(unused, "superadmin"), (error) => error.status === 422);
  const winner = results.find((result) => result.status === "fulfilled").value;
  assert.equal((await repo.role(winner.id, "rop")).role, "rop");
  await assert.rejects(repo.setRule("phone", winner.id), (error) => error.status === 422);
  await repo.workday(winner.id, true);
  await repo.setRule("phone", winner.id);
  assert.equal((await repo.rules()).phone, winner.id);
  const existing = await repo.createInvitation(actor);
  await assert.rejects(repo.accept({ id: ids[0] }, existing.token), (error) => error.status === 409);
  assert.equal((await db.query("select used_at from three_k.invitations where id=$1", [existing.id])).rows[0].used_at, null);
  console.log("PostgreSQL repository: single-use race, 7-day expiry, revocation, hashing, roles and workdays passed; no live test records created.");
} finally { await db.close(); }
