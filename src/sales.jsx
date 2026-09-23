import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, FloppyDisk, Plus, X, ArrowRight } from "@phosphor-icons/react";
import { isLeader } from "./access.jsx";

const stages = ["Квалификация", "Подбор", "Ожидается оплата", "Связаться позже", "Успешно", "Отказ"];
const rub = value => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(value || 0);
const fresh = kind => kind === "leads"
  ? { client: "", phone: "", city: "", listing: "", message: "", price: 0, requestId: crypto.randomUUID() }
  : { clientId: "", product: "", amount: 0, virtual: false, vin: "", stage: "Квалификация", closeDate: "", lossReason: "", requestId: crypto.randomUUID() };
function editable(record, kind) {
  const keys = kind === "leads" ? ["client", "phone", "city", "listing", "message", "price"] : ["clientId", "product", "amount", "virtual", "vin", "stage", "closeDate", "lossReason"];
  return Object.fromEntries([...keys, "version"].map(key => [key, record[key] ?? ""]));
}

export function SalesWorkspace({ api, member, team, kind, query = "", onDirtyChange, notify, intake = false }) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [data, setData] = useState({ items: [], hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState(intake ? "new" : null);
  const [cardKind, setCardKind] = useState(kind);
  const dirty = useRef(false);
  useEffect(() => { setPage(0); }, [query, status]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      api(`/${kind}?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&offset=${page * 30}`).then(result => {
        if (active) { setData(result); setError(""); }
      }).catch(failure => { if (active) { setError(failure.message); setData({ items: [], hasMore: false }); } })
        .finally(() => { if (active) setLoading(false); });
    }, 150);
    return () => { active = false; clearTimeout(timer); };
  }, [api, kind, query, status, page, revision]);
  const select = id => {
    if (dirty.current && !window.confirm("Отменить несохранённые изменения?")) return;
    setCardKind(kind); setSelected(id);
  };
  return <section className="screen sales-screen">
    <div className="page-heading"><div><div className="eyebrow">Продажи</div><h1>{kind === "leads" ? "Лиды" : "Сделки"}</h1></div>
      <div className="button-row"><button className="icon-button" aria-label="Обновить список" title="Обновить список" onClick={() => setRevision(value => value + 1)}><ArrowClockwise size={18} /></button>
        <button className="primary-button" onClick={() => select("new")}><Plus size={18} />{kind === "leads" ? "Новый лид" : "Новая сделка"}</button></div></div>
    <label className="sales-filter">Статус <select aria-label="Статус списка" value={status} onChange={event => setStatus(event.target.value)}>
      <option value="">Все</option>{(kind === "leads" ? [["Новый","Новые"],["В работе","В работе"],["Сделка создана","Создана сделка"]] : [["open","Открытые"],["closed","Закрытые"]]).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    {error && <p role="alert">{error}</p>}{loading && <p role="status">Загрузка…</p>}
    <div className="sales-layout"><div className="sales-register">
      {!loading && !error && !data.items.length && <p className="empty-state">Записей пока нет</p>}
      {data.items.map(record => <button className={`sales-row ${record.id === selected ? "active" : ""}`} key={record.id} disabled={loading} onClick={() => select(record.id)}>
        <span className="sales-row-id">{record.id} · {record.status === "closed" ? "Закрыта" : record.stage || record.status}</span>
        <strong>{record.client}</strong><span>{record.listing || record.product}</span>
        <span>{rub(kind === "leads" ? record.price : record.amount)}</span><small>{record.source} · {record.manager}</small>
      </button>)}
      <div className="button-row"><button className="ghost-button" disabled={page === 0 || loading} onClick={() => setPage(value => value - 1)}>Назад</button><span>{page + 1}</span><button className="ghost-button" disabled={!data.hasMore || loading} onClick={() => setPage(value => value + 1)}>Далее</button></div>
    </div><div className="sales-detail">
      {selected ? <SalesEditor key={`${cardKind}:${selected}`} api={api} member={member} team={team} kind={cardKind} id={selected} intake={intake}
        onDirtyChange={value => { dirty.current = value; onDirtyChange?.(value); }}
        onSaved={record => { setSelected(record.id); setRevision(value => value + 1); notify("Сохранено"); }}
        onConverted={record => { setCardKind("deals"); setSelected(record.id); setRevision(value => value + 1); notify(`Создана сделка ${record.id}`); }} /> : <p className="empty-state">Выберите {kind === "leads" ? "лид" : "сделку"}</p>}
    </div></div>
  </section>;
}

export function NewSalesDeal({ api, member, team, onClose, notify }) {
  const [dirty, setDirty] = useState(false);
  return <div className="modal-backdrop"><section className="sales-modal" role="dialog" aria-modal="true" aria-label="Новая сделка">
    <button className="icon-button sales-close" title="Закрыть" aria-label="Закрыть" onClick={() => { if (!dirty || window.confirm("Отменить несохранённые изменения?")) onClose(); }}><X size={20} /></button>
    <SalesEditor api={api} member={member} team={team} kind="deals" id="new" onDirtyChange={setDirty} onSaved={record => { notify(`Сделка ${record.id} сохранена`); onClose(); }} />
  </section></div>;
}

function SalesEditor({ api, member, team, kind, id, intake, onSaved, onConverted, onDirtyChange }) {
  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState(() => id === "new" ? fresh(kind) : null);
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(id !== "new");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [target, setTarget] = useState("");
  const inFlight = useRef(false);
  const dirty = !!draft && (id === "new" ? Object.entries(draft).some(([key,value]) => !["requestId","stage","virtual","amount","price"].includes(key) && !!value) : JSON.stringify(draft) !== JSON.stringify(original));
  const dirtyCallback = useRef(onDirtyChange);
  dirtyCallback.current = onDirtyChange;
  useEffect(() => { dirtyCallback.current?.(dirty || busy); return () => dirtyCallback.current?.(false); }, [dirty,busy]);
  useEffect(() => {
    if (!dirty) return;
    const handler = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  useEffect(() => {
    if (id === "new") return;
    let active = true;
    setLoading(true);
    api(`/${kind}/${id}`).then(result => { if (active) { setRecord(result); setDraft(editable(result,kind)); setOriginal(editable(result,kind)); setError(""); } })
      .catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api,kind,id,revision]);
  const update = (key,value) => setDraft(previous => ({ ...previous,[key]:value }));
  const run = async (path,payload,convert = false) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const result = await api(path,payload);
      if (convert) onConverted?.(result);
      else { setRecord(result); setDraft(editable(result,kind)); setOriginal(editable(result,kind)); onSaved(result); }
    } catch (failure) { setError(failure.message); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const canEdit = id === "new" || isLeader(member) || record?.assigneeId === member.id;
  const refresh = () => { if (!dirty || window.confirm("Загрузить сохранённую версию и отменить изменения?")) setRevision(value => value + 1); };
  return <>
    <div className="client-card-head"><h2>{id === "new" ? kind === "leads" ? "Новый лид" : "Новая сделка" : id}</h2>{id !== "new" && <button className="icon-button" title="Обновить карточку" aria-label="Обновить карточку" disabled={busy} onClick={refresh}><ArrowClockwise size={18} /></button>}</div>
    {error && <p role="alert">{error}</p>}{loading && <p role="status">Загрузка карточки…</p>}
    {draft && !loading && <>
      {record && <p className="sales-meta">{record.source} · {record.manager}<br />{new Date(record.createdAt).toLocaleString("ru-RU")} · {record.stage || record.status}</p>}
      {record && record.status !== "closed" && record.status !== "Сделка создана" && <div className="sales-assignment">
        {(!record.assigneeId || canEdit) && <button className="secondary-button" disabled={busy || dirty} onClick={() => run(`/${kind}/${id}/take`,{version:record.version})}>Взять в работу</button>}
        {isLeader(member) && <><select aria-label="Ответственный" value={target} disabled={busy} onChange={event => setTarget(event.target.value)}><option value="">Выберите ответственного</option>{team.filter(person => person.working).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select><button className="secondary-button" disabled={!target || busy || dirty} onClick={() => run(`/${kind}/${id}/take`,{version:record.version,memberId:target})}>Назначить</button></>}
      </div>}
      <form onSubmit={event => { event.preventDefault(); run(id === "new" ? intake ? "/intake/landing" : `/${kind}` : `/${kind}/${id}`,draft); }}>
        <fieldset className="client-fields" disabled={busy || !canEdit || (kind === "leads" && id !== "new")}><div className="form-grid">
          {kind === "deals" ? <>
            <ClientSelect api={api} value={draft.clientId} label={record?.client} disabled={!!record?.clientId} onChange={value => update("clientId",value)} />
            <Field label="Техника" value={draft.product} onChange={value => update("product",value)} required />
            <Field label="Сумма сделки" type="number" value={draft.amount} onChange={value => update("amount",value)} required />
            <Field label="VIN" value={draft.vin} onChange={value => update("vin",value)} />
            <Field label="Плановое закрытие" type="date" value={draft.closeDate} onChange={value => update("closeDate",value)} />
            <label className="editable-field"><span>Этап</span><select aria-label="Этап" value={draft.stage} onChange={event => update("stage",event.target.value)}>{stages.map(stage => <option key={stage}>{stage}</option>)}</select></label>
            <label className="sales-checkbox"><input type="checkbox" checked={draft.virtual} onChange={event => update("virtual",event.target.checked)} />Виртуальная сделка</label>
            {draft.stage === "Отказ" && <Field label="Причина отказа" value={draft.lossReason} onChange={value => update("lossReason",value)} required />}
          </> : <>{[["client","Клиент"],["phone","Телефон"],["listing","Интересующая техника"],["city","Город"],["price","Бюджет"],["message","Обращение"]].map(([key,label]) => <Field key={key} label={label} value={draft[key]} type={key === "price" ? "number" : key === "phone" ? "tel" : "text"} required={["client","phone","listing"].includes(key)} onChange={value => update(key,value)} />)}</>}
        </div></fieldset>
        {(id === "new" || kind === "deals") && canEdit && <div className="button-row"><button className="primary-button" disabled={busy || (id !== "new" && !dirty)}><FloppyDisk size={18} />{busy ? "Сохранение…" : "Сохранить"}</button>{id !== "new" && <button className="ghost-button" type="button" disabled={busy || !dirty} onClick={() => { setDraft(original); setError(""); }}>Отменить</button>}</div>}
      </form>
      {kind === "leads" && record && canEdit && <button className="primary-button" disabled={busy} onClick={() => run(`/leads/${id}/convert`,{version:record.version},true)}><ArrowRight size={18} />{record.dealId ? `Открыть ${record.dealId}` : "Создать сделку"}</button>}
      {record?.events?.length > 0 && <section className="form-section"><h3>История</h3>{record.events.map(event => <div className="sales-event" key={event.id}><strong>{event.action}</strong><small>{event.actor} · {new Date(event.createdAt).toLocaleString("ru-RU")}</small></div>)}</section>}
    </>}
  </>;
}
function Field({ label,value,onChange,type = "text",required = false }) {
  return <label className="editable-field"><span>{label}</span><input type={type} value={value ?? ""} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} required={required} maxLength={500} onChange={event => onChange(event.target.value)} /></label>;
}
function ClientSelect({ api,value,label,disabled,onChange }) {
  const [query,setQuery] = useState("");
  const [clients,setClients] = useState([]);
  const [error,setError] = useState("");
  useEffect(() => {
    if (disabled) return;
    let active = true;
    const timer = setTimeout(() => api(`/clients?q=${encodeURIComponent(query)}&limit=30`).then(result => { if (active) { setClients(result.items); setError(""); } }).catch(failure => { if (active) setError(failure.message); }),150);
    return () => { active = false; clearTimeout(timer); };
  },[api,query,disabled]);
  return <label className="editable-field wide"><span>Клиент из справочника</span>
    {!disabled && <input aria-label="Найти клиента для сделки" placeholder="Имя или телефон" value={query} onChange={event => { setQuery(event.target.value); onChange(""); }} />}
    <select aria-label="Клиент из справочника" required disabled={disabled} value={value} onChange={event => onChange(event.target.value)}><option value="">Выберите клиента</option>{value && !clients.some(client => client.id === value) && <option value={value}>{label || value}</option>}{clients.map(client => <option key={client.id} value={client.id}>{client.displayName} · {client.phone}</option>)}</select>
    {error && <span role="alert">{error}</span>}
  </label>;
}
