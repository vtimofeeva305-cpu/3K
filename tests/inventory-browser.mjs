import assert from "node:assert/strict";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser=await chromium.launch({headless:true});
const member={id:"00000000-0000-4000-8000-000000000001",name:"Leader",role:"rop",working:true};
const id=crypto.randomUUID(),items=[],errors=[];
let conflict=false;
try{
  const context=await browser.newContext();await context.addInitScript(()=>localStorage.setItem("three-k-auth-session",JSON.stringify({accessToken:"test",expiresAt:Date.now()+3600000})));
  const page=await context.newPage();page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/auth/v1/user",route=>route.fulfill({json:{id:member.id,user_metadata:{name:member.name}}}));
  await page.route("**/functions/v1/three-k-api/**",async route=>{
    const url=new URL(route.request().url()),path=url.pathname.split("three-k-api")[1],payload=route.request().method()==="POST"?route.request().postDataJSON():null;
    let data;
    if(path==="/me")data={member};else if(path==="/team")data=[member];else if(path==="/assignment-rules")data={};else if(path==="/notifications/count")data={unread:0};
    else if(path==="/sales/summary")data={leads:0,deals:1,clients:0};else if(path==="/tasks")data={items:[],hasMore:false};
    else if(path==="/deals")data={items:[{id:"D-1",client:"Покупатель",product:"Sea-Doo",assigneeId:member.id}],hasMore:false};
    else if(path==="/deals/D-1")data={id:"D-1",clientId:"C-1",client:"Покупатель",product:"Sea-Doo",amount:123.45,stage:"Успешно",status:"closed",virtual:false,vin:"1HGCM82633A004352",closeDate:"",lossReason:"",version:1,assigneeId:member.id,createdAt:new Date().toISOString(),events:[]};
    else if(path==="/deals/D-1/payments")data={items:[],hasMore:false,total:"123.45",paid:"0",balance:"123.45",overpaid:"0",today:"2026-09-24",version:1};
    else if(path==="/inventory" && payload){data={...payload,id,version:1,status:"available",events:[],created_at:new Date().toISOString()};items.push(data);}
    else if(path==="/inventory")data={items:items.filter(item=>(!url.searchParams.get("status") || item.status===url.searchParams.get("status")) && (!url.searchParams.get("q") || item.name.includes(url.searchParams.get("q")))),hasMore:false};
    else if(path.startsWith(`/inventory/${id}`)){
      data=items[0];if(payload){
        if(conflict)return route.fulfill({status:409,json:{message:"Карточка техники изменена"}});
        const action=path.split("/")[3];
        if(action==="reserve")Object.assign(data,{status:"reserved",deal_id:payload.dealId,deal_assignee_id:member.id,client:"Покупатель"});
        else if(action==="release")Object.assign(data,{status:"available",deal_id:null});
        else if(action==="deliver")Object.assign(data,{status:"sold"});
        else if(action==="archive")data.status="archived";else if(action==="restore")data.status="available";else Object.assign(data,payload);
        data.version++;
      }
    }else return route.fulfill({status:404,json:{message:`Unknown ${path}`}});
    return route.fulfill({json:{data}});
  });
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:5177");
  await page.getByRole("button",{name:"Шоурум и склад",exact:true}).click();
  await page.getByText("Техника не найдена",{exact:true}).waitFor();
  await page.getByRole("button",{name:"Добавить технику",exact:true}).click();
  await page.getByLabel("Модель техники",{exact:true}).fill("Sea-Doo");
  await page.getByLabel("VIN техники",{exact:true}).fill("1HGCM82633A004352");
  await page.getByLabel("Стоимость техники",{exact:true}).fill("123.45");
  await page.getByRole("button",{name:"Сохранить технику",exact:true}).click();
  await page.getByRole("heading",{name:"Sea-Doo",exact:true}).waitFor();
  await page.getByLabel("Место хранения",{exact:true}).fill("Черновик");
  conflict=true;await page.getByRole("button",{name:"Сохранить технику",exact:true}).click();
  await page.getByRole("alert").filter({hasText:"изменена"}).waitFor();assert.equal(await page.getByLabel("Место хранения",{exact:true}).inputValue(),"Черновик");
  await page.getByRole("button",{name:"Отменить изменения техники",exact:true}).click();conflict=false;
  await page.getByLabel("Сделка для резерва",{exact:true}).selectOption("D-1");
  await page.getByRole("button",{name:"Зарезервировать",exact:true}).click();
  await page.getByRole("button",{name:"Снять резерв",exact:true}).waitFor();assert.equal(items[0].deal_id,"D-1");
  page.once("dialog",dialog=>dialog.accept());await page.getByRole("button",{name:"Снять резерв",exact:true}).click();
  await page.getByRole("button",{name:"В архив",exact:true}).click();
  await page.getByRole("button",{name:"Вернуть на склад",exact:true}).click();
  await page.getByLabel("Сделка для резерва",{exact:true}).selectOption("D-1");
  await page.getByRole("button",{name:"Зарезервировать",exact:true}).click();
  page.once("dialog",dialog=>dialog.accept());await page.getByRole("button",{name:"Выдать технику",exact:true}).click();
  await page.locator('.sales-detail > p').filter({hasText:/^Выдано$/}).waitFor();assert.equal(items[0].status,"sold");
  await page.reload();await page.getByRole("button",{name:"Шоурум и склад",exact:true}).click();
  await page.getByLabel("Наличие техники",{exact:true}).selectOption("sold");await page.locator('.sales-row').first().click();
  await page.getByLabel("VIN техники",{exact:true}).waitFor();assert.equal(await page.getByLabel("VIN техники",{exact:true}).inputValue(),"1HGCM82633A004352");
  await page.getByRole("button",{name:"D-1 · Покупатель",exact:true}).click();
  await page.getByRole("heading",{name:"D-1",exact:true}).waitFor();
  await page.locator('.linked-sale').filter({hasText:"Sea-Doo"}).click();
  await page.getByRole("heading",{name:"Sea-Doo",exact:true}).waitFor();
  for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:`/tmp/three-k-inventory-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  member.role="manager";await page.reload();await page.getByRole("button",{name:"Шоурум и склад",exact:true}).click();assert.equal(await page.getByRole("button",{name:"Добавить технику",exact:true}).count(),0);
  assert.deepEqual(errors,[]);console.log("Inventory browser passed: create, conflict draft, reserve/release, archive/restore, delivery, reload, filters, manager permissions and desktop/mobile (mock API).");
}finally{await browser.close();}
