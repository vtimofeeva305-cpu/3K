import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Plus, X } from "@phosphor-icons/react";
import { getValidSession } from "./auth.js";

export const ROLE_LABELS = { superadmin: "Суперадминистратор", rop: "РОП", manager: "Менеджер отдела продаж" };
export const isLeader = (member) => ["superadmin", "rop"].includes(member?.role);
const INVITE_KEY = "three-k-pending-invite";

export function captureInvitation() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (params.has("invite")) {
    sessionStorage.setItem(INVITE_KEY, params.get("invite"));
    const url = new URL(window.location.href);
    url.hash = "";
    window.history.replaceState(null, "", url);
  }
  return sessionStorage.getItem(INVITE_KEY) || "";
}

export function useAccess(config, signedIn) {
  const [member, setMember] = useState(null);
  const [team, setTeam] = useState([]);
  const [rules, setRules] = useState({});
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [invite, setInvite] = useState(captureInvitation);
  useEffect(() => {
    const capture = () => setInvite(captureInvitation());
    window.addEventListener("hashchange", capture);
    return () => window.removeEventListener("hashchange", capture);
  }, []);
  const generation = useRef(0);
  const api = useMemo(() => async (path, payload) => {
    const session = await getValidSession(config);
    if (!session) throw new Error("Сессия истекла. Войдите снова через Telegram.");
    const response = await fetch(`${config.supabaseUrl}/functions/v1/three-k-api${path}`, {
      method: payload === undefined ? "GET" : "POST",
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    const body = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        setMember(null);
        setError(body.message || "Сессия истекла. Войдите снова.");
        setStatus("error");
      }
      throw new Error(body.message || "Не удалось выполнить запрос");
    }
    return body.data;
  }, [config]);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setError("");
    try {
      const result = await api("/me");
      let nextTeam = [], nextRules = {};
      if (result.member) {
        nextTeam = await api("/team");
        nextRules = await api("/assignment-rules");
      }
      if (current !== generation.current) return;
      setMember(result.member);
      setTeam(nextTeam);
      setRules(nextRules);
      setStatus("ready");
    } catch (failure) {
      if (current !== generation.current) return;
      setMember(null);
      setError(failure.message);
      setStatus("error");
    }
  }, [api]);
  useEffect(() => {
    if (!signedIn) {
      generation.current++;
      setMember(null);
      setTeam([]);
      setStatus("loading");
      return;
    }
    refresh();
    window.addEventListener("focus", refresh);
    const interval = window.setInterval(refresh, 60000);
    return () => { generation.current++; window.removeEventListener("focus", refresh); window.clearInterval(interval); };
  }, [signedIn, refresh]);
  const dismissInvite = () => { sessionStorage.removeItem(INVITE_KEY); setInvite(""); };
  const accept = async () => {
    setError("");
    try { await api("/invitations/accept", { token: invite }); dismissInvite(); await refresh(); }
    catch (failure) { setError(failure.message); }
  };
  return { member, team, rules, status, error, invite, api, refresh, accept, dismissInvite };
}

export function AccessScreen({ access, onSignOut }) {
  const [busy, setBusy] = useState(false);
  const run = async (action) => { setBusy(true); try { await action(); } finally { setBusy(false); } };
  return <main className="auth-screen"><section className="auth-card">
    <h1>{access.status === "loading" ? "Проверка доступа" : access.invite ? "Приглашение в команду" : "Доступ к CRM"}</h1>
    {access.status !== "loading" && <>
      {access.error && <p role="alert">{access.error}</p>}
      {!access.member && !access.invite && <p>Для входа нужна ссылка-приглашение от руководителя.</p>}
      {access.invite && <p>{access.member ? "Вы уже в команде." : "Вы присоединитесь к команде как менеджер отдела продаж."}</p>}
      {access.invite && !access.member && <button className="primary-button" disabled={busy} onClick={() => run(access.accept)}>Принять приглашение</button>}
      {access.invite && <button className="secondary-button" disabled={busy} onClick={access.dismissInvite}>{access.member ? "Перейти в CRM" : "Отменить"}</button>}
      {!access.invite && <button className="secondary-button" disabled={busy} onClick={() => run(access.refresh)}>Проверить доступ</button>}
      <button className="ghost-button" disabled={busy} onClick={onSignOut}>Выйти</button>
    </>}
  </section></main>;
}

export function TeamScreen({ access }) {
  const { member, team, rules, api, refresh } = access;
  const [invitations, setInvitations] = useState([]);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const leader = isLeader(member);
  const loadInvitations = useCallback(async () => { if (leader) setInvitations(await api("/invitations")); }, [api, leader]);
  useEffect(() => { loadInvitations().catch((failure) => setError(failure.message)); }, [loadInvitations]);
  const run = async (action) => {
    setBusy(true); setError("");
    try { await action(); await refresh(); await loadInvitations(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const createInvite = () => run(async () => {
    const invitation = await api("/invitations", {});
    const url = new URL(window.location.href);
    url.search = ""; url.hash = `invite=${invitation.token}`;
    setLink(url.href); setCopied(false);
  });
  return <section className="screen screen-managers">
    <div className="page-heading"><h1>Команда</h1>{leader && <button className="primary-button" disabled={busy} onClick={createInvite}><Plus size={18} />Пригласить сотрудника</button>}</div>
    {error && <p role="alert">{error}</p>}
    <div className="manager-grid">{team.map((person) => <article className="manager-card" key={person.id}>
      <h2>{person.name}{person.id === member.id ? " (вы)" : ""}</h2>
      <p>{ROLE_LABELS[person.role]}</p>
      <p className={`work-status ${person.working ? "online" : ""}`}>{person.working ? "На линии" : "Рабочий день завершён"}</p>
      {member.role === "superadmin" && person.role !== "superadmin" && <label className="editable-field">Роль
        <select aria-label={`Роль: ${person.name}`} disabled={busy} value={person.role} onChange={(event) => run(() => api(`/team/${person.id}/role`, { role: event.target.value }))}>
          <option value="manager">Менеджер отдела продаж</option><option value="rop">РОП</option>
        </select>
      </label>}
      {(leader || person.id === member.id) && <button className="secondary-button full" disabled={busy} onClick={() => run(() => api(`/team/${person.id}/workday`, { working: !person.working }))}>{person.working ? "Завершить рабочий день" : "Начать рабочий день"}</button>}
    </article>)}</div>
    <section className="assignment-panel"><h2>Назначение ответственных</h2><div className="rule-grid">
      {[["avito", "Авито"], ["landing", "Лендинг BRP"], ["phone", "Телефон / вручную"]].map(([source, label]) => <label className="assignment-rule" key={source}>{label}
        <select aria-label={label} disabled={!leader || busy} value={rules[source] || ""} onChange={(event) => run(() => api("/assignment-rules", { source, memberId: event.target.value }))}>
          <option value="" disabled>Не назначен</option>{team.filter((person) => person.working || person.id === rules[source]).map((person) => <option key={person.id} value={person.id} disabled={!person.working}>{person.name}{person.working ? "" : " (не на линии)"}</option>)}
        </select>
      </label>)}
    </div></section>
    {leader && <section className="team-invitations"><h2>Приглашения</h2>
      {link && <div className="invite-link"><input readOnly aria-label="Одноразовая ссылка" value={link} onFocus={(event) => event.target.select()} /><button className="icon-button" title={copied ? "Скопировано" : "Копировать ссылку"} aria-label="Копировать ссылку" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setError("Не удалось скопировать ссылку. Выделите её в поле."); } }}><Copy size={20} /></button><span role="status">{copied ? "Скопировано" : "Срок: 7 дней"}</span></div>}
      {!invitations.length && <p>Приглашений пока нет</p>}
      {invitations.map((invite) => { const active = !invite.used_at && !invite.revoked_at && Date.parse(invite.expires_at) > Date.now(); return <div className="invitation-row" key={invite.id}>
        <span>{new Date(invite.created_at).toLocaleString("ru-RU")}</span><span>{invite.used_at ? "Принято" : invite.revoked_at ? "Отозвано" : active ? `До ${new Date(invite.expires_at).toLocaleString("ru-RU")}` : "Истекло"}</span>
        {active && <button className="icon-button" title="Отозвать приглашение" aria-label="Отозвать приглашение" disabled={busy} onClick={() => run(async () => { await api(`/invitations/${invite.id}/revoke`, {}); setLink(""); })}><X size={20} /></button>}
      </div>; })}
    </section>}
  </section>;
}
