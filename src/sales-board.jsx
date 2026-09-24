import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, X } from "@phosphor-icons/react";
import { isLeader } from "./access.jsx";

export const DEAL_STAGES = ["Квалификация", "Подбор", "Ожидается оплата", "Связаться позже", "Успешно", "Отказ"];
const money = value => new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:2}).format(value || 0);

export function SalesBoard({ api, member, query, status, revision, onOpen, onChanged, canChange, onDirtyChange }) {
  const [columns,setColumns] = useState([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [retry,setRetry] = useState(0);
  const [refusal,setRefusal] = useState(null);
  const [reason,setReason] = useState("");
  const flight = useRef(false), generation = useRef(0), dragged = useRef(null);
  const dirtyCallback = useRef(onDirtyChange);
  dirtyCallback.current = onDirtyChange;
  useEffect(()=>{dirtyCallback.current?.(busy || !!refusal);return()=>dirtyCallback.current?.(false);},[busy,refusal]);
  useEffect(()=>{
    if(!refusal && !busy)return;
    const handler=event=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",handler);
    return()=>window.removeEventListener("beforeunload",handler);
  },[refusal,busy]);
  useEffect(()=>{
    const current=++generation.current;
    setLoading(true);
    api(`/deals/board?${new URLSearchParams({q:query,status})}`).then(data=>{
      if(current===generation.current){setColumns(data.columns);setError("");}
    }).catch(failure=>{if(current===generation.current){setError(failure.message);setColumns([]);}})
      .finally(()=>{if(current===generation.current)setLoading(false);});
    return()=>{generation.current++;};
  },[api,query,status,revision,retry]);
  const allowed = record => isLeader(member) || record.assigneeId===member.id;
  const move = async(record,stage,lossReason="")=>{
    if(flight.current || !allowed(record))return;
    if(!canChange()){setError("Сохраните или отмените изменения открытой карточки.");return;}
    flight.current=true;setBusy(true);setError("");
    try{
      await api(`/deals/${record.id}/stage`,{stage,lossReason,version:record.version});
      setRefusal(null);setReason("");onChanged();
    }catch(failure){setError(failure.message);}
    finally{flight.current=false;setBusy(false);}
  };
  const choose = (record,stage)=>{
    if(stage===record.stage || busy || loading || !allowed(record))return;
    if(!canChange()){setError("Сохраните или отмените изменения открытой карточки.");return;}
    if(stage==="Отказ"){setRefusal(record);setReason("");setError("");}
    else move(record,stage);
  };
  const more = async column=>{
    if(flight.current)return;
    const current=generation.current;
    flight.current=true;setBusy(true);setError("");
    try{
      const data=await api(`/deals?${new URLSearchParams({q:query,status,stage:column.stage,offset:String(column.items.length)})}`);
      if(current===generation.current)setColumns(previous=>previous.map(item=>item.stage===column.stage ? {...item,items:[...item.items,...data.items.filter(record=>!item.items.some(existing=>existing.id===record.id))],hasMore:data.hasMore} : item));
    }catch(failure){if(current===generation.current)setError(failure.message);}
    finally{flight.current=false;setBusy(false);}
  };
  return <section className="deal-board-section" aria-label="Канбан сделок">
    {loading && <p role="status">Загрузка канбана…</p>}
    {error && <p role="alert">{error} <button className="icon-button" title="Обновить канбан" aria-label="Обновить канбан" disabled={busy} onClick={()=>{if(!refusal || window.confirm("Отменить причину отказа и обновить канбан?")){setRefusal(null);setRetry(value=>value+1);}}}><ArrowClockwise size={18}/></button></p>}
    <div className="deal-board" aria-busy={loading || busy}>{columns.map(column=><section className="deal-board-column" key={column.stage} aria-label={column.stage}
      onDragOver={event=>{if(!busy && !loading && DEAL_STAGES.includes(column.stage))event.preventDefault();}}
      onDrop={event=>{event.preventDefault();const record=dragged.current;dragged.current=null;if(record && DEAL_STAGES.includes(column.stage))choose(record,column.stage);}}>
      <header><h2>{column.stage}</h2><span>{column.total}</span><strong>{money(column.amount)}</strong></header>
      {!loading && !column.total && <p className="empty-state">Нет сделок</p>}
      {column.items.map(record=><article className="deal-board-card" key={record.id} draggable={!busy && !loading && allowed(record)} onDragStart={event=>{dragged.current=record;event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",record.id);}} onDragEnd={()=>{dragged.current=null;}}>
        <button className="deal-card-open" disabled={busy || loading || !!refusal} onClick={()=>onOpen(record.id)}><small>{record.id}{record.virtual ? " · Виртуальная" : ""}</small><strong>{record.client}</strong><span>{record.product}</span></button>
        <strong>{money(record.amount)}</strong><small>{record.manager}</small>
        <select aria-label={`Этап ${record.id}`} value={record.stage} disabled={!allowed(record) || busy || loading || !!refusal} onChange={event=>choose(record,event.target.value)}>
          {!DEAL_STAGES.includes(record.stage) && <option>{record.stage}</option>}{DEAL_STAGES.map(stage=><option key={stage}>{stage}</option>)}
        </select>
      </article>)}
      {column.hasMore && <button className="secondary-button" disabled={busy || loading} onClick={()=>more(column)}>Ещё сделки</button>}
    </section>)}</div>
    {refusal && <div className="modal-backdrop"><section className="sales-modal" role="dialog" aria-modal="true" aria-label="Закрытие сделки с отказом">
      <h2>Отказ · {refusal.id}</h2>{error && <p role="alert">{error}</p>}
      <form onSubmit={event=>{event.preventDefault();move(refusal,"Отказ",reason);}}><label className="editable-field"><span>Причина отказа</span><textarea aria-label="Причина отказа в канбане" autoFocus required maxLength={500} value={reason} disabled={busy} onChange={event=>setReason(event.target.value)}/></label>
        <div className="button-row"><button className="primary-button" disabled={busy || !reason.trim()}>Закрыть с отказом</button><button className="secondary-button" type="button" disabled={busy} onClick={()=>{setRefusal(null);setReason("");}}><X size={18}/>Отменить</button></div>
      </form>
    </section></div>}
  </section>;
}

export function ClientSales({ api, clientId, onOpen, disabled }) {
  const [kind,setKind]=useState("deals"),[page,setPage]=useState(0),[revision,setRevision]=useState(0);
  const [data,setData]=useState({items:[],hasMore:false}),[loading,setLoading]=useState(true),[error,setError]=useState("");
  useEffect(()=>{
    let active=true;setLoading(true);
    api(`/${kind}?${new URLSearchParams({clientId,offset:String(page*30)})}`).then(result=>{if(active){setData(result);setError("");}})
      .catch(failure=>{if(active){setError(failure.message);setData({items:[],hasMore:false});}}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[api,clientId,kind,page,revision]);
  return <section className="form-section" aria-label="Связанные продажи"><div className="section-title"><h2>Связанные продажи</h2><button className="icon-button" title="Обновить связанные продажи" aria-label="Обновить связанные продажи" onClick={()=>setRevision(value=>value+1)}><ArrowClockwise size={18}/></button></div>
    <div className="tabs">{[["deals","Сделки клиента"],["leads","Лиды клиента"]].map(([value,label])=><button key={value} aria-pressed={kind===value} className={kind===value?"active":""} onClick={()=>{setKind(value);setPage(0);}}>{label}</button>)}</div>
    {loading && <p role="status">Загрузка связанных продаж…</p>}{error && <p role="alert">{error}</p>}
    {!loading && !error && !data.items.length && <p className="empty-state">Связанных записей пока нет</p>}
    {data.items.map(record=><button className="linked-sale" key={record.id} disabled={disabled || loading} onClick={()=>onOpen(kind,record.id)}><strong>{record.id} · {record.product || record.listing}</strong><span>{record.stage || record.status} · {money(kind==="deals"?record.amount:record.price)}</span><small>{record.manager}</small></button>)}
    <div className="button-row"><button className="ghost-button" disabled={loading || page===0} onClick={()=>setPage(value=>value-1)}>Назад</button><span>{page+1}</span><button className="ghost-button" disabled={loading || !data.hasMore} onClick={()=>setPage(value=>value+1)}>Далее</button></div>
  </section>;
}
