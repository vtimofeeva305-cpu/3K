import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CaretDown,
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
  UserGear,
  UsersThree,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";

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
const managers = [];
const history = [];
const stages = ["Квалификация", "Подбор", "Ожидается оплата", "Связаться позже", "Отказ"];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function App() {
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
  const [workingManagers, setWorkingManagers] = useState([]);
  const [assignmentRules, setAssignmentRules] = useState({ avito: "", landing: "", phone: "" });

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
    setScreen(next);
    setNoticeOpen(false);
  };

  const openDeal = (dealId) => {
    const nextDeal = dealRecords.find((deal) => deal.id === dealId);
    setSelectedDeal(dealId);
    setDealStage(nextDeal?.stage || "Квалификация");
    setDealTab("overview");
    go("deal");
  };

  const updateDeal = (dealId, patch) => {
    setDealRecords((items) => items.map((item) => (item.id === dealId ? { ...item, ...patch } : item)));
  };

  const createDeal = (draft) => {
    const id = `D-${1 + dealRecords.length}`;
    const managerId = workingManagers.includes(assignmentRules.phone) ? assignmentRules.phone : workingManagers[0];
    const manager = managers.find((item) => item.id === managerId)?.name || "Не назначен";
    const deal = {
      id,
      client: draft.client,
      company: draft.client,
      product: draft.product || "Модель уточняется",
      amount: draft.amount || "0 ₽",
      stage: "Квалификация",
      manager,
      task: draft.virtual ? "Подтвердить предзаказ и размер предоплаты" : "Проверить наличие и связаться с клиентом",
      due: "Сегодня, 18:00",
      source: "CRM: создано вручную",
      vin: draft.virtual ? "Не назначен" : draft.vin || "Не указан",
      date: new Date().toLocaleDateString("ru-RU"),
      paid: draft.paid || "0 ₽",
      closeDate: draft.closeDate || "Не запланировано",
      status: "open",
      virtual: draft.virtual,
    };
    setDealRecords((items) => [deal, ...items]);
    setNewDealOpen(false);
    setDealView("open");
    go("deals");
    notify(`${draft.virtual ? "Виртуальная" : "Новая"} сделка ${id} создана`);
  };

  const createLandingLead = ({ client, phone, listing }) => {
    const managerId = workingManagers.includes(assignmentRules.landing) ? assignmentRules.landing : workingManagers[0];
    const manager = managers.find((item) => item.id === managerId)?.name.split(" ")[0] || "Не назначен";
    const lead = {
      id: `L-${1 + leadRecords.length}`,
      client,
      phone,
      city: "Не указан",
      time: "Только что",
      source: "Лендинг BRP",
      sourceDetected: true,
      listing,
      category: "Заявка с сайта",
      price: "Цена уточняется",
      message: "Клиент оставил заявку на лендинге и согласие на обратный звонок.",
      manager,
      status: "Новый",
      confidence: "100%",
      nextTask: "Связаться с клиентом в течение 15 минут",
    };
    setLeadRecords((items) => [lead, ...items]);
    setSelectedLead(lead.id);
    go("leads");
    notify(`Источник определён: Лендинг BRP. Ответственный: ${manager}`);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">BRP</div>
          <div>
            <div className="brand-title">ЗК BRP</div>
            <div className="brand-subtitle">CRM продаж</div>
          </div>
        </div>

        <nav className="nav-list" aria-label="Основные разделы">
          {NAV_ITEMS.map((item) => {
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
            Руководитель
          </div>
          <p>Видит все обращения, сделки, аналитику и сотрудников.</p>
        </div>
      </aside>

      <main className="workspace">
        <Topbar
          query={query}
          setQuery={setQuery}
          noticeOpen={noticeOpen}
          setNoticeOpen={setNoticeOpen}
          go={go}
          openNewDeal={() => setNewDealOpen(true)}
        />

        {screen === "today" && <TodayScreen go={go} leadRecords={leadRecords} dealRecords={dealRecords} clientRecords={clientRecords} />}
        {screen === "showroom" && <ShowroomScreen notify={notify} waitAdded={waitAdded} setWaitAdded={setWaitAdded} />}
        {screen === "leads" && (
          <LeadsScreen
            activeLead={activeLead}
            filteredLeads={filteredLeads}
            selectedLead={selectedLead}
            setSelectedLead={setSelectedLead}
            go={go}
            notify={notify}
            updateLead={(leadId, patch) => setLeadRecords((items) => items.map((item) => (item.id === leadId ? { ...item, ...patch } : item)))}
          />
        )}
        {screen === "deals" && (
          <DealsScreen
            deals={dealRecords}
            dealView={dealView}
            setDealView={setDealView}
            openDeal={openDeal}
            openNewDeal={() => setNewDealOpen(true)}
          />
        )}
        {screen === "pipeline" && <PipelineScreen deals={dealRecords} openDeal={openDeal} openNewDeal={() => setNewDealOpen(true)} notify={notify} />}
        {screen === "clients" && (
          <ClientsScreen
            clients={clientRecords}
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            updateClient={(clientId, patch) => setClientRecords((items) => items.map((item) => (item.id === clientId ? { ...item, ...patch } : item)))}
            notify={notify}
          />
        )}
        {screen === "managers" && (
          <ManagersScreen
            workingManagers={workingManagers}
            setWorkingManagers={setWorkingManagers}
            assignmentRules={assignmentRules}
            setAssignmentRules={setAssignmentRules}
            notify={notify}
          />
        )}
        {screen === "reports" && <ReportsScreen />}
        {screen === "landing" && <LandingScreen go={go} onSubmit={createLandingLead} />}
        {screen === "deal" && (
          <DealScreen
            deal={activeDeal}
            dealStage={dealStage}
            setDealStage={setDealStage}
            dealTab={dealTab}
            setDealTab={setDealTab}
            taskDone={taskDone}
            setTaskDone={setTaskDone}
            note={note}
            setNote={setNote}
            notify={notify}
            updateDeal={updateDeal}
          />
        )}
      </main>

      {toast ? <div className="toast">{toast}</div> : null}
      {newDealOpen ? <NewDealModal clients={clientRecords} onClose={() => setNewDealOpen(false)} onCreate={createDeal} /> : null}
    </div>
  );
}

function Topbar({ query, setQuery, noticeOpen, setNoticeOpen, go, openNewDeal }) {
  return (
    <header className="topbar">
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
        <button className="profile-chip" type="button">
          <span><UsersThree size={18} /></span>
          Пользователь
          <CaretDown size={14} />
        </button>
      </div>
    </header>
  );
}

function EmptyScreen({ title, message = "Записей пока нет" }) {
  return <section className="screen"><div className="page-heading"><h1>{title}</h1></div><p className="empty-state">{message}</p></section>;
}

function TodayScreen({ go, leadRecords, dealRecords, clientRecords }) {
  return <section className="screen screen-today">
    <div className="page-heading"><div><div className="eyebrow">{new Date().toLocaleDateString("ru-RU")}</div><h1>Сегодня</h1></div></div>
    <div className="stats-grid">
      {[[ChatCircleText, "Лиды", leadRecords.length, "leads"], [Kanban, "Сделки", dealRecords.length, "deals"], [UsersThree, "Клиенты", clientRecords.length, "clients"]].map(([Icon, label, value, target]) =>
        <button className="stat-card" key={target} type="button" onClick={() => go(target)}><Icon size={22} /><span>{label}</span><strong>{value}</strong></button>
      )}
    </div>
    <div className="section-title"><h2>Задачи на сегодня</h2></div>
    <p className="empty-state">Задач пока нет</p>
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

function ManagersScreen({ workingManagers, setWorkingManagers, assignmentRules, setAssignmentRules, notify }) {
  const availableManagers = managers.filter((manager) => workingManagers.includes(manager.id));
  const toggleDay = (managerId) => {
    const isWorking = workingManagers.includes(managerId);
    setWorkingManagers((items) => (isWorking ? items.filter((id) => id !== managerId) : [...items, managerId]));
    notify(isWorking ? "Рабочий день завершён" : "Рабочий день начат, менеджер участвует в распределении");
  };
  return (
    <section className="screen screen-managers">
      <div className="page-heading">
        <div><div className="eyebrow">Распределение нагрузки</div><h1>Команда</h1></div>
        <span className="online-summary">{workingManagers.length} из {managers.length} в работе</span>
      </div>
      <div className="manager-grid">
        {managers.map((manager) => {
          const isWorking = workingManagers.includes(manager.id);
          return (
            <article className="manager-card" key={manager.id}>
              <div className="manager-card-top">
                <div className="manager-avatar">{manager.initials}</div>
                <span className={cx("work-status", isWorking && "online")}>{isWorking ? "На линии" : "Не начал день"}</span>
              </div>
              <h2>{manager.name}</h2>
              <p>{manager.focus}</p>
              <div className="schedule-row"><CalendarCheck size={18} /><span>{manager.days}</span><strong>{manager.schedule}</strong></div>
              <div className="manager-load"><span>Активные лиды</span><strong>{manager.leads}</strong></div>
              <button className={isWorking ? "secondary-button full" : "primary-button full"} type="button" onClick={() => toggleDay(manager.id)}>
                {isWorking ? "Завершить рабочий день" : "Начать рабочий день"}
              </button>
            </article>
          );
        })}
      </div>
      <section className="assignment-panel">
        <div className="section-title">
          <div><h2>Назначение ответственных</h2><p>Лиды получают только менеджеры, которые начали рабочий день.</p></div>
          <span>Автоматически по источнику</span>
        </div>
        <div className="rule-grid">
          {[["avito", "Авито"], ["landing", "Лендинг BRP"], ["phone", "Телефон / вручную"]].map(([id, label]) => (
            <label className="assignment-rule" key={id}>
              <div><LinkSimple size={18} weight="bold" /><span>{label}</span></div>
              <select
                value={workingManagers.includes(assignmentRules[id]) ? assignmentRules[id] : availableManagers[0]?.id || ""}
                onChange={(event) => setAssignmentRules((rules) => ({ ...rules, [id]: event.target.value }))}
                disabled={!availableManagers.length}
              >
                {availableManagers.map((manager) => <option value={manager.id} key={manager.id}>{manager.name}</option>)}
              </select>
            </label>
          ))}
        </div>
      </section>
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
