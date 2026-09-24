import {useEffect,useRef,useState} from "react";
import {Bell,ArrowClockwise,Check,EnvelopeSimple,X} from "@phosphor-icons/react";

export function Notifications({api,open,setOpen,onOpen}){
  const [count,setCount]=useState(null),[countError,setCountError]=useState(false);
  const [filter,setFilter]=useState("all"),[cursors,setCursors]=useState([""]);
  const [data,setData]=useState({items:[],nextCursor:null}),[loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[revision,setRevision]=useState(0);
  const root=useRef(null),button=useRef(null),flight=useRef(false);
  const before=cursors[cursors.length-1];
  useEffect(()=>{
    let active=true,inFlight=false;
    const refresh=async()=>{
      if(inFlight || document.visibilityState==="hidden")return;
      inFlight=true;
      try{const result=await api("/notifications/count");if(active){setCount(result.unread);setCountError(false);}}
      catch{if(active)setCountError(true);}finally{inFlight=false;}
    };
    refresh();const timer=setInterval(refresh,30000);
    window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);
    return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};
  },[api,revision,open]);
  useEffect(()=>{
    if(!open)return;
    let active=true;setLoading(true);setError("");
    api(`/notifications?${new URLSearchParams({filter,before})}`).then(result=>{if(active)setData(result);})
      .catch(failure=>{if(active){setData({items:[],nextCursor:null});setError(failure.message);}}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[api,open,filter,before,revision]);
  useEffect(()=>{
    if(!open)return;
    const outside=event=>{if(root.current && !root.current.contains(event.target))setOpen(false);};
    const escape=event=>{if(event.key==="Escape"){setOpen(false);button.current?.focus();}};
    document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
    return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[open,setOpen]);
  const mark=async(ids,read)=>{
    if(flight.current)return;
    flight.current=true;setBusy(true);setError("");
    try{await api("/notifications/read",{ids,read});setRevision(value=>value+1);}
    catch(failure){setError(failure.message);}
    finally{flight.current=false;setBusy(false);}
  };
  const navigate=record=>{
    if(onOpen(record.kind,record.contextId)===false)return;
    if(!record.readAt)mark([record.id],true);
  };
  return <div className="notification-wrap" ref={root}>
    <button ref={button} className={`icon-button notification-bell ${open?"active":""}`} aria-label="Уведомления" aria-expanded={open} aria-controls="three-k-notifications" title={countError?"Не удалось обновить уведомления":"Уведомления"} onClick={()=>{if(!open)setCursors([""]);setOpen(!open);}}><Bell size={20}/>{countError?<span className="notification-count" aria-label="Ошибка обновления уведомлений">!</span>:count>0 && <span className="notification-count" aria-label={`Непрочитанных: ${count}`}>{count>99?"99+":count}</span>}</button>
    {open && <section className="notifications-panel" id="three-k-notifications" aria-label="Внутренние уведомления">
      <header><h2>Уведомления</h2><button className="icon-button" aria-label="Обновить уведомления" title="Обновить уведомления" disabled={loading || busy} onClick={()=>{setCursors([""]);setRevision(value=>value+1);}}><ArrowClockwise size={18}/></button><button className="icon-button" aria-label="Закрыть уведомления" title="Закрыть уведомления" onClick={()=>{setOpen(false);button.current?.focus();}}><X size={18}/></button></header>
      <div className="tabs">{[["all","Все"],["unread","Непрочитанные"]].map(([value,label])=><button key={value} className={filter===value?"active":""} aria-pressed={filter===value} disabled={busy} onClick={()=>{setFilter(value);setCursors([""]);}}>{label}</button>)}</div>
      {error && <p role="alert">{error}</p>}{loading && <p role="status">Загрузка уведомлений…</p>}
      {!loading && !error && !data.items.length && <p className="empty-state">{filter==="unread"?"Нет непрочитанных уведомлений":"Нет уведомлений"}</p>}
      <div className="notification-list" aria-busy={loading}>{data.items.map(record=><article key={record.id} className={`notification-item ${record.readAt?"":"unread"}`}>
        <button className="notification-link" disabled={loading || busy} onClick={()=>navigate(record)}><strong>{record.title}</strong><span>{record.body}</span><small>{record.contextId} · {new Date(record.createdAt).toLocaleString("ru-RU")}</small></button>
        <button className="icon-button" disabled={loading || busy} aria-label={`${record.readAt?"Отметить непрочитанным":"Отметить прочитанным"} ${record.id}`} title={record.readAt?"Отметить непрочитанным":"Отметить прочитанным"} onClick={()=>mark([record.id],!record.readAt)}>{record.readAt?<EnvelopeSimple size={18}/>:<Check size={18}/>}</button>
      </article>)}</div>
      <footer><button className="ghost-button" disabled={loading || busy || !data.items.some(item=>!item.readAt)} onClick={()=>mark(data.items.filter(item=>!item.readAt).map(item=>item.id),true)}>Прочитать показанные</button><div className="button-row"><button className="ghost-button" disabled={loading || busy || cursors.length===1} onClick={()=>setCursors(previous=>previous.slice(0,-1))}>Назад</button><span>{cursors.length}</span><button className="ghost-button" disabled={loading || busy || !data.nextCursor} onClick={()=>setCursors(previous=>[...previous,data.nextCursor])}>Далее</button></div></footer>
    </section>}
  </div>;
}
