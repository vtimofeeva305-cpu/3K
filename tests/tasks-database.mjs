import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createTaskRepository} from "../supabase/functions/three-k-api/tasks.js";
const {PGlite}=await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const db=new PGlite();
function tagged(client){
  const sql=(strings,...values)=>client.query(strings.reduce((q,s,i)=>q+(i?`$${i}`:"")+s,""),values).then(r=>r.rows);
  sql.begin=callback=>db.transaction(tx=>callback(tagged(tx)));
  return sql;
}
const self={id:"00000000-0000-4000-8000-000000000001",role:"manager"};
const other={id:"00000000-0000-4000-8000-000000000002",role:"manager"};
const boss={...other,role:"rop"};
const denied=promise=>assert.rejects(promise,error=>[403,404,409,422].includes(error.status));
try{
  await db.exec("create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key);");
  for(const name of ["20260923172956_bootstrap_three_k_namespace","20260923210426_team_roles_and_invitations","20260923212051_client_persistence","20260923214212_sales_persistence"])
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}.sql`,import.meta.url),"utf8"));
  await db.query("insert into auth.users values ($1),($2)",[self.id,other.id]);
  await db.query("insert into three_k.members(user_id,telegram_subject,display_name,role) values ($1,'one','First','manager'),($2,'two','Second','rop')",[self.id,other.id]);
  await db.exec("insert into three_k.clients(id,form,name,display_name,phone) values ('C-1','Физлицо','Клиент','Клиент','+79000000001');");
  await db.query("insert into three_k.client_tasks(client_id,title,due_date,assignee_id,request_id) values ('C-1','Старая задача','2026-01-01',$1,$2)",[self.id,crypto.randomUUID()]);
  await db.exec(await readFile(new URL(process.env.TASK_MIGRATION || "../supabase/migrations/20260923220826_unified_tasks.sql",import.meta.url),"utf8"));
  const repo=createTaskRepository(async()=>tagged(db));
  assert.equal((await repo.list(self,{filter:"active"})).items[0].title,"Старая задача");
  const [lead]=(await db.query("insert into three_k.leads(client,phone,assignee_id) values ('Клиент','+79000000001',$1) returning id",[self.id])).rows;
  const [deal]=(await db.query("insert into three_k.deals(client,company,product,assignee_id) values ('Клиент','Клиент','Техника',$1) returning id",[self.id])).rows;
  const today=(await db.query("select (now() at time zone 'Europe/Moscow')::date::text as date")).rows[0].date;
  const c={kind:"leads",id:lead.id};
  const request=crypto.randomUUID();
  const data={title:"Позвонить",due_date:today};
  const task=await repo.create(c,data,self,request);
  assert.equal((await repo.create(c,data,self,request)).id,task.id);
  await denied(repo.create(c,data,other,request));
  await denied(repo.create(c,data,other,crypto.randomUUID()));
  await denied(repo.create(c,{...data,assignee_id:other.id},self,crypto.randomUUID()));
  const dealTask=await repo.create({kind:"deals",id:deal.id},data,boss,crypto.randomUUID());
  assert.equal((await repo.list(self,{filter:"today"})).items.length,1);
  assert.equal((await repo.list(boss,{filter:"today",scope:"team"})).items.length,2);
  assert.equal((await repo.list(self,{filter:"overdue"})).items.length,1);
  await denied(repo.update(task.id,{completed:true},1,other));
  await denied(repo.update(task.id,{completed:true},1,self,{kind:"clients",id:"C-1"}));
  await repo.update(task.id,{completed:true},1,self);
  assert.equal((await repo.list(self,{filter:"completed"})).items[0].id,task.id);
  assert.equal((await repo.list(self,{filter:"today"})).items.length,0);
  await denied(repo.update(task.id,{completed:false},1,self));
  await repo.update(task.id,{completed:false,due_date:"2099-01-01",assignee_id:other.id},2,boss);
  await denied(repo.update(task.id,{title:"Запрещено"},3,self));
  assert.equal((await repo.list(other,{filter:"upcoming"})).items[0].id,task.id);
  assert.equal((await repo.history(task.id)).length,3);
  const old=(await repo.list(self,{kind:"clients",id:"C-1",filter:"active"})).items[0];
  await repo.update(old.id,{completed:true},old.version,self);
  assert.equal((await repo.list(self,{kind:"clients",id:"C-1",filter:"all"})).items.length,1);
  // Force an audit failure and prove the task mutation rolls back with it.
  await assert.rejects(repo.update(dealTask.id,{title:"Откат"},1,{id:crypto.randomUUID(),role:"rop"}));
  assert.equal((await repo.list(boss,{kind:"deals",id:deal.id})).items[0].title,"Позвонить");
  await assert.rejects(db.exec("update three_k.client_tasks set client_id='C-1' where lead_id is not null"));
  assert.equal((await db.query("select has_table_privilege('anon','three_k.task_events','SELECT') as allowed")).rows[0].allowed,false);
  console.log("Task PostgreSQL passed: migration preservation, contexts, assignment, permissions, retry, Moscow date filters, completion/reopening, stale writes, history, rollback, private grants.");
}finally{await db.close();}
