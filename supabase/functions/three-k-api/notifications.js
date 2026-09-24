import { AccessError } from "./access.js";
const fail=(code,message)=>{throw new AccessError(code,message);};
const validId=value=>typeof value==="string" && /^[1-9]\d{0,18}$/.test(value) && BigInt(value)<=9223372036854775807n;
export function createNotificationRepository(getSql){
  return {
    async count(member){
      const sql=await getSql();
      const [row]=await sql`select count(*)::integer as unread from three_k.notifications where recipient_id=${member.id} and read_at is null`;
      return row;
    },
    async list(member,{filter,before}){
      const sql=await getSql();
      const rows=await sql`select id::text,kind,context_id as "contextId",task_id as "taskId",event,title,body,
        read_at as "readAt",created_at as "createdAt" from three_k.notifications n
        where recipient_id=${member.id} and (${filter==="all"} or read_at is null)
          and (${!before} or id<${before || null}::bigint)
        order by n.id desc limit 31`;
      const items=rows.slice(0,30);
      return {items,nextCursor:rows.length>30?items[items.length-1].id:null};
    },
    async mark(member,ids,read){
      const sql=await getSql();
      const rows=await sql`update three_k.notifications set read_at=case when ${read} then coalesce(read_at,now()) else null end
        where recipient_id=${member.id} and id=any(${sql.array(ids)}::bigint[]) returning id::text`;
      return {ids:rows.map(row=>row.id)};
    }
  };
}
export async function notificationRoute(repo,member,method,url,path,payload){
  if(!["/notifications","/notifications/count","/notifications/read"].includes(path))return undefined;
  if(method==="GET" && path==="/notifications/count")return repo.count(member);
  if(method==="GET" && path==="/notifications"){
    const filter=url.searchParams.get("filter") || "all",before=url.searchParams.get("before") || "";
    if(!["all","unread"].includes(filter) || (before && !validId(before)))fail(422,"Некорректный фильтр уведомлений");
    return repo.list(member,{filter,before});
  }
  if(method==="POST" && path==="/notifications/read"){
    if(!Array.isArray(payload?.ids) || !payload.ids.length || payload.ids.length>30 || !payload.ids.every(validId) || typeof payload.read!=="boolean")fail(422,"Некорректный список уведомлений");
    return repo.mark(member,[...new Set(payload.ids)],payload.read);
  }
  fail(405,"Метод не поддерживается");
}
