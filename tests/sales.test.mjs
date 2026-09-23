import test from "node:test";
import assert from "node:assert/strict";
import { validateSale, salesRoute } from "../supabase/functions/three-k-api/sales.js";
const lead = { client:"Клиент",phone:"89000000000",listing:"Sea-Doo" };
const deal = { clientId:"C-1",product:"Sea-Doo",amount:"100.25",virtual:true };
test("source and responsibility cannot be forged in ordinary writes",()=>{
  for (const field of ["source","sourceCode","source_code","manager","assigneeId","assignee_id","status","lead_id"]) {
    assert.throws(()=>validateSale({...lead,[field]:"fake"},"leads"),error=>error.status===422);
  }
});
test("money, VIN, dates, closure reasons and client IDs are validated",()=>{
  assert.equal(validateSale(deal,"deals").amount,100.25);
  for (const amount of ["-1","1,00","1e6","100 руб","1.001",null,Infinity,1e13]) assert.throws(()=>validateSale({...deal,amount},"deals"));
  for (const patch of [{clientId:"name"},{vin:"123"},{closeDate:"2026-02-30"},{stage:"Отказ"},{virtual:"false"}]) assert.throws(()=>validateSale({...deal,...patch},"deals"));
});
test("landing source is bound to route, retry IDs and versions required",async()=>{
  const calls=[];
  const repo={create:async(...args)=>{calls.push(args);return {};}};
  const payload={...lead,requestId:crypto.randomUUID()};
  await salesRoute(repo,{id:"actor"},"POST",new URL("https://test/intake/landing"),"/intake/landing",payload);
  assert.equal(calls[0][4],"landing");
  await assert.rejects(salesRoute(repo,{},"POST",new URL("https://test/leads"),"/leads",lead),error=>error.status===422);
  await assert.rejects(salesRoute(repo,{},"POST",new URL("https://test/leads/L-1/convert"),"/leads/L-1/convert",{}),error=>error.status===422);
});
