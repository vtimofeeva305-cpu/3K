import test from "node:test";
import assert from "node:assert/strict";
import {validateInventory,inventoryRoute} from "../supabase/functions/three-k-api/inventory.js";
import {createHandler} from "../supabase/functions/three-k-api/index.js";
test("inventory validates name, VIN and exact price",()=>{
  assert.equal(validateInventory({name:" Model ",vin:"1hgcm82633a004352",price:"0.10"}).vin,"1HGCM82633A004352");
  for(const patch of [{name:" "},{vin:"bad"},{price:-1},{price:"1e3"},{price:"1.001"}])assert.throws(()=>validateInventory({name:"Model",price:100,...patch}));
});
test("inventory mutation requires a version and valid filters",async()=>{
  const id=crypto.randomUUID(),url=new URL(`https://test/inventory/${id}/reserve`);
  await assert.rejects(inventoryRoute({}, {}, "POST",url,url.pathname,{dealId:"D-1"}),error=>error.status===422);
  const list=new URL("https://test/inventory?offset=-1");
  await assert.rejects(inventoryRoute({}, {}, "GET",list,list.pathname,null),error=>error.status===422);
});
test("nonmembers cannot access inventory",async()=>{
  const handler=createHandler({},async()=>({id:"outsider"}),{member:async()=>null});
  assert.equal((await handler(new Request("https://test/inventory"))).status,403);
});
