import { useEffect, useRef, useState } from "react";
import { MagnifyingGlass, Plus, ArrowClockwise, FloppyDisk, X } from "@phosphor-icons/react";

const fields = [["name", "Название / ФИО"], ["inn", "ИНН"], ["phone", "Номер телефона"],
  ["email", "Почта"], ["address", "Адрес"], ["passport", "Паспортные данные"],
  ["legalAddress", "Юридический адрес"], ["kpp", "КПП"], ["bik", "БИК"],
  ["bank", "Банк"], ["account", "Расчётный счёт"], ["director", "Руководитель"]];
const emptyClient = () => ({ form: "Физлицо", ...Object.fromEntries(fields.map(([key]) => [key, ""])), requestId: crypto.randomUUID() });

export function ClientDirectory({ api, notify, onDirtyChange }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [records, setRecords] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState("");
  const [cardRevision, setCardRevision] = useState(0);
  const saving = useRef(false);
  const dirty = draft && JSON.stringify(draft) !== JSON.stringify(original);
  useEffect(() => { onDirtyChange?.(Boolean(dirty || busy)); return () => onDirtyChange?.(false); }, [dirty, busy, onDirtyChange]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await api(`/clients?q=${encodeURIComponent(query)}&offset=${page * 30}&limit=30`);
        if (active) { setRecords(data.items); setHasMore(data.hasMore); setError(""); }
      } catch (failure) { if (active) { setError(failure.message); setRecords([]); } }
      finally { if (active) setLoading(false); }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [api, query, page, revision]);

  useEffect(() => {
    if (!selected || selected === "new") return;
    let active = true;
    setCardLoading(true); setCardError(""); setDraft(null); setOriginal(null);
    api(`/clients/${selected}`).then(data => {
      if (active) { setDraft(data); setOriginal(data); }
    }).catch(failure => { if (active) setCardError(failure.message); })
      .finally(() => { if (active) setCardLoading(false); });
    return () => { active = false; };
  }, [api, selected, cardRevision]);

  useEffect(() => {
    if (!dirty) return;
    const prevent = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  const select = id => {
    if (saving.current || (dirty && !window.confirm("Отменить несохранённые изменения?"))) return;
    setCardError(""); setSelected(id);
    if (id === "new") { const data = emptyClient(); setDraft(data); setOriginal(data); setCardLoading(false); }
  };
  const save = async event => {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true; setBusy(true); setCardError("");
    try {
      const saved = await api(selected === "new" ? "/clients" : `/clients/${selected}`, draft);
      setDraft(saved); setOriginal(saved); setSelected(saved.id);
      setRevision(value => value + 1);
      notify("Клиент сохранён");
    } catch (failure) { setCardError(failure.message); }
    finally { saving.current = false; setBusy(false); }
  };

  return <section className="screen screen-clients">
    <div className="page-heading"><div><div className="eyebrow">Единая база</div><h1>Клиенты</h1></div>
      <button className="primary-button" disabled={busy} onClick={() => select("new")}><Plus size={18} />Новый клиент</button>
    </div>
    <div className="client-layout">
      <aside className="client-directory">
        <label className="directory-search"><MagnifyingGlass size={17} /><input aria-label="Поиск клиента по телефону, ИНН или названию" placeholder="Телефон, ИНН или название" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} /></label>
        <div className="alphabet-label">А–Я</div>
        {loading && <p role="status">Загрузка клиентов…</p>}
        {error && <p role="alert">{error} <button className="icon-button" title="Повторить загрузку" aria-label="Повторить загрузку" onClick={() => setRevision(value => value + 1)}><ArrowClockwise size={18} /></button></p>}
        {!loading && !error && !records.length && <p className="empty-state">{query ? "Клиенты не найдены" : "Клиентов пока нет"}</p>}
        <div className="client-list" aria-busy={loading}>{records.map(client => <button type="button" disabled={busy || loading} key={client.id} className={`client-list-item ${selected === client.id ? "active" : ""}`} onClick={() => select(client.id)}>
          <span>{client.form}</span><strong>{client.displayName}</strong><small>ИНН {client.inn || "—"}</small><small>{client.phone}</small>
        </button>)}</div>
        <div className="button-row"><button className="ghost-button" disabled={loading || page === 0} onClick={() => setPage(value => value - 1)}>Назад</button>
          <span>{page + 1}</span><button className="ghost-button" disabled={loading || !hasMore} onClick={() => setPage(value => value + 1)}>Далее</button></div>
      </aside>
      <section className="client-card">
        {cardLoading && <p role="status">Загрузка карточки…</p>}
        {cardError && <div role="alert"><p>{cardError}</p>{selected !== "new" && <button className="secondary-button" disabled={busy} onClick={() => {
          if (!dirty || window.confirm("Загрузить сохранённую версию? Несохранённые изменения будут отменены.")) setCardRevision(value => value + 1);
        }}><ArrowClockwise size={18} />Обновить карточку</button>}</div>}
        {!selected && <p className="empty-state">Выберите клиента</p>}
        {draft && !cardLoading && <form onSubmit={save}>
          <div className="client-card-head"><div><div className="eyebrow">{draft.id || "Новый клиент"}</div><h2>{original?.displayName || "Новый клиент"}</h2></div>
            <button className="primary-button" disabled={busy || (selected !== "new" && !dirty)}><FloppyDisk size={18} />{busy ? "Сохранение…" : "Сохранить"}</button>
            <button className="icon-button" type="button" title="Отменить изменения" aria-label="Отменить изменения" disabled={busy || !dirty} onClick={() => { setDraft(original); setCardError(""); }}><X size={18} /></button>
          </div>
          <fieldset disabled={busy} className="client-fields"><div className="form-grid">
            <label className="editable-field"><span>ОПФ</span><select value={draft.form} onChange={event => setDraft(value => ({ ...value, form: event.target.value }))}>{["Физлицо", "ИП", "ООО"].map(form => <option key={form}>{form}</option>)}</select></label>
            {fields.map(([key, label]) => <label className={`editable-field ${["address", "legalAddress", "passport"].includes(key) ? "wide" : ""}`} key={key}><span>{label}</span>
              <input value={draft[key] || ""} required={["name", "phone"].includes(key)} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} maxLength={key === "passport" ? 1000 : 500} onChange={event => setDraft(value => ({ ...value, [key]: event.target.value }))} />
            </label>)}
          </div></fieldset>
        </form>}
        {draft?.id && !cardLoading && <ClientTasks key={draft.id} clientId={draft.id} api={api} notify={notify} />}
      </section>
    </div>
  </section>;
}

function ClientTasks({ clientId, api, notify }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const requestId = useRef(crypto.randomUUID());
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/clients/${clientId}/tasks`).then(data => { if (active) { setTasks(data); setError(""); } })
      .catch(failure => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, clientId, revision]);
  const run = async (path, payload, created = false) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      await api(path, payload);
      if (created) { setTitle(""); setDate(""); requestId.current = crypto.randomUUID(); }
      setRevision(value => value + 1); notify(created ? "Задача сохранена" : "Статус задачи сохранён");
    } catch (failure) { setError(failure.message); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <section className="form-section"><div className="form-section-title"><strong>Задачи по клиенту</strong><span>{tasks.filter(task => !task.completedAt).length} активных</span></div>
    {loading && <p role="status">Загрузка задач…</p>}
    {error && <p role="alert">{error}<button className="icon-button" title="Обновить задачи" aria-label="Обновить задачи" onClick={() => setRevision(value => value + 1)}><ArrowClockwise size={18} /></button></p>}
    <div className="task-stack">{tasks.map(task => <div className="action-row" key={task.id}><div><strong>{task.title}</strong><p>{task.date} · {task.assignee}</p></div><button className="secondary-button" disabled={busy || loading} onClick={() => run(`/clients/${clientId}/tasks/${task.id}`, { completed: !task.completedAt, version: task.version })}>{task.completedAt ? "Вернуть" : "Готово"}</button></div>)}</div>
    <form className="task-form" onSubmit={event => { event.preventDefault(); run(`/clients/${clientId}/tasks`, { title, date, requestId: requestId.current }, true); }}>
      <input aria-label="Новая задача по клиенту" placeholder="Например, позвонить по предзаказу" required maxLength={500} disabled={busy} value={title} onChange={event => { setTitle(event.target.value); requestId.current = crypto.randomUUID(); }} />
      <input aria-label="Дата задачи по клиенту" type="date" required disabled={busy} value={date} onChange={event => { setDate(event.target.value); requestId.current = crypto.randomUUID(); }} />
      <button className="primary-button" disabled={busy}>Поставить задачу</button>
    </form>
  </section>;
}
