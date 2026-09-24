import test from "node:test";
import assert from "node:assert/strict";
import { validatePayment,paymentRoute } from "../supabase/functions/three-k-api/payments.js";
import { createHandler } from "../supabase/functions/three-k-api/index.js";
import { validateSale } from "../supabase/functions/three-k-api/sales.js";
const payment=()=>({kind:"receipt",amount:"0.10",paidOn:"2026-01-01",method:"bank",note:"",version:1,requestId:crypto.randomUUID()});
test("payment input keeps decimal precision and rejects invalid financial entries",()=>{
  assert.equal(validatePayment(payment()).amount,"0.10");
  for(const amount of [0,-1,"1e2","1,20","1.001",null,"1000000000000"]){assert.throws(()=>validatePayment({...payment(),amount}));}
  for(const patch of [{kind:"refund"},{paidOn:"2026-02-30"},{paidOn:"2099-13-01"},{method:"other"},{requestId:""},{version:0},{kind:"reversal",note:"reason",reversesId:"bad"}])assert.throws(()=>validatePayment({...payment(),...patch}));
  assert.equal(validateSale({clientId:"C-1",virtual:true,product:"",amount:0},"deals").product,"Модель уточняется");
});
test("payment routes require valid pagination and never expose mutation or deletion routes",async()=>{
  const url=new URL("https://test/deals/D-1/payments?offset=-1");
  await assert.rejects(paymentRoute({}, {}, "GET",url,url.pathname,null),error=>error.status===422);
  await assert.rejects(paymentRoute({}, {}, "DELETE",url,url.pathname,null),error=>error.status===405);
});
test("nonmembers cannot access the payment ledger",async()=>{
  const handler=createHandler({},async()=>({id:"outsider"}),{member:async()=>null});
  const response=await handler(new Request("https://test/deals/D-1/payments"));
  assert.equal(response.status,403);
});
