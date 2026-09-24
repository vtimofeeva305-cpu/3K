import assert from "node:assert/strict";
import test from "node:test";
import {validateTask,taskRoute} from "../supabase/functions/three-k-api/tasks.js";
import {createHandler} from "../supabase/functions/three-k-api/index.js";
test("validates task dates, content, assignee and completion",()=>{
  assert.equal(validateTask({title:" Звонок ",date:"2026-10-01"}).title,"Звонок");
  for(const data of [{title:"",date:"2026-10-01"},{title:"Звонок",date:"2026-02-30"},{title:"Звонок",date:"bad"},{completed:"true"},{assigneeId:"bad"},{}]) assert.throws(()=>validateTask(data,true));
});
test("task routes validate context, pagination, versions and leader scope",async()=>{
  const call=(path,method="GET",payload)=>taskRoute({}, {id:crypto.randomUUID(),role:"manager"},method,new URL(`https://test${path}`),path.split("?")[0],payload);
  for(const path of ["/tasks?scope=team","/tasks?offset=-1","/tasks?kind=leads&contextId=C-1","/tasks?filter=bad"])
    await assert.rejects(call(path),error=>[403,422].includes(error.status));
  await assert.rejects(call(`/tasks/${crypto.randomUUID()}`,"POST",{completed:true}),error=>error.status===422);
});
test("task endpoints retain membership gate",async()=>{
  const handler=createHandler({},async()=>({id:crypto.randomUUID()}),{member:async()=>null});
  assert.equal((await handler(new Request("https://test/tasks"))).status,403);
});
