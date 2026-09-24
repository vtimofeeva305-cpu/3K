import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, Plus, ArrowCounterClockwise, FloppyDisk } from "@phosphor-icons/react";

const money=value=>new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",minimumFractionDigits:2}).format(value || 0);
const kinds={receipt:"Поступление",refund:"Возврат",reversal:"Отмена записи"};
const methods={bank:"Перевод",cash:"Наличные",card:"Карта"};

export function Payments({api,dealId,canEdit,disabled,onDirtyChange,onSaved}) {
  const [data,setData]=useState(null),[page,setPage]=useState(0),[revision,setRevision]=useState(0);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [draft,setDraft]=useState(null);
  const flight=useRef(false),dirtyCallback=useRef(onDirtyChange);
  dirtyCallback.current=onDirtyChange;
  useEffect(()=>{dirtyCallback.current?.(!!draft || busy);return()=>dirtyCallback.current?.(false);},[draft,busy]);
  useEffect(()=>{
    if(!draft && !busy)return;
    const handler=event=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",handler);return()=>window.removeEventListener("beforeunload",handler);
  },[draft,busy]);
  useEffect(()=>{
    let active=true;setLoading(true);
    api(`/deals/${dealId}/payments?offset=${page*30}`).then(result=>{
      if(active){setData(result);setDraft(previous=>previous?{...previous,version:result.version}:null);setError("");}
    }).catch(failure=>{if(active){setData(null);setError(failure.message);}}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[api,dealId,page,revision]);
  const start=(kind,record)=>{
    if(disabled || busy || loading || !data)return;
    setError("");setDraft({kind,amount:"",method:"bank",paidOn:data.today,note:"",reversesId:record?.id,version:data.version,requestId:crypto.randomUUID()});
  };
  const save=async event=>{
    event.preventDefault();if(flight.current || disabled || !data)return;
    flight.current=true;setBusy(true);setError("");
    try{await api(`/deals/${dealId}/payments`,draft);setDraft(null);onSaved();}
    catch(failure){setError(failure.message);}
    finally{flight.current=false;setBusy(false);}
  };
  const update=(key,value)=>setDraft(previous=>({...previous,[key]:value}));
  return <section className="form-section payment-panel" aria-label="Платежи сделки">
    <div className="section-title"><h2>Платежи</h2><button className="icon-button" aria-label="Обновить платежи" title="Обновить платежи" disabled={busy || loading} onClick={()=>setRevision(value=>value+1)}><ArrowClockwise size={18}/></button></div>
    {loading && <p role="status">Загрузка платежей…</p>}{error && <p role="alert">{error}</p>}
    {data && <>
      <dl className="payment-totals"><div><dt>Сумма сделки</dt><dd>{money(data.total)}</dd></div><div><dt>Оплачено</dt><dd>{money(data.paid)}</dd></div><div><dt>Остаток</dt><dd>{money(data.balance)}</dd></div>{Number(data.overpaid)>0 && <div><dt>Переплата</dt><dd>{money(data.overpaid)}</dd></div>}</dl>
      {canEdit && !draft && <div className="button-row"><button className="secondary-button" disabled={disabled || loading} onClick={()=>start("receipt")}><Plus size={18}/>Добавить оплату</button><button className="ghost-button" disabled={disabled || loading || Number(data.paid)<=0} onClick={()=>start("refund")}>Возврат</button></div>}
    </>}
    {draft && <form onSubmit={save} aria-label="Новая платёжная запись"><h3>{kinds[draft.kind]}</h3><fieldset className="client-fields" disabled={busy || disabled || loading || !data}><div className="form-grid">
      {draft.kind!=="reversal" && <><label className="editable-field"><span>Сумма платежа</span><input aria-label="Сумма платежа" type="number" min="0.01" step="0.01" max="999999999999.99" required value={draft.amount} onChange={event=>update("amount",event.target.value)}/></label><label className="editable-field"><span>Способ оплаты</span><select aria-label="Способ оплаты" value={draft.method} onChange={event=>update("method",event.target.value)}>{Object.entries(methods).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></>}
      <label className="editable-field"><span>Дата платежа</span><input aria-label="Дата платежа" type="date" required min="1900-01-01" max={data?.today} value={draft.paidOn} onChange={event=>update("paidOn",event.target.value)}/></label>
      <label className="editable-field wide"><span>{draft.kind==="receipt"?"Комментарий к платежу":"Причина операции"}</span><textarea aria-label="Комментарий к платежу" required={draft.kind!=="receipt"} maxLength={500} value={draft.note} onChange={event=>update("note",event.target.value)}/></label>
    </div></fieldset><div className="button-row"><button className="primary-button" disabled={busy || disabled || loading || !data}><FloppyDisk size={18}/>{busy?"Сохранение…":"Записать платёж"}</button><button className="ghost-button" type="button" disabled={busy} onClick={()=>{setDraft(null);setError("");}}>Отменить ввод платежа</button></div></form>}
    {data && <><div aria-busy={loading}>{!data.items.length && !loading && <p className="empty-state">Платежей пока нет</p>}{data.items.map(record=><article className="payment-row" key={record.id}>
      <div><strong>{kinds[record.kind]} · {money(record.amount)}</strong><span>{record.paidOn.split("-").reverse().join(".")} · {methods[record.method]}{record.reversed?" · Отменено":""}</span>{record.note && <p>{record.note}</p>}<small>{record.actor} · {new Date(record.createdAt).toLocaleString("ru-RU")}</small>{record.reversesId && <small>Исходная запись: {record.reversesId}</small>}</div>
      {canEdit && record.kind!=="reversal" && !record.reversed && <button className="icon-button" title="Отменить платёжную запись" aria-label={`Отменить платёжную запись ${record.id}`} disabled={disabled || busy || loading || !!draft} onClick={()=>start("reversal",record)}><ArrowCounterClockwise size={18}/></button>}
    </article>)}</div><div className="button-row"><button className="ghost-button" disabled={loading || busy || !!draft || page===0} onClick={()=>setPage(value=>value-1)}>Назад</button><span>{page+1}</span><button className="ghost-button" disabled={loading || busy || !!draft || !data.hasMore} onClick={()=>setPage(value=>value+1)}>Далее</button></div></>}
  </section>;
}
