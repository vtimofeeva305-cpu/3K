import { AccessError } from "./access.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (status,message) => { throw new AccessError(status,message); };
export function validatePayment(payload) {
  if (!payload || !["receipt","refund","reversal"].includes(payload.kind)) fail(422,"Выберите тип операции");
  if (!uuid.test(payload.requestId || "")) fail(422,"Не указан идентификатор запроса");
  if (!Number.isSafeInteger(payload.version) || payload.version<1) fail(422,"Обновите версию сделки");
  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  if (note.length>500 || (payload.kind!=="receipt" && !note)) fail(422,"Укажите причину, не более 500 символов");
  const paidOn=payload.paidOn;
  if (typeof paidOn!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || paidOn<"1900-01-01" || !Number.isFinite(Date.parse(paidOn)) || new Date(paidOn).toISOString().slice(0,10)!==paidOn) fail(422,"Некорректная дата платежа");
  if (payload.kind==="reversal") {
    if (!uuid.test(payload.reversesId || "")) fail(422,"Выберите исходную операцию");
    return {kind:payload.kind,paidOn,note,reversesId:payload.reversesId};
  }
  const raw=String(payload.amount ?? "");
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(raw) || Number(raw)<=0) fail(422,"Сумма должна быть положительной, не более двух знаков после запятой");
  if (!["bank","cash","card"].includes(payload.method)) fail(422,"Выберите способ оплаты");
  const [whole,fraction=""] = raw.split(".");
  return {kind:payload.kind,paidOn,note,amount:`${BigInt(whole)}.${fraction.padEnd(2,"0")}`,method:payload.method};
}

export function createPaymentRepository(getSql) {
  return {
    async list(id,offset=0) {
      const sql=await getSql();
      return sql.begin(async tx=>{
        const [deal]=await tx`select version from three_k.deals where id=${id} for share`;
        if(!deal) fail(404,"Сделка не найдена");
        const [summary]=await tx`select d.amount::text as total,coalesce(sum(p.amount),0)::text as paid,
          greatest(d.amount-coalesce(sum(p.amount),0),0)::text as balance,
          greatest(coalesce(sum(p.amount),0)-d.amount,0)::text as overpaid,
          (now() at time zone 'Europe/Moscow')::date::text as today
          from three_k.deals d left join three_k.payments p on p.deal_id=d.id where d.id=${id} group by d.id`;
        const rows=await tx`select p.id,p.kind,p.amount::text,p.paid_on::text as "paidOn",p.method,p.note,
          p.reverses_id as "reversesId",p.created_at as "createdAt",m.display_name as actor,
          exists(select 1 from three_k.payments r where r.reverses_id=p.id) as reversed
          from three_k.payments p join three_k.members m on m.user_id=p.actor_id
          where p.deal_id=${id} order by p.created_at desc,p.id limit 31 offset ${offset}`;
        return {...summary,version:deal.version,items:rows.slice(0,30),hasMore:rows.length>30};
      });
    },
    async append(id,data,requestId,version,member) {
      const sql=await getSql();
      const fingerprint=JSON.stringify(data);
      return sql.begin(async tx=>{
        await tx`select pg_advisory_xact_lock(hashtextextended(${`three_k:payment:${requestId}`},0))`;
        const [deal]=await tx`select * from three_k.deals where id=${id} for update`;
        if(!deal)fail(404,"Сделка не найдена");
        if(!["rop","superadmin"].includes(member.role) && deal.assignee_id!==member.id)fail(403,"Изменять оплаты может ответственный или руководитель");
        const [existing]=await tx`select * from three_k.payments where request_id=${requestId}`;
        if(existing){
          if(existing.actor_id!==member.id || existing.deal_id!==id || existing.request_fingerprint!==fingerprint)fail(409,"Идентификатор запроса уже использован для другой операции");
          return {id:existing.id};
        }
        if(deal.version!==version)fail(409,"Сделка уже изменена. Обновите оплаты перед сохранением.");
        const [date]=await tx`select ${data.paidOn}::date <= (now() at time zone 'Europe/Moscow')::date as valid`;
        if(!date.valid)fail(422,"Дата платежа не может быть в будущем");
        let amount=data.kind==="refund" ? `-${data.amount}` : data.amount;
        let method=data.method;
        if(data.kind==="reversal"){
          const [original]=await tx`select *,(-amount)::text as opposite from three_k.payments where id=${data.reversesId} and deal_id=${id}`;
          if(!original || original.kind==="reversal")fail(422,"Исходная операция не найдена или сама является отменой");
          const [reversed]=await tx`select id from three_k.payments where reverses_id=${original.id}`;
          if(reversed)fail(409,"Операция уже отменена");
          amount=original.opposite;method=original.method;
        }
        const [balance]=await tx`select coalesce(sum(amount),0)+${amount}::numeric>=0 as valid from three_k.payments where deal_id=${id}`;
        if(!balance.valid)fail(422,"Операция превышает учтённую оплату сделки");
        const [saved]=await tx`insert into three_k.payments(deal_id,kind,amount,paid_on,method,note,reverses_id,actor_id,request_id,request_fingerprint)
          values (${id},${data.kind},${amount},${data.paidOn},${method},${data.note},${data.reversesId || null},${member.id},${requestId},${fingerprint}) returning id`;
        await tx`update three_k.deals set version=version+1,updated_at=now() where id=${id}`;
        const action=data.kind==="receipt"?"Оплата зарегистрирована":data.kind==="refund"?"Возврат зарегистрирован":"Платёжная запись отменена";
        await tx`insert into three_k.sales_events(deal_id,actor_id,action) values (${id},${member.id},${action})`;
        return {id:saved.id};
      });
    }
  };
}

export async function paymentRoute(repository,member,method,url,path,payload) {
  const match=path.match(/^\/deals\/(D-[a-z0-9-]{1,64})\/payments$/i);
  if(!match)return undefined;
  if(method==="GET"){
    const offset=Number(url.searchParams.get("offset") || 0);
    if(!Number.isSafeInteger(offset) || offset<0)fail(422,"Некорректная страница");
    return repository.list(match[1],offset);
  }
  if(method!=="POST")fail(405,"Метод не поддерживается");
  return repository.append(match[1],validatePayment(payload),payload.requestId,payload.version,member);
}
