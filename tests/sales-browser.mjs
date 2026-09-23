import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({headless:true});
const member = { id:"00000000-0000-4000-8000-000000000001",name:"Менеджер",role:"rop",working:true };
const records = {leads:[],deals:[]};
let conversions = 0;
let conflict = false;
const errors = [];
try {
  const context = await browser.newContext();
  await context.addInitScript(()=>localStorage.setItem("three-k-auth-session",JSON.stringify({accessToken:"test",expiresAt:Date.now()+3600000})));
  const page = await context.newPage();
  page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/auth/v1/user",route=>route.fulfill({json:{id:member.id,user_metadata:{name:member.name}}}));
  await page.route("**/functions/v1/three-k-api/**",async route=>{
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.split("three-k-api")[1];
    const payload = request.method()==="POST" ? request.postDataJSON() : null;
    let data;
    if (path==="/me") data={member};
    else if (path==="/team") data=[member];
    else if (path==="/assignment-rules") data={};
    else if (path==="/sales/summary") data={leads:records.leads.length,deals:records.deals.length,clients:1};
    else if (path==="/clients") data={items:[{id:"C-1",displayName:"Покупатель",phone:"+79000000001"}],hasMore:false};
    else {
      const [,kind,id,action] = path.split("/");
      if (!records[kind]) return route.fulfill({status:404,json:{message:"Unknown route"}});
      const record = records[kind].find(item=>item.id===id);
      if (!id && payload) {
        data={...payload,id:`${kind==="leads" ? "L" : "D"}-${records[kind].length+1}`,client:payload.client || "Покупатель",clientId:"C-1",version:1,source:"Телефон",assigneeId:member.id,manager:member.name,createdAt:new Date().toISOString(),status:kind==="leads" ? "Новый" : "open",events:[]};
        records[kind].push(data);
      } else if (!id) data={items:records[kind].filter(item=>!url.searchParams.get("status") || item.status===url.searchParams.get("status")),hasMore:false};
      else if (action==="convert") {
        conversions++;
        data=records.deals.find(item=>item.leadId===id);
        if (!data) { data={...record,id:"D-1",leadId:id,product:record.listing,amount:record.price,stage:"Квалификация",status:"open",virtual:false,vin:"",closeDate:"",lossReason:"",events:[]}; records.deals.push(data); record.dealId=data.id; record.status="Сделка создана"; }
      } else if (payload) {
        if (conflict) return route.fulfill({status:409,json:{message:"Карточка уже изменена"}});
        Object.assign(record,payload,{version:record.version+1,status:["Отказ","Успешно"].includes(payload.stage) ? "closed" : "open"}); data=record;
      } else data=record;
    }
    return route.fulfill({json:{data}});
  });
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:5176");
  await page.getByRole("button",{name:"Лиды",exact:true}).click();
  await page.getByRole("button",{name:"Новый лид",exact:true}).click();
  await page.getByLabel("Клиент",{exact:true}).fill("Покупатель");
  await page.getByLabel("Телефон",{exact:true}).fill("+79000000001");
  await page.getByLabel("Интересующая техника",{exact:true}).fill("Sea-Doo");
  await page.getByLabel("Бюджет",{exact:true}).fill("123.45");
  await page.getByRole("button",{name:"Сохранить",exact:true}).click();
  await page.getByRole("heading",{name:"L-1",exact:true}).waitFor();
  await page.getByRole("button",{name:"Создать сделку",exact:true}).click();
  await page.getByRole("heading",{name:"D-1",exact:true}).waitFor();
  assert.equal(conversions,1);
  assert.equal(records.deals.length,1);
  await page.getByLabel("Техника",{exact:true}).fill("Sea-Doo обновлённый");
  await page.getByLabel("Этап",{exact:true}).selectOption("Отказ");
  await page.getByLabel("Причина отказа",{exact:true}).fill("Перенос покупки");
  await page.getByRole("button",{name:"Сохранить",exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.sales-meta')?.textContent.includes('Отказ'));
  await page.reload();
  await page.getByRole("button",{name:"Сделки",exact:true}).click();
  await page.getByLabel("Статус списка",{exact:true}).selectOption("closed");
  await page.locator('.sales-row').first().click();
  await page.getByLabel("Техника",{exact:true}).waitFor();
  assert.equal(await page.getByLabel("Техника",{exact:true}).inputValue(),"Sea-Doo обновлённый");
  conflict=true;
  await page.getByLabel("Техника",{exact:true}).fill("Несохранённый черновик");
  await page.getByRole("button",{name:"Сохранить",exact:true}).click();
  await page.getByRole("alert").filter({hasText:"уже изменена"}).waitFor();
  assert.equal(await page.getByLabel("Техника",{exact:true}).inputValue(),"Несохранённый черновик");
  await page.getByRole("button",{name:"Отменить",exact:true}).click();
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    await page.screenshot({path:`/tmp/three-k-sales-${width}.png`,fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow at ${width}`);
  }
  assert.deepEqual(errors,[]);
  console.log("Sales browser passed: lead creation, conversion, edit, refusal, reload, filters, conflict retention, cancel and responsive layout (mock API).");
} finally { await browser.close(); }
