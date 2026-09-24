import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, Check, ClockCounterClockwise, FloppyDisk, PencilSimple, Plus, X } from "@phosphor-icons/react";
import { isLeader } from "./access.jsx";

export function TaskPanel({ api, member, team = [], kind = "", contextId = "", canCreate = true, onDirtyChange, onOpen }) {
  const [filter,setFilter]=useState(kind ? "active" : "today");
  const [scope,setScope]=useState("mine");
  const [page,setPage]=useState(0);
  const [revision,setRevision]=useState(0);
  const [data,setData]=useState({items:[],hasMore:false});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [title,setTitle]=useState("");
  const [date,setDate]=useState("");
  const [assignee,setAssignee]=useState(member?.id || "");
  const [editing,setEditing]=useState(null);
  const [history,setHistory]=useState(null);
  const [events,setEvents]=useState([]);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [historyError,setHistoryError]=useState("");
  const requestId=useRef(crypto.randomUUID());
  const inFlight=useRef(false);
  const dirtyCallback=useRef(onDirtyChange);
  dirtyCallback.current=onDirtyChange;
  useEffect(()=>{dirtyCallback.current?.(!!title || !!date || !!editing || busy);return ()=>dirtyCallback.current?.(false);},[title,date,editing,busy]);
  useEffect(()=>{
    let active=true;
    setLoading(true);
    const params=new URLSearchParams({filter,scope,offset:String(page*30),...(kind ? {kind,contextId} : {})});
    api(`/tasks?${params}`).then(result=>{if(active){setData(result);setError("");}})
      .catch(failure=>{if(active){setError(failure.message);setData({items:[],hasMore:false});}})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[api,kind,contextId,filter,scope,page,revision]);
  useEffect(()=>{
    if(!history)return;
    let active=true;
    setHistoryLoading(true);setHistoryError("");setEvents([]);
    api(`/tasks/${history}/history`).then(result=>{if(active)setEvents(result);})
      .catch(failure=>{if(active)setHistoryError(failure.message);}).finally(()=>{if(active)setHistoryLoading(false);});
    return ()=>{active=false;};
  },[api,history,revision]);
  useEffect(()=>{
    if(!title && !editing)return;
    const prevent=event=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",prevent);
    return ()=>window.removeEventListener("beforeunload",prevent);
  },[title,editing]);
  const mutate=async(path,payload,created=false)=>{
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);setError("");
    try {
      await api(path,payload);
      if(created){setTitle("");setDate("");requestId.current=crypto.randomUUID();}
      setEditing(null);setRevision(value=>value+1);
    } catch(failure){setError(failure.message);}
    finally{inFlight.current=false;setBusy(false);}
  };
  const changeFilter=(setter,value)=>{
    if(editing && !window.confirm("Отменить изменения задачи?"))return;
    setEditing(null);setPage(0);setter(value);
  };
  return <section className="form-section unified-tasks">
    <div className="section-title"><h2>Задачи</h2><button className="icon-button" aria-label="Обновить задачи" title="Обновить задачи" disabled={busy} onClick={()=>setRevision(value=>value+1)}><ArrowClockwise size={18}/></button></div>
    <div className="task-filters"><label>Срок<select aria-label="Фильтр задач" value={filter} disabled={busy} onChange={event=>changeFilter(setFilter,event.target.value)}>
      {[["today","Сегодня"],["overdue","Просроченные"],["upcoming","Предстоящие"],["active","Все активные"],["completed","Выполненные"]].map(([value,label])=><option value={value} key={value}>{label}</option>)}
    </select></label>{!kind && isLeader(member) && <label>Ответственные<select aria-label="Область задач" value={scope} onChange={event=>changeFilter(setScope,event.target.value)}><option value="mine">Мои</option><option value="team">Вся команда</option></select></label>}</div>
    {error && <p role="alert">{error}</p>}{loading && <p role="status">Загрузка задач…</p>}
    {!loading && !error && !data.items.length && <p className="empty-state">Нет задач по выбранному фильтру</p>}
    <div className="task-stack">{data.items.map(task=>{
      const editable=isLeader(member) || task.assigneeId===member?.id;
      return <div className={`unified-task ${task.overdue ? "overdue" : ""}`} key={task.id}>
        {editing?.id===task.id ? <form className="task-edit" onSubmit={event=>{event.preventDefault();mutate(`/tasks/${task.id}`,{title:editing.title,date:editing.date,assigneeId:editing.assigneeId,version:editing.version});}}>
          <label>Название<input aria-label="Название задачи" required maxLength={500} value={editing.title} disabled={busy} onChange={event=>setEditing(value=>({...value,title:event.target.value}))}/></label>
          <label>Срок<input aria-label="Новый срок задачи" type="date" required value={editing.date} disabled={busy} onChange={event=>setEditing(value=>({...value,date:event.target.value}))}/></label>
          {isLeader(member) && <label>Ответственный<select aria-label="Новый ответственный задачи" value={editing.assigneeId} disabled={busy} onChange={event=>setEditing(value=>({...value,assigneeId:event.target.value}))}>{team.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
          <button className="primary-button" disabled={busy}><FloppyDisk size={18}/>Сохранить задачу</button><button className="icon-button" type="button" aria-label="Отменить редактирование задачи" title="Отменить" disabled={busy} onClick={()=>setEditing(null)}><X size={18}/></button>
        </form> : <><div className="task-copy"><strong>{task.title}</strong><small>{task.date.split("-").reverse().join(".")} · {task.assignee}{task.overdue ? " · Просрочена" : ""}</small>{onOpen ? <button className="task-context-link" disabled={busy} onClick={()=>onOpen(task.kind,task.contextId)}>{task.contextId} · {task.label}</button> : <small>{task.contextId} · {task.label}</small>}</div>
          <div className="task-actions"><button className="icon-button" aria-label={`История: ${task.title}`} title="История задачи" disabled={busy} onClick={()=>setHistory(history===task.id?null:task.id)}><ClockCounterClockwise size={18}/></button>
            {editable && <><button className="icon-button" title="Изменить задачу" aria-label={`Изменить: ${task.title}`} disabled={busy || loading} onClick={()=>{if(!editing || window.confirm("Отменить изменения задачи?"))setEditing({...task});}}><PencilSimple size={18}/></button>
              <button className="secondary-button" disabled={busy || loading || !!editing} onClick={()=>mutate(`/tasks/${task.id}`,{completed:!task.completedAt,version:task.version})}><Check size={18}/>{task.completedAt ? "Вернуть" : "Готово"}</button></>}
          </div></>}
        {history===task.id && <div className="task-history">{historyLoading && <p role="status">Загрузка истории…</p>}{historyError && <p role="alert">{historyError}</p>}{!historyLoading && !historyError && !events.length && <p>Нет событий</p>}{events.map(event=><div key={event.id}><strong>{event.action}</strong><small>{event.actor} · {new Date(event.createdAt).toLocaleString("ru-RU")}</small></div>)}</div>}
      </div>;
    })}</div>
    <div className="button-row"><button className="ghost-button" disabled={page===0 || loading || busy || !!editing} onClick={()=>setPage(value=>value-1)}>Назад</button><span>{page+1}</span><button className="ghost-button" disabled={!data.hasMore || loading || busy || !!editing} onClick={()=>setPage(value=>value+1)}>Далее</button></div>
    {kind && canCreate && <form className="task-create" onSubmit={event=>{event.preventDefault();mutate("/tasks",{kind,contextId,title,date,assigneeId:assignee,requestId:requestId.current},true);}}>
      <label>Новая задача<input aria-label="Новая задача" required maxLength={500} value={title} disabled={busy} onChange={event=>setTitle(event.target.value)}/></label>
      <label>Срок<input aria-label="Дата задачи" type="date" required value={date} disabled={busy} onChange={event=>setDate(event.target.value)}/></label>
      {isLeader(member) && <label>Ответственный<select aria-label="Ответственный новой задачи" value={assignee} disabled={busy} onChange={event=>setAssignee(event.target.value)}>{team.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
      <button className="primary-button" disabled={busy}><Plus size={18}/>Поставить задачу</button>
    </form>}
  </section>;
}
