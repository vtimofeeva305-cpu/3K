import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClientRepository, validateClient } from "../supabase/functions/three-k-api/clients.js";
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const db = new PGlite();
// Adapt only parameter binding and transactions; PostgreSQL executes the actual repository queries.
function tagged(client) {
  const sql = (strings, ...values) => {
    if (!Array.isArray(strings)) return { record: strings };
    const parameters = [];
    const bind = value => { parameters.push(value); return `$${parameters.length}`; };
    let query = strings[0];
    values.forEach((value, index) => {
      if (value?.record) {
        const entries = Object.entries(value.record);
        const name = key => `"${key.replaceAll('"', '""')}"`;
        if (/insert into[\s\S]*$/i.test(query)) {
          query += `(${entries.map(([key]) => name(key)).join(', ')}) values (${entries.map(([, v]) => bind(v)).join(', ')})`;
        } else query += entries.map(([key, v]) => `${name(key)} = ${bind(v)}`).join(', ');
      } else query += bind(value);
      query += strings[index + 1];
    });
    return client.query(query, parameters).then(result => result.rows);
  };
  sql.array = value => value;
  sql.begin = callback => db.transaction(tx => callback(tagged(tx)));
  return sql;
}

const actor = "00000000-0000-4000-8000-000000000001";
const outsider = "00000000-0000-4000-8000-000000000002";
const requestId = "10000000-0000-4000-8000-000000000001";
try {
  await db.exec("create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key);");
  await db.exec(await readFile(new URL("../supabase/migrations/20260923172956_bootstrap_three_k_namespace.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/20260923210426_team_roles_and_invitations.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL(process.env.CLIENT_MIGRATION || "../supabase/migrations/20260923212051_client_persistence.sql", import.meta.url), "utf8"));
  await db.query("insert into auth.users values ($1),($2)", [actor, outsider]);
  await db.query("insert into three_k.members(user_id,telegram_subject,display_name,role) values ($1,'test1','Actor','manager'),($2,'test2','Other','manager')", [actor, outsider]);
  const repo = createClientRepository(async () => tagged(db));
  const data = validateClient({ form: "Физлицо", name: "SQL проверка", phone: "8 (900) 000-00-01", passport: "Тест", bank: "Банк" });
  const client = await repo.create(data, actor, requestId);
  assert.match(client.id, /^C-/);
  assert.equal((await repo.get(client.id)).passport, "Тест");
  assert.equal((await repo.create(data, actor, requestId)).id, client.id);
  await assert.rejects(repo.create(data, actor, crypto.randomUUID()), error => error.status === 409);
  assert.equal((await repo.list({ q: "9000000001", limit: 30, offset: 0 })).items[0].id, client.id);
  const listed = (await repo.list({ q: "SQL проверка", limit: 1, offset: 0 })).items[0];
  assert.equal(listed.passport, undefined);
  const saved = await repo.update(client.id, { ...data, address: "Новый адрес" }, 1, actor);
  assert.equal(saved.version, 2);
  await assert.rejects(repo.update(client.id, { ...data, address: "Затереть" }, 1, actor), error => error.status === 409);
  assert.equal((await repo.get(client.id)).address, "Новый адрес");
  assert.equal((await db.query("select count(*)::int as n from three_k.client_events where client_id=$1", [client.id])).rows[0].n, 2);
  const taskPayload = { title: "Позвонить", date: "2026-10-01", requestId: crypto.randomUUID() };
  const task = await repo.createTask(client.id, taskPayload, actor);
  assert.equal((await repo.createTask(client.id, taskPayload, actor)).id, task.id);
  assert.equal((await repo.tasks(client.id)).length, 1);
  await assert.rejects(repo.completeTask(client.id, task.id, { version: 1, completed: true }, { id: outsider, role: "manager" }), error => error.status === 409);
  await repo.completeTask(client.id, task.id, { version: 1, completed: true }, { id: actor, role: "manager" });
  assert.ok((await repo.tasks(client.id))[0].completedAt);
  await assert.rejects(repo.completeTask(client.id, task.id, { version: 1, completed: false }, { id: actor, role: "manager" }), error => error.status === 409);
  const privileges = (await db.query("select has_table_privilege('anon','three_k.clients','SELECT') as anon, has_table_privilege('authenticated','three_k.client_tasks','INSERT') as authenticated")).rows[0];
  assert.equal(privileges.anon, false);
  assert.equal(privileges.authenticated, false);
  console.log("PostgreSQL: migration, create/read/update, retry, duplicate, search, version conflict, audit, task completion and permissions passed. No live records created.");
} finally { await db.close(); }
