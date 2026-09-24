import { useEffect, useMemo, useState } from "react";
import logo from "./assets/3k-logo.svg";
import { AccessScreen, ROLE_LABELS, TeamScreen, isLeader, useAccess } from "./access.jsx";
import { ClientDirectory } from "./clients.jsx";
import { SalesWorkspace, NewSalesDeal } from "./sales.jsx";
import { TaskPanel } from "./tasks.jsx";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  ChartLineUp,
  ChatCircleText,
  CheckCircle,
  Clock,
  CurrencyRub,
  DotsThree,
  Funnel,
  GearSix,
  House,
  HourglassHigh,
  Jeep,
  Kanban,
  LinkSimple,
  ListChecks,
  MagnifyingGlass,
  MapPin,
  NotePencil,
  PhoneCall,
  Plus,
  ShieldCheck,
  Storefront,
  SignOut,
  TelegramLogo,
  UserGear,
  UsersThree,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import {
  clearStoredSession,
  consumeSessionFromUrl,
  fetchUser,
  getAuthConfig,
  getValidSession,
  signInWithTelegram,
  signOut,
} from "./auth.js";

const NAV_ITEMS = [
  { id: "today", label: "Сегодня", mobileLabel: "Сегодня", icon: House },
  { id: "leads", label: "Лиды", mobileLabel: "Лиды", icon: ChatCircleText },
  { id: "deals", label: "Сделки", mobileLabel: "Сделки", icon: Kanban },
  { id: "clients", label: "Клиенты", mobileLabel: "Клиенты", icon: UsersThree },
  { id: "managers", label: "Команда", mobileLabel: "Команда", icon: UserGear },
  { id: "reports", label: "Дашборд РОПа", mobileLabel: "Отчёты", icon: ChartLineUp, desktopOnly: true },
];

const leads = [];
const deals = [];
const clients = [];
const history = [];
const stages = ["Квалификация", "Подбор", "Ожидается оплата", "Связаться позже", "Отказ"];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function App() {
  const authConfig = useMemo(() => getAuthConfig(), []);
  const [authStatus, setAuthStatus] = useState("loading");
  const [authError, setAuthError] = useState("");
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const access = useAccess(authConfig, authStatus === "signed-in");
  const [screen, setScreen] = useState("today");
  const [leadRecords, setLeadRecords] = useState(leads);
  const [dealRecords, setDealRecords] = useState(deals);
  const [clientRecords, setClientRecords] = useState(clients);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [dealView, setDealView] = useState("open");
  const [dealStage, setDealStage] = useState("Ожидается оплата");
  const [dealTab, setDealTab] = useState("overview");
  const [taskDone, setTaskDone] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [waitAdded, setWaitAdded] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [note, setNote] = useState("");
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [clientDirty, setClientDirty] = useState(false);
  const [recordTarget, setRecordTarget] = useState(null);
  const workingManagers = access.team.filter((person) => person.working).map((person) => person.id);
  const assignmentRules = access.rules;
  const managers = access.team;

  useEffect(() => {
    if (!isLeader(access.member)) setScreen((current) => current === "reports" ? "today" : current);
  }, [access.member]);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      if (!authConfig.isConfigured) {
        setAuthStatus("signed-out");
        return;
      }

      const callbackResult = consumeSessionFromUrl();
      if (callbackResult.error) {
        setAuthError(callbackResult.error);
      }

      const activeSession = await getValidSession(authConfig, callbackResult.session || undefined);
      if (!activeSession) {
        if (isMounted) setAuthStatus("signed-out");
        return;
      }

      const activeUser = await fetchUser(authConfig, activeSession);
      if (!isMounted) return;

      if (!activeUser) {
        setAuthStatus("signed-out");
        return;
      }

      setSession(activeSession);
      setUser(activeUser);
      setAuthStatus("signed-in");
    }

    initializeAuth().catch((error) => {
      console.error("Auth initialization failed", error);
      clearStoredSession();
      if (isMounted) {
        setAuthError("Не удалось проверить сессию Telegram");
        setAuthStatus("signed-out");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [authConfig]);

  const activeLead = useMemo(() => leadRecords.find((lead) => lead.id === selectedLead) || leadRecords[0], [leadRecords, selectedLead]);
  const activeDeal = useMemo(() => dealRecords.find((deal) => deal.id === selectedDeal) || dealRecords[0], [dealRecords, selectedDeal]);
  const filteredLeads = useMemo(() => {
    if (!query.trim()) return leadRecords;
    const search = query.trim().toLowerCase();
    return leadRecords.filter((lead) => [lead.client, lead.listing, lead.category, lead.phone, lead.source].join(" ").toLowerCase().includes(search));
  }, [leadRecords, query]);

  const notify = (text) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 2400);
  };

  const go = (next) => {
    if (next !== screen && clientDirty && !window.confirm("Отменить несохранённые изменения карточки?")) return;
    if (next === "reports" && !isLeader(access.member)) return;
    setRecordTarget(null);
    setScreen(next);
    setNoticeOpen(false);
  };

  const openTaskContext = (kind, id) => {
    if (!["clients", "leads", "deals"].includes(kind)) return;
    if (clientDirty && !window.confirm("Отменить несохранённые изменения?")) return;
    setRecordTarget({ kind, id });
    setScreen(kind);
    setNoticeOpen(false);
  };

  const handleTelegramSignIn = () => {
    if (!authConfig.isConfigured) return;
    signInWithTelegram(authConfig);
  };

  const handleSignOut = async () => {
    await signOut(authConfig, session);
    setSession(null);
    setUser(null);
    setAuthStatus("signed-out");
    go("today");
  };

  if (authStatus === "loading") {
    return <AuthScreen mode="loading" />;
  }

  if (authStatus !== "signed-in") {
    return (
      <AuthScreen
        mode="signed-out"
        authConfig={authConfig}
        error={authError}
        onTelegramSignIn={handleTelegramSignIn}
      />
    );
  }

  if (access.status !== "ready" || !access.member || access.invite) {
    return <AccessScreen access={access} onSignOut={handleSignOut} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <img className="brand-logo" src={logo} alt="3К" width="104" height="64" />
          <div className="brand-subtitle">CRM продаж</div>
        </div>

        <nav className="nav-list" aria-label="Основные разделы">
          {NAV_ITEMS.filter((item) => item.id !== "reports" || isLeader(access.member)).map((item) => {
            const Icon = item.icon;
            const isActive = screen === item.id || (screen === "deal" && item.id === "deals");
            return (
              <button
                className={cx("nav-item", isActive && "active", item.desktopOnly && "desktop-only-nav")}
                key={item.id}
                onClick={() => go(item.id)}
                type="button"
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon size={19} weight={isActive ? "fill" : "regular"} />
                </span>
                <span className="nav-label">{item.label}</span>
                <span className="nav-label-mobile" aria-hidden="true">{item.mobileLabel}</span>
              </button>
            );
          })}
        </nav>

        <div className="role-panel">
          <div className="eyebrow">Роль</div>
          <div className="role-row">
            <ShieldCheck size={18} weight="fill" />
            {ROLE_LABELS[access.member.role]}
          </div>
        </div>
      </aside>

      <main className="workspace">
        <Topbar
          query={query}
          setQuery={setQuery}
          noticeOpen={noticeOpen}
          setNoticeOpen={setNoticeOpen}
          go={go}
          openNewDeal={() => { if (!clientDirty || window.confirm("Отменить несохранённые изменения карточки?")) setNewDealOpen(true); }}
          user={user}
          onSignOut={handleSignOut}
        />

        {screen === "today" && <TodayScreen api={access.api} go={go} leader={isLeader(access.member)} member={access.member} team={access.team} onDirtyChange={setClientDirty} onOpen={openTaskContext} />}
        {screen === "showroom" && <ShowroomScreen notify={notify} waitAdded={waitAdded} setWaitAdded={setWaitAdded} />}
        {["leads", "deals", "pipeline", "deal", "landing"].includes(screen) && <SalesWorkspace key={`${screen}:${newDealOpen}:${recordTarget?.id || ""}`} initialId={recordTarget?.id} api={access.api} member={access.member} team={access.team}
          kind={["leads", "landing"].includes(screen) ? "leads" : "deals"} intake={screen === "landing"} query={query} notify={notify} onDirtyChange={setClientDirty} />}
        {screen === "clients" && (
          <ClientDirectory key={recordTarget?.id || "directory"} initialId={recordTarget?.id} api={access.api} notify={notify} onDirtyChange={setClientDirty} member={access.member} team={access.team} />
        )}
        {screen === "managers" && (
          <TeamScreen access={access} />
        )}
        {screen === "reports" && isLeader(access.member) && <ReportsScreen />}
      </main>

      {toast ? <div className="toast">{toast}</div> : null}
      {newDealOpen ? <NewSalesDeal api={access.api} member={access.member} team={access.team} onClose={() => setNewDealOpen(false)} notify={notify} /> : null}
    </div>
  );
}

function AuthScreen({ mode, authConfig, error, onTelegramSignIn }) {
  const isLoading = mode === "loading";
  const missingKeys = authConfig?.missingKeys || [];

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-block">
          <img className="brand-logo" src={logo} alt="3К" width="104" height="64" />
          <div className="brand-subtitle">CRM продаж</div>
        </div>

        <div className="auth-copy">
          <div className="eyebrow">Вход для команды</div>
          <h1>{isLoading ? "Проверяем сессию" : "Авторизация через Telegram"}</h1>
          <p>{isLoading ? "CRM откроется после проверки пользователя." : "Доступ к рабочему пространству доступен после входа в Telegram."}</p>
        </div>

        {missingKeys.length ? (
          <div className="auth-alert">
            <WarningCircle size={19} weight="bold" />
            <span>Не заданы переменные: {missingKeys.join(", ")}</span>
          </div>
        ) : null}

        {error ? (
          <div className="auth-alert danger">
            <XCircle size={19} weight="bold" />
            <span>{error}</span>
          </div>
        ) : null}

        <button className="telegram-button" type="button" onClick={onTelegramSignIn} disabled={isLoading || missingKeys.length > 0}>
          <TelegramLogo size={20} weight="fill" />
          Войти через Telegram
        </button>
      </section>
    </main>
  );
}

function getUserDisplayName(user) {
  const metadata = user?.user_metadata || {};
  return metadata.full_name || metadata.name || metadata.user_name || user?.email || "Пользователь";
}

function Topbar({ query, setQuery, noticeOpen, setNoticeOpen, go, openNewDeal, user, onSignOut }) {
  return (
    <header className="topbar">
      <div className="mobile-brand"><img src={logo} alt="3К" width="58" height="36" /><span>CRM продаж</span><button className="mobile-landing" type="button" onClick={() => go("landing")}><Storefront size={16} />Лендинг</button></div>
      <label className="search-box">
        <MagnifyingGlass size={18} />
        <input
          aria-label="Глобальный поиск"
          placeholder="Поиск по клиенту, телефону, ИНН или технике"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="topbar-actions">
        <button className="ghost-button" type="button" onClick={() => go("landing")}>
          <Storefront size={18} weight="bold" />
          Лендинг
        </button>
        <button className="primary-button" type="button" onClick={openNewDeal}>
          <Plus size={18} weight="bold" />
          Новая сделка
        </button>
        <div className="notification-wrap">
          <button
            className={cx("icon-button", noticeOpen && "active")}
            aria-label="Уведомления"
            type="button"
            onClick={() => setNoticeOpen(!noticeOpen)}
          >
            <Bell size={20} weight="regular" />
            
          </button>
          {noticeOpen ? (
            <div className="notice-popover">
              <div className="notice-title">Внутренние уведомления</div>
              <p>Нет уведомлений</p>

            </div>
          ) : null}
        </div>
        <button className="profile-chip" type="button" onClick={onSignOut} title="Выйти">
          <span><UsersThree size={18} /></span>
          {getUserDisplayName(user)}
          <SignOut size={15} weight="bold" />
        </button>
      </div>
    </header>
  );
}

function EmptyScreen({ title, message = "Записей пока нет" }) {
  return <section className="screen"><div className="page-heading"><h1>{title}</h1></div><p className="empty-state">{message}</p></section>;
}

function TodayScreen({ go, api, leader, member, team, onDirtyChange, onOpen }) {
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    api("/sales/summary").then(data => { if (active) { setCounts(data); setError(""); } })
      .catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [api, revision]);
  return <section className="screen screen-today">
    <div className="page-heading">
      <div><div className="eyebrow">Рабочий стол · {new Date().toLocaleDateString("ru-RU")}</div><h1>Сегодня</h1><p className="page-description">Всё для работы с клиентами и продажами.</p></div>
      {leader && <button className="secondary-button" onClick={() => go("reports")}><ChartLineUp size={18} />Дашборд РОПа<ArrowRight size={16} /></button>}
    </div>
    {error && <p role="alert">{error} <button className="ghost-button" onClick={() => setRevision(value => value + 1)}>Повторить</button></p>}
    <div className="stats-grid">
      {[[ChatCircleText, "Лиды", counts?.leads ?? "…", "leads", "Входящие обращения"], [Kanban, "Сделки", counts?.deals ?? "…", "deals", "Работа с продажами"], [UsersThree, "Клиенты", counts?.clients ?? "…", "clients", "Клиентская база"]].map(([Icon, label, value, target, description]) =>
        <button className="stat-card today-stat" key={target} type="button" onClick={() => go(target)}>
          <span className="today-stat-heading"><span className="stat-icon"><Icon size={21} /></span><span>{label}</span><ArrowRight className="stat-arrow" size={18} /></span>
          <strong className="today-stat-value">{value}</strong><span className="today-stat-description">{description}</span>
        </button>
      )}
    </div>
    <TaskPanel api={api} member={member} team={team} onDirtyChange={onDirtyChange} onOpen={onOpen} />
  </section>;
}

function ReportsScreen() {
  const [tab, setTab] = useState("Обзор");
  const [period, setPeriod] = useState("Текущий месяц");
  return <section className="screen">
    <div className="page-heading"><h1>Дашборд РОПа</h1>
      <select aria-label="Период отчёта" value={period} onChange={event => setPeriod(event.target.value)}>
        {["Сегодня", "Вчера", "Текущая неделя", "Текущий месяц", "Предыдущий месяц"].map(label => <option key={label}>{label}</option>)}
      </select>
    </div>
    <div className="tabs">{["Обзор", "Воронка", "Менеджеры", "Активность", "Скорость ответа", "Внимание", "Маркетинг"].map(label =>
      <button key={label} type="button" className={cx(tab === label && "active")} onClick={() => setTab(label)}>{label}</button>)}</div>
    <p className="empty-state">Нет данных за выбранный период</p>
  </section>;
}

function ShowroomScreen() {
  return <EmptyScreen title="Шоурум" message="Техника пока не добавлена" />;
}

function LeadsScreen({ activeLead, filteredLeads, selectedLead, setSelectedLead, go, notify, updateLead }) {
  if (!activeLead) return <EmptyScreen title="Лиды" />;
  return (
    <section className="screen screen-leads">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Входящие обращения</div>
          <h1>Лиды</h1>
        </div>
        <button className="secondary-button" type="button">
          <Funnel size={18} weight="bold" />
          Фильтры
        </button>
      </div>

      <div className="lead-layout">
        <aside className="lead-list">
          {filteredLeads.map((lead) => (
            <button
              className={cx("lead-preview", selectedLead === lead.id && "active")}
              key={lead.id}
              type="button"
              onClick={() => setSelectedLead(lead.id)}
            >
              <div>
                <strong>{lead.client}</strong>
                <span>{lead.listing}</span>
                <span className="source-line">{lead.source} · {lead.manager}</span>
              </div>
              <small>{lead.time}</small>
            </button>
          ))}
        </aside>

        <section className="lead-detail">
          <div className="lead-detail-top">
            <div>
              <div className="status-line">
                <span className="status-pill yellow">{activeLead.status}</span>
                <span>Распознано с точностью {activeLead.confidence}</span>
              </div>
              <h2>{activeLead.client}</h2>
              <p>{activeLead.message}</p>
            </div>
            <button className="icon-button bordered" type="button">
              <DotsThree size={22} />
            </button>
          </div>

          <div className="recognition-box">
            <div className="recognition-image">
              <img src={`${import.meta.env.BASE_URL}assets/can-am-maverick-x3.png`} alt="Миниатюра объявления Can-Am" />
            </div>
            <div>
              <div className="eyebrow">Источник определён автоматически</div>
              <h3>{activeLead.listing}</h3>
              <div className="inline-meta">
                <span className="source-lock"><LinkSimple size={14} weight="bold" /> {activeLead.source}</span>
                <span>{activeLead.category}</span>
                <span>{activeLead.price}</span>
                <span>{activeLead.city}</span>
              </div>
            </div>
          </div>

          <div className="detail-grid three">
            <InfoTile icon={PhoneCall} label="Контакт" value={activeLead.phone} />
            <label className="info-select">
              <UserGear size={19} weight="bold" />
              <span>Ответственный</span>
              <select value={activeLead.manager} onChange={(event) => updateLead(activeLead.id, { manager: event.target.value })}>
                {managers.map((manager) => <option key={manager.id}>{manager.name.split(" ")[0]}</option>)}
              </select>
            </label>
            <InfoTile icon={Clock} label="Задача" value={activeLead.nextTask} />
          </div>

          <div className="avito-note">
            <LinkSimple size={18} weight="bold" />
            Канал «{activeLead.source}» зафиксирован системой и недоступен для ручного изменения. Ответственный назначается по правилам распределения.
          </div>

          <div className="button-row">
            <button className="primary-button" type="button" onClick={() => go("deals")}>
              Создать сделку
              <ArrowRight size={18} weight="bold" />
            </button>
            <button className="secondary-button" type="button" onClick={() => notify("Открытие диалога Авито зафиксировано в истории")}>
              Открыть диалог в Авито
            </button>
            <button className="ghost-button" type="button" onClick={() => notify("Обращение назначено на менеджера")}>
              Взять в работу
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

function DealsScreen({ deals, dealView, setDealView, openDeal, openNewDeal }) {
  const visibleDeals = deals.filter((deal) => deal.status === (dealView === "closed" ? "closed" : "open"));
  return (
    <section className="screen screen-deals">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Продажи</div>
          <h1>Сделки</h1>
        </div>
        <button className="primary-button" type="button" onClick={openNewDeal}>
          Новая сделка
          <Plus size={18} weight="bold" />
        </button>
      </div>

      <div className="tabs deals-tabs" aria-label="Разделы сделок">
        {[["open", "Открытые"], ["pipeline", "Воронка"], ["closed", "Закрытые"]].map(([id, label]) => (
          <button className={cx(dealView === id && "active")} type="button" key={id} onClick={() => setDealView(id)}>{label}</button>
        ))}
      </div>

      {dealView === "pipeline" ? (
        <PipelineBoard deals={deals} openDeal={openDeal} />
      ) : (
        <section className="deal-register">
          <div className="deal-register-head">
            <div>
              <strong>{dealView === "closed" ? "Закрытые сделки" : "Открытые сделки"}</strong>
              <span>{visibleDeals.length} записей</span>
            </div>
            <span>{dealView === "closed" ? "Архив продаж" : "Нажмите на строку, чтобы открыть карточку"}</span>
          </div>
          <div className="deal-table-wrap">
            <table className="deal-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Клиент</th>
                  <th>VIN</th>
                  <th>Техника</th>
                  <th>Сумма</th>
                  <th>Дата</th>
                  <th>Оплачено</th>
                  <th>План закрытия</th>
                </tr>
              </thead>
              <tbody>
                {visibleDeals.map((deal) => (
                  <tr key={deal.id} onClick={() => openDeal(deal.id)}>
                    <td data-label="Сделка"><strong>{deal.id}</strong>{deal.virtual ? <small>Виртуальная</small> : null}</td>
                    <td data-label="Клиент">{deal.client}</td>
                    <td data-label="VIN" className="vin-cell">{deal.vin}</td>
                    <td data-label="Техника">{deal.product}</td>
                    <td data-label="Сумма">{deal.amount}</td>
                    <td data-label="Дата">{deal.date}</td>
                    <td data-label="Оплачено"><strong>{deal.paid}</strong></td>
                    <td data-label="План закрытия">{deal.closeDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  );
}

function PipelineScreen({ deals, openDeal, openNewDeal }) {
  return (
    <section className="screen">
      <div className="page-heading">
        <div><div className="eyebrow">Продажи</div><h1>Воронка</h1></div>
        <button className="primary-button" type="button" onClick={openNewDeal}>Новая сделка <Plus size={18} weight="bold" /></button>
      </div>
      <PipelineBoard deals={deals} openDeal={openDeal} />
    </section>
  );
}

function PipelineBoard({ deals, openDeal }) {
  const grouped = stages.map((stage) => ({ stage, items: deals.filter((deal) => deal.status === "open" && deal.stage === stage) }));
  const actions = {
    "Квалификация": "Квалифицировать лид",
    "Подбор": "Отправить КП",
    "Ожидается оплата": "Выставить счёт",
    "Связаться позже": "Поставить задачу",
    "Отказ": "Указать причину",
  };
  return (
      <div className="pipeline-board">
        {grouped.map((column) => (
          <section className="pipeline-column" key={column.stage}>
            <div className="column-head">
              <strong>{column.stage}</strong>
              <span>{column.items.length}</span>
            </div>
            <div className="deal-stack">
              {column.items.map((deal) => (
                <article className="deal-card" key={deal.id}>
                  <div className="deal-card-head">
                    <strong>{deal.client}</strong>
                    <span>{deal.amount}</span>
                  </div>
                  <p>{deal.product}</p>
                  {deal.virtual ? <div className="virtual-badge">Предзаказ · VIN позже</div> : null}
                  <div className="deal-meta">
                    <span>{deal.manager}</span>
                    <span>{deal.due}</span>
                  </div>
                  <div className="deal-source">{deal.source}</div>
                  <button className="secondary-button compact-button full" type="button" onClick={() => openDeal(deal.id)}>{actions[column.stage]}</button>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
  );
}

function DealScreen({ deal, dealStage, setDealStage, dealTab, setDealTab, taskDone, setTaskDone, note, setNote, notify, updateDeal }) {
  const [taskDraft, setTaskDraft] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [customTasks, setCustomTasks] = useState([]);
  if (!deal) return <EmptyScreen title="Сделка" message="Сделка не выбрана" />;
  return (
    <section className="screen screen-deal">
      <div className="deal-header">
        <div>
          <div className="eyebrow">Сделка {deal.id}</div>
          <h1>{deal.company}</h1>
          <p>{deal.product}</p>
        </div>
        <div className="deal-header-aside">
          <span>{deal.amount}</span>
          <select
            value={dealStage}
            onChange={(event) => {
              setDealStage(event.target.value);
              updateDeal(deal.id, { stage: event.target.value });
            }}
            aria-label="Стадия сделки"
          >
            {deal.status === "closed" ? <option>Закрыта успешно</option> : null}
            {stages.map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="tabs">
        {[
          ["overview", "Обзор"],
          ["client", "Клиент"],
          ["tasks", "Задачи"],
          ["history", "История"],
        ].map(([id, label]) => (
          <button className={cx(dealTab === id && "active")} type="button" key={id} onClick={() => setDealTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="deal-content">
        {dealTab === "overview" && (
          <>
            <section className="plain-section">
              <div className="section-title">
                <h2>Ключевые поля</h2>
                <span>{dealStage}</span>
              </div>
              <div className="detail-grid three">
                <InfoTile icon={UsersThree} label="Клиент" value={deal.client} />
                <InfoTile icon={UserGear} label="Ответственный" value={deal.manager} />
                <InfoTile icon={CurrencyRub} label="Сумма" value={deal.amount} />
                <InfoTile icon={CurrencyRub} label="Оплачено" value={deal.paid} />
                <InfoTile icon={Jeep} label="Техника" value={deal.product} />
                <InfoTile icon={ShieldCheck} label="VIN" value={deal.vin} />
                <InfoTile icon={CalendarCheck} label="Дата сделки" value={deal.date} />
                <InfoTile icon={Clock} label="План закрытия" value={deal.closeDate} />
                <InfoTile icon={ChatCircleText} label="Источник" value={deal.source} />
                <InfoTile icon={HourglassHigh} label="Тип сделки" value={deal.virtual ? "Виртуальная · предзаказ" : "Техника в наличии"} />
              </div>
            </section>
            <section className="plain-section">
              <div className="section-title">
                <h2>Следующее действие</h2>
                <span>{deal.due}</span>
              </div>
              <div className={cx("task-card", taskDone && "done")}>
                <CalendarCheck size={22} weight="bold" />
                <div>
                  <strong>{deal.task}</strong>
                  <span>Менеджер: {deal.manager}</span>
                </div>
                <button
                  className="secondary-button compact-button"
                  type="button"
                  onClick={() => {
                    setTaskDone(!taskDone);
                    notify(taskDone ? "Задача снова активна" : "Задача отмечена выполненной");
                  }}
                >
                  {taskDone ? "Вернуть" : "Готово"}
                </button>
              </div>
            </section>
          </>
        )}

        {dealTab === "client" && (
          <section className="plain-section">
            <div className="section-title">
              <h2>Клиент и компания</h2>
              <span>База клиентов</span>
            </div>
            <div className="detail-grid three">
              <InfoTile icon={UsersThree} label="Клиент" value={deal.client} />

            </div>
          </section>
        )}

        {dealTab === "tasks" && (
          <section className="plain-section">
            <div className="section-title">
              <h2>Задачи и напоминания</h2>
              <span>{customTasks.length} активных</span>
            </div>
            <div className="task-stack">
              {customTasks.map((task, index) => (
                <ActionRow icon={ListChecks} title={task.title} meta={task.date} tag="Клиент" key={`${task.title}-${index}`} />
              ))}
            </div>
            <div className="task-form">
              <input value={taskDraft} onChange={(event) => setTaskDraft(event.target.value)} placeholder="Новая задача клиенту" aria-label="Новая задача клиенту" />
              <input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} aria-label="Дата задачи" />
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  if (!taskDraft.trim()) return;
                  setCustomTasks((items) => [...items, { title: taskDraft.trim(), date: taskDate }]);
                  setTaskDraft("");
                  notify("Задача добавлена в карточку клиента");
                }}
              >
                Добавить задачу
              </button>
            </div>
          </section>
        )}

        {dealTab === "history" && (
          <section className="plain-section">
            <div className="section-title">
              <h2>История работы</h2>
              <span>Авито, задачи, комментарии</span>
            </div>
            <div className="mini-timeline">
              {history.map((event) => (
                <TimelineItem title={event.title} text={event.text} time={event.time} key={event.time} />
              ))}
            </div>
            <div className="note-form">
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Добавить внутренний комментарий"
                aria-label="Новый комментарий"
              />
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  setNote("");
                  notify("Комментарий добавлен в историю сделки");
                }}
              >
                Добавить
              </button>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

function ClientsScreen({ clients, selectedClient, setSelectedClient, updateClient, notify }) {
  const [clientQuery, setClientQuery] = useState("");
  const [clientTask, setClientTask] = useState("");
  const [clientTaskDate, setClientTaskDate] = useState("");
  const [clientTasks, setClientTasks] = useState([]);
  const filteredClients = useMemo(() => {
    const search = clientQuery.trim().toLowerCase().replace(/\s+/g, "");
    return [...clients]
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "ru"))
      .filter((client) => {
        const haystack = [client.displayName, client.name, client.form, client.inn, client.phone]
          .join("")
          .toLowerCase()
          .replace(/\s+/g, "");
        return haystack.includes(search);
      });
  }, [clientQuery, clients]);
  const activeClient = clients.find((client) => client.id === selectedClient) || filteredClients[0] || clients[0];

  return (
    <section className="screen screen-clients">
      <div className="page-heading">
        <div><div className="eyebrow">Единая база</div><h1>Клиенты</h1></div>
        <button className="primary-button" type="button" onClick={() => notify("Форма нового клиента готова к подключению")}>Новый клиент <Plus size={18} weight="bold" /></button>
      </div>
      <div className="client-layout">
        <aside className="client-directory">
          <label className="directory-search">
            <MagnifyingGlass size={17} />
            <input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Телефон, ИНН или название" aria-label="Поиск клиента по телефону, ИНН или названию" />
          </label>
          <div className="alphabet-label">А–Я · {filteredClients.length} клиентов</div>
          <div className="client-list">
            {filteredClients.map((client) => (
              <button className={cx("client-list-item", activeClient?.id === client.id && "active")} key={client.id} type="button" onClick={() => setSelectedClient(client.id)}>
                <span>{client.form}</span>
                <strong>{client.displayName}</strong>
                <small>ИНН {client.inn}</small>
                <small>{client.phone}</small>
              </button>
            ))}
          </div>
        </aside>

        {activeClient ? (
          <section className="client-card">
            <div className="client-card-head">
              <div className="client-avatar">{activeClient.form === "Физлицо" ? "ФЛ" : activeClient.form}</div>
              <div><div className="eyebrow">Карточка {activeClient.id}</div><h2>{activeClient.displayName}</h2></div>
              <button className="primary-button" type="button" onClick={() => notify("Реквизиты клиента сохранены")}>Сохранить</button>
            </div>
            <div className="form-section">
              <div className="form-section-title"><strong>Основные данные</strong><span>Контакты и идентификация</span></div>
              <div className="form-grid">
                <EditableField label="ОПФ" value={activeClient.form} onChange={(value) => updateClient(activeClient.id, { form: value })} />
                <EditableField label="Название / ФИО" value={activeClient.name} onChange={(value) => updateClient(activeClient.id, { name: value, displayName: value })} />
                <EditableField label="ИНН" value={activeClient.inn} onChange={(value) => updateClient(activeClient.id, { inn: value })} />
                <EditableField label="Номер телефона" value={activeClient.phone} onChange={(value) => updateClient(activeClient.id, { phone: value })} />
                <EditableField label="Почта" value={activeClient.email} onChange={(value) => updateClient(activeClient.id, { email: value })} />
                <EditableField label="Адрес" value={activeClient.address} onChange={(value) => updateClient(activeClient.id, { address: value })} wide />
                <EditableField label="Паспортные данные" value={activeClient.passport} onChange={(value) => updateClient(activeClient.id, { passport: value })} wide />
              </div>
            </div>
            <div className="form-section">
              <div className="form-section-title"><strong>Реквизиты</strong><span>Для договоров и оплаты</span></div>
              <div className="form-grid">
                <EditableField label="Юридический адрес" value={activeClient.legalAddress} onChange={(value) => updateClient(activeClient.id, { legalAddress: value })} wide />
                <EditableField label="КПП" value={activeClient.kpp} onChange={(value) => updateClient(activeClient.id, { kpp: value })} />
                <EditableField label="БИК" value={activeClient.bik} onChange={(value) => updateClient(activeClient.id, { bik: value })} />
                <EditableField label="Банк" value={activeClient.bank} onChange={(value) => updateClient(activeClient.id, { bank: value })} wide />
                <EditableField label="Расчётный счёт" value={activeClient.account} onChange={(value) => updateClient(activeClient.id, { account: value })} />
                <EditableField label="Руководитель" value={activeClient.director} onChange={(value) => updateClient(activeClient.id, { director: value })} />
              </div>
            </div>
            <div className="form-section">
              <div className="form-section-title"><strong>Задачи по клиенту</strong><span>{clientTasks.filter((task) => task.clientId === activeClient.id).length} активных</span></div>
              <div className="task-stack">
                {clientTasks.filter((task) => task.clientId === activeClient.id).map((task, index) => (
                  <ActionRow icon={CalendarCheck} title={task.title} meta={task.date} tag="Запланировано" key={`${task.title}-${index}`} />
                ))}
              </div>
              <div className="task-form">
                <input value={clientTask} onChange={(event) => setClientTask(event.target.value)} placeholder="Например, позвонить по предзаказу" aria-label="Новая задача по клиенту" />
                <input type="date" value={clientTaskDate} onChange={(event) => setClientTaskDate(event.target.value)} aria-label="Дата задачи по клиенту" />
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    if (!clientTask.trim()) return;
                    setClientTasks((items) => [...items, { clientId: activeClient.id, title: clientTask.trim(), date: clientTaskDate }]);
                    setClientTask("");
                    notify("Задача поставлена на клиента");
                  }}
                >
                  Поставить задачу
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}


function LandingScreen({ go, onSubmit }) {
  const [client, setClient] = useState("");
  const [phone, setPhone] = useState("");
  const [listing, setListing] = useState("Can-Am Maverick X3 X rs Turbo RR");
  return (
    <section className="screen landing-screen">
      <button className="ghost-button landing-back" type="button" onClick={() => go("today")}>← Вернуться в CRM</button>
      <div className="landing-hero">
        <div className="landing-copy">
          <div className="eyebrow">Техника BRP в наличии и под заказ</div>
          <h1>Can-Am для маршрутов, которые ещё не нанесены на карту</h1>
          <p>Подберём комплектацию, рассчитаем доставку и зафиксируем предзаказ даже до поступления техники.</p>
          <div className="landing-facts"><span>Официальные документы</span><span>Доставка по России</span><span>Предзаказ с предоплатой</span></div>
        </div>
        <img src={`${import.meta.env.BASE_URL}assets/can-am-maverick-x3.png`} alt="Can-Am Maverick X3" />
      </div>
      <form
        className="landing-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!client.trim() || !phone.trim()) return;
          onSubmit({ client: client.trim(), phone: phone.trim(), listing });
        }}
      >
        <div><div className="eyebrow">Заявка попадёт в CRM</div><h2>Получить предложение</h2></div>
        <input value={client} onChange={(event) => setClient(event.target.value)} placeholder="Ваше имя" aria-label="Имя клиента" required />
        <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Номер телефона" aria-label="Номер телефона" required />
        <select value={listing} onChange={(event) => setListing(event.target.value)} aria-label="Интересующая техника">
          <option>Can-Am Maverick X3 X rs Turbo RR</option>
          <option>Sea-Doo RXT-X 325</option>
          <option>Can-Am Defender MAX HD10 Limited</option>
          <option>Ski-Doo Expedition LE</option>
        </select>
        <button className="primary-button" type="submit">Отправить заявку <ArrowRight size={18} weight="bold" /></button>
      </form>
    </section>
  );
}

function NewDealModal({ clients, onClose, onCreate }) {
  const [draft, setDraft] = useState({ client: clients[0]?.displayName || "", product: "", vin: "", amount: "", paid: "", closeDate: "", virtual: false });
  const set = (field, value) => setDraft((item) => ({ ...item, [field]: value }));
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-card" onSubmit={(event) => { event.preventDefault(); onCreate(draft); }}>
        <div className="modal-head"><div><div className="eyebrow">Продажи</div><h2>Новая сделка</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть">×</button></div>
        <label className="editable-field wide"><span>Клиент</span><input value={draft.client} onChange={(event) => set("client", event.target.value)} required /></label>
        <div className="modal-grid">
          <EditableField label="Название техники" value={draft.product} onChange={(value) => set("product", value)} placeholder="Например, Can-Am Maverick X3" />
          <EditableField label="VIN" value={draft.vin} onChange={(value) => set("vin", value)} placeholder={draft.virtual ? "Назначится после поступления" : "Введите VIN"} disabled={draft.virtual} />
          <EditableField label="Сумма сделки" value={draft.amount} onChange={(value) => set("amount", value)} placeholder="0 ₽" />
          <EditableField label="Внесено / предоплата" value={draft.paid} onChange={(value) => set("paid", value)} placeholder="0 ₽" />
          <label className="editable-field"><span>План закрытия</span><input type="date" value={draft.closeDate} onChange={(event) => set("closeDate", event.target.value)} /></label>
        </div>
        <label className="virtual-toggle">
          <input type="checkbox" checked={draft.virtual} onChange={(event) => set("virtual", event.target.checked)} />
          <span><strong>Виртуальная сделка</strong><small>Техники ещё нет в наличии: VIN добавим позже, предоплату можно принять сейчас.</small></span>
        </label>
        <div className="modal-actions"><button className="ghost-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button" type="submit">Открыть сделку</button></div>
      </form>
    </div>
  );
}

function EditableField({ label, value, onChange, wide, placeholder, disabled }) {
  return (
    <label className={cx("editable-field", wide && "wide")}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} />
    </label>
  );
}

function ActionRow({ icon: Icon, title, meta, tag, tone, onClick }) {
  const Element = onClick ? "button" : "div";
  return (
    <Element className={cx("action-row", tone === "danger" && "danger")} type={onClick ? "button" : undefined} onClick={onClick}>
      <div className="action-icon">
        <Icon size={19} weight="bold" />
      </div>
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <small>{tag}</small>
    </Element>
  );
}

function SpecItem({ label, value }) {
  return (
    <div className="spec-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="info-tile">
      <Icon size={19} weight="bold" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function MetricBar({ label, value, width }) {
  return (
    <div className="metric-bar">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="bar-track">
        <span style={{ width }} />
      </div>
    </div>
  );
}

function ManagerLine({ name, role, value }) {
  return (
    <div className="manager-line">
      <div>
        <strong>{name}</strong>
        <span>{role}</span>
      </div>
      <small>{value}</small>
    </div>
  );
}

function TimelineItem({ title, text, time }) {
  return (
    <div className="timeline-item">
      <span className="timeline-dot" />
      <div>
        {time ? <small>{time}</small> : null}
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}
