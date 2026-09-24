import assert from "node:assert/strict";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser=await chromium.launch({headless:true});
const member={id:"00000000-0000-4000-8000-000000000001",name:"Manager",role:"manager",working:true};
const deal={id:"D-1",clientId:"C-1",client:"Покупатель",product:"Модель уточняется",amount:1000,version:1,stage:"Квалификация",status:"open",virtual:true,vin:"",closeDate:"",lossReason:"",source:"Телефон",manager:member.name,assigneeId:member.id,createdAt:new Date().toISOString(),events:[]};
const entries=[],requests=new Map(),errors=[];
let conflict=false,lostResponse=false;
try{
  const context=await browser.newContext();
  await context.addInitScript(()=>localStorage.setItem("three-k-auth-session",JSON.stringify({accessToken:"test",expiresAt:Date.now()+3600000})));
  const page=await context.newPage();page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/auth/v1/user",route=>route.fulfill({json:{id:member.id,user_metadata:{name:member.name}}}));
  await page.route("**/functions/v1/three-k-api/**",async route=>{
    const url=new URL(route.request().url()),path=url.pathname.split("three-k-api")[1];
    const payload=route.request().method()==="POST"?route.request().postDataJSON():null;
    let data;
    if(path==="/me")data={member};
    else if(path==="/team")data=[member];
    else if(path==="/assignment-rules")data={};
    else if(path==="/notifications/count")data={unread:0};
    else if(path==="/inventory")data={items:[],hasMore:false};
    else if(path==="/sales/summary")data={leads:0,deals:1,clients:1};
    else if(path==="/tasks")data={items:[],hasMore:false};
    else if(path==="/deals")data={items:[deal],hasMore:false};
    else if(path==="/deals/D-1")data=deal;
    else if(path==="/deals/D-1/payments" && payload){
      if(conflict)return route.fulfill({status:409,json:{message:"Сделка уже изменена. Обновите оплаты перед сохранением."}});
      if(requests.has(payload.requestId))data={id:requests.get(payload.requestId)};
      else{
        const original=entries.find(row=>row.id===payload.reversesId);
        const cents=payload.kind==="reversal"?-original.cents:Math.round(Number(payload.amount)*100)*(payload.kind==="refund"?-1:1);
        const id=crypto.randomUUID();
        entries.unshift({id,kind:payload.kind,cents,amount:(cents/100).toFixed(2),paidOn:payload.paidOn,method:original?.method || payload.method,note:payload.note,actor:member.name,createdAt:new Date().toISOString(),reversesId:payload.reversesId,reversed:false});
        if(original)original.reversed=true;
        requests.set(payload.requestId,id);deal.version++;data={id};
      }
      if(lostResponse){lostResponse=false;return route.abort("failed");}
    }else if(path==="/deals/D-1/payments"){
      const paid=entries.reduce((sum,row)=>sum+row.cents,0)/100;
      data={total:"1000.00",paid:paid.toFixed(2),balance:Math.max(0,1000-paid).toFixed(2),overpaid:Math.max(0,paid-1000).toFixed(2),today:"2026-09-24",version:deal.version,items:entries,hasMore:false};
    }else return route.fulfill({status:404,json:{message:`Unknown route ${path}`}});
    return route.fulfill({json:{data}});
  });
  const open=async()=>{
    await page.getByRole("button",{name:"Сделки",exact:true}).click();
    await page.locator('.sales-row').first().click();
    await page.getByRole("button",{name:"Добавить оплату",exact:true}).waitFor();
  };
  const panel=page.getByRole("region",{name:"Платежи сделки"});
  const paid=()=>panel.locator('.payment-totals div').filter({has:page.getByText("Оплачено",{exact:true})}).locator('dd');
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:5177");await open();
  await page.getByLabel("Техника",{exact:true}).fill("Несохранённая модель");
  assert.equal(await page.getByRole("button",{name:"Добавить оплату",exact:true}).isDisabled(),true);
  await page.getByRole("button",{name:"Отменить",exact:true}).click();
  await page.getByRole("button",{name:"Добавить оплату",exact:true}).click();
  await page.getByLabel("Сумма платежа",{exact:true}).fill("100.25");
  page.once("dialog",dialog=>dialog.dismiss());
  await page.getByRole("button",{name:"Лиды",exact:true}).click();
  assert.equal(await page.getByLabel("Сумма платежа",{exact:true}).inputValue(),"100.25");
  lostResponse=true;
  await page.getByRole("button",{name:"Записать платёж",exact:true}).click();
  await panel.getByRole("alert").waitFor();
  assert.equal(entries.length,1);
  await page.getByRole("button",{name:"Записать платёж",exact:true}).click();
  await page.getByRole("button",{name:"Добавить оплату",exact:true}).waitFor();
  assert.equal(entries.length,1);assert.match(await paid().textContent(),/100,25/);
  await page.getByRole("button",{name:"Возврат",exact:true}).click();
  await page.getByLabel("Сумма платежа",{exact:true}).fill("25");
  await page.getByLabel("Комментарий к платежу",{exact:true}).fill("Частичный возврат");
  conflict=true;
  await page.getByRole("button",{name:"Записать платёж",exact:true}).click();
  await panel.getByRole("alert").filter({hasText:"уже изменена"}).waitFor();
  assert.equal(await page.getByLabel("Сумма платежа",{exact:true}).inputValue(),"25");
  conflict=false;
  await page.getByRole("button",{name:"Обновить платежи",exact:true}).click();
  await page.getByRole("button",{name:"Записать платёж",exact:true}).click();
  await page.getByRole("button",{name:"Добавить оплату",exact:true}).waitFor();
  assert.match(await paid().textContent(),/75,25/);
  await page.getByRole("button",{name:`Отменить платёжную запись ${entries[0].id}`,exact:true}).click();
  await page.getByLabel("Комментарий к платежу",{exact:true}).fill("Возврат внесён ошибочно");
  await page.getByRole("button",{name:"Записать платёж",exact:true}).click();
  await page.getByRole("button",{name:"Добавить оплату",exact:true}).waitFor();
  assert.match(await paid().textContent(),/100,25/);assert.equal(entries.length,3);
  await page.reload();await open();assert.match(await paid().textContent(),/100,25/);
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});await panel.scrollIntoViewIfNeeded();
    await page.screenshot({path:`/tmp/three-k-payments-${width}.png`,fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow at ${width}`);
  }
  deal.assigneeId="other";await page.reload();
  await page.getByRole("button",{name:"Сделки",exact:true}).click();await page.locator('.sales-row').first().click();
  await paid().waitFor();assert.equal(await page.getByRole("button",{name:"Добавить оплату",exact:true}).count(),0);
  assert.deepEqual(errors,[]);
  console.log("Payments browser passed: prepayment, lost-response retry, refund, correction, stale-version draft, dirty navigation, reload, readonly permissions and desktop/mobile (mock API).");
}finally{await browser.close();}
