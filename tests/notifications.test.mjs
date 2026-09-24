import test from "node:test";
import assert from "node:assert/strict";
import {notificationRoute} from "../supabase/functions/three-k-api/notifications.js";
import {createHandler} from "../supabase/functions/three-k-api/index.js";
test("notifications reject invalid cursors, filters and read batches",async()=>{
  for(const suffix of ["?before=-1","?before=9223372036854775808","?filter=team"]){
    const url=new URL(`https://test/notifications${suffix}`);
    await assert.rejects(notificationRoute({}, {}, "GET",url,url.pathname,null),error=>error.status===422);
  }
  const url=new URL("https://test/notifications/read");
  for(const payload of [{ids:[],read:true},{ids:[1],read:true},{ids:["1"],read:"true"},{ids:Array(31).fill("1"),read:true}])await assert.rejects(notificationRoute({}, {}, "POST",url,url.pathname,payload),error=>error.status===422);
});
test("recipient always comes from membership, not request parameters",async()=>{
  const calls=[],repo={mark:async(...args)=>{calls.push(args);return {};}};
  const member={id:"me",role:"rop"},url=new URL("https://test/notifications/read?recipient=other");
  await notificationRoute(repo,member,"POST",url,url.pathname,{ids:["1","1"],read:true,recipient:"other"});
  assert.deepEqual(calls,[[member,["1"],true]]);
});
test("nonmembers cannot list or read notifications",async()=>{
  const handler=createHandler({},async()=>({id:"outsider"}),{member:async()=>null});
  assert.equal((await handler(new Request("https://test/notifications"))).status,403);
});
