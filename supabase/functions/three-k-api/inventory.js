import {AccessError,isLeader} from "./access.js";
const fail=(status,message)=>{throw new AccessError(status,message);};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text=(value,max=500)=>{if(typeof value!=="string" || value.length>max)fail(422,"Проверьте текстовые поля");return value.trim();};
export function validateInventory(payload){
  const name=text(payload?.name,200),vin=text(payload?.vin || "",17).toUpperCase();
  if(!name)fail(422,"Укажите название техники");
  if(vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin))fail(422,"VIN должен содержать 17 допустимых символов");
  if(!/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(String(payload.price ?? "")))fail(422,"Проверьте стоимость техники");
  return {name,vin,price:String(payload.price),location:text(payload.location || "",200),note:text(payload.note || "",2000)};
}
export function createInventoryRepository(getSql){
  const log=(tx,id,member,action)=>tx`insert into three_k.inventory_events(inventory_id,actor_id,action) values (${id},${member.id},${action})`;
  const translate=error=>{if(error.code==="23505")fail(409,"VIN уже существует или техника/сделка уже связана с резервом");throw error;};
  return {
    async list({q="",status="",offset=0,dealId=""}){
      const sql=await getSql();
      const rows=await sql`select i.*,i.price::text from three_k.inventory i where (${!status} or i.status=${status})
        and (${!dealId} or i.deal_id=${dealId}) and (${!q} or strpos(lower(i.name || ' ' || i.vin || ' ' || i.location),lower(${q}))>0)
        order by i.created_at desc,i.id limit 31 offset ${offset}`;
      return {items:rows.slice(0,30),hasMore:rows.length>30};
    },
    async get(id){
      const sql=await getSql();
      const [item]=await sql`select i.*,i.price::text,d.client as client,d.status as deal_status,d.assignee_id as deal_assignee_id from three_k.inventory i left join three_k.deals d on d.id=i.deal_id where i.id=${id}`;
      if(!item)fail(404,"Техника не найдена");
      item.events=await sql`select e.id,e.action,e.created_at,m.display_name as actor from three_k.inventory_events e join three_k.members m on m.user_id=e.actor_id where e.inventory_id=${id} order by e.created_at desc,e.id limit 100`;
      return item;
    },
    async create(data,requestId,member){
      if(!isLeader(member))fail(403,"Добавлять технику может руководитель");
      const sql=await getSql();
      try{
        const id=await sql.begin(async tx=>{
          await tx`select pg_advisory_xact_lock(hashtextextended(${`three_k:inventory:${requestId}`},0))`;
          const [old]=await tx`select id,created_by from three_k.inventory where request_id=${requestId}`;
          if(old){if(old.created_by!==member.id)fail(409,"Запрос уже использован");return old.id;}
          const [saved]=await tx`insert into three_k.inventory(name,vin,price,location,note,request_id,created_by)
            values (${data.name},${data.vin},${data.price},${data.location},${data.note},${requestId},${member.id}) returning id`;
          await log(tx,saved.id,member,"Добавлена техника");return saved.id;
        });return this.get(id);
      }catch(error){translate(error);}
    },
    async update(id,data,version,member){
      if(!isLeader(member))fail(403,"Изменять склад может руководитель");
      const sql=await getSql();
      try{
        await sql.begin(async tx=>{
          const [old]=await tx`select * from three_k.inventory where id=${id} for update`;
          if(!old)fail(404,"Техника не найдена");
          if(old.version!==version)fail(409,"Карточка техники изменена. Обновите её.");
          if(old.status!=="available")fail(409,"Редактировать можно только свободную технику");
          await tx`update three_k.inventory set name=${data.name},vin=${data.vin},price=${data.price},location=${data.location},note=${data.note},version=version+1,updated_at=now() where id=${id}`;
          await log(tx,id,member,"Карточка обновлена");
        });return this.get(id);
      }catch(error){translate(error);}
    },
    async action(id,action,payload,member){
      const sql=await getSql();
      try{
        await sql.begin(async tx=>{
          const [item]=await tx`select * from three_k.inventory where id=${id} for update`;
          if(!item)fail(404,"Техника не найдена");
          if(item.version!==payload.version)fail(409,"Карточка техники изменена. Обновите её.");
          let target,targetDealId=item.deal_id;
          if(action==="archive" || action==="restore"){
            if(!isLeader(member))fail(403,"Архивом управляет руководитель");
            if(item.status!==(action==="archive"?"available":"archived"))fail(409,"Операция недоступна в этом статусе");
            target=action==="archive"?"archived":"available";
          }else{
            if(item.status!==(action==="reserve"?"available":"reserved"))fail(409,"Техника уже занята или резерв отсутствует");
            const dealId=action==="reserve"?payload.dealId:item.deal_id;
            if(typeof dealId!=="string" || !/^D-[a-z0-9-]{1,64}$/i.test(dealId))fail(422,"Выберите сделку");
            const [deal]=await tx`select * from three_k.deals where id=${dealId} for update`;
            if(!deal)fail(404,"Сделка не найдена");
            if(!isLeader(member) && deal.assignee_id!==member.id)fail(403,"Резервом управляет ответственный за сделку или руководитель");
            if(action==="reserve" && deal.status!=="open")fail(409,"Резерв доступен только для открытой сделки");
            if(action==="deliver" && deal.stage!=="Успешно")fail(409,"Сначала успешно закройте сделку");
            target=action==="reserve"?"reserved":action==="deliver"?"sold":"available";
            targetDealId=action==="release"?null:dealId;
            await tx`insert into three_k.sales_events(deal_id,actor_id,action) values (${dealId},${member.id},${`${action==="reserve"?"Резерв":action==="release"?"Резерв снят":"Техника выдана"}: ${item.name}`})`;
          }
          await tx`update three_k.inventory set status=${target},deal_id=${targetDealId},version=version+1,updated_at=now() where id=${id}`;
          await log(tx,id,member,{reserve:"Зарезервировано",release:"Резерв снят",deliver:"Выдано",archive:"В архиве",restore:"Возвращено на склад"}[action]);
        });return this.get(id);
      }catch(error){translate(error);}
    }
  };
}
export async function inventoryRoute(repo,member,method,url,path,payload){
  const match=path.match(/^\/inventory(?:\/([0-9a-f-]{36})(?:\/(reserve|release|deliver|archive|restore))?)?$/i);
  if(!match)return undefined;
  const [,id,action]=match;
  if(id && !uuid.test(id))fail(422,"Некорректный идентификатор техники");
  if(method==="GET" && !action){
    if(id)return repo.get(id);
    const offset=Number(url.searchParams.get("offset") || 0),status=url.searchParams.get("status") || "";
    if(!Number.isSafeInteger(offset) || offset<0 || !["","available","reserved","sold","archived"].includes(status))fail(422,"Некорректный фильтр");
    return repo.list({offset,status,q:(url.searchParams.get("q") || "").trim().slice(0,200),dealId:url.searchParams.get("dealId") || ""});
  }
  if(method!=="POST")fail(405,"Метод не поддерживается");
  if(!id){if(!uuid.test(payload?.requestId || ""))fail(422,"Идентификатор запроса обязателен");return repo.create(validateInventory(payload),payload.requestId,member);}
  if(!Number.isSafeInteger(payload?.version) || payload.version<1)fail(422,"Версия обязательна");
  return action?repo.action(id,action,payload,member):repo.update(id,validateInventory(payload),payload.version,member);
}
