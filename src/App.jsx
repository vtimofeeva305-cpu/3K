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

const leads = [
  {
    id: "L-2481",
    client: "Дмитрий Кузнецов",
    phone: "+7 921 334-18-90",
    city: "Санкт-Петербург",
    time: "09:42",
    source: "Авито",
    sourceDetected: true,
    listing: "Can-Am Maverick X3 X rs Turbo RR 2024",
    category: "Багги",
    price: "5 950 000 ₽",
    message: "Здравствуйте. Техника в наличии? Рассматриваю покупку на юрлицо, нужен счет с НДС.",
    manager: "Анна",
    status: "Новый",
    confidence: "98%",
    nextTask: "Ответить в Авито и уточнить способ оплаты",
  },
  {
    id: "L-2479",
    client: "Илья Соколов",
    phone: "+7 916 443-77-12",
    city: "Москва",
    time: "10:18",
    source: "Авито",
    sourceDetected: true,
    listing: "Sea-Doo RXT-X 325",
    category: "Гидроцикл",
    price: "2 780 000 ₽",
    message: "Есть ли доставка в Нижний Новгород и какие документы будут на руках?",
    manager: "Олег",
    status: "В работе",
    confidence: "94%",
    nextTask: "Посчитать доставку и вернуться до 13:00",
  },
  {
    id: "L-2474",
    client: "ООО Север",
    phone: "+7 812 707-40-66",
    city: "Архангельск",
    time: "Вчера",
    source: "Авито",
    sourceDetected: true,
    listing: "Can-Am Defender MAX HD10 Limited",
    category: "Мотовездеход",
    price: "4 420 000 ₽",
    message: "Нужна техника для базы отдыха. Оплата безналом, интересует поставка двух единиц.",
    manager: "Мария",
    status: "Сделка создана",
    confidence: "96%",
    nextTask: "Подготовить КП и зафиксировать резерв",
  },
];

const waitlist = [
  { name: "Дмитрий Кузнецов", target: "Maverick X3 X rs", date: "22 сен", manager: "Анна", priority: "Высокий" },
  { name: "ГК Полярный", target: "Ski-Doo Expedition", date: "21 сен", manager: "Мария", priority: "Средний" },
  { name: "Алексей Орлов", target: "Sea-Doo RXT-X 325", date: "20 сен", manager: "Олег", priority: "Средний" },
  { name: "ООО Вектор", target: "Can-Am ATV Outlander", date: "19 сен", manager: "Анна", priority: "Низкий" },
];

const deals = [
  {
    id: "D-1059",
    client: "ООО Север",
    company: "ООО Север",
    product: "Can-Am Defender MAX HD10 Limited",
    amount: "8 840 000 ₽",
    stage: "Ожидается оплата",
    manager: "Мария Лебедева",
    task: "Проверить поступление оплаты",
    due: "Сегодня, 16:00",
    source: "Авито: объявление 2474",
    vin: "3JBVNAV40RK001284",
    date: "18.09.2026",
    paid: "2 000 000 ₽",
    closeDate: "30.09.2026",
    status: "open",
    virtual: false,
  },
  {
    id: "D-1058",
    client: "Илья Соколов",
    company: "Физлицо",
    product: "Sea-Doo RXT-X 325",
    amount: "2 780 000 ₽",
    stage: "Подбор",
    manager: "Олег Романов",
    task: "Отправить варианты доставки",
    due: "Сегодня, 13:00",
    source: "Авито: объявление 2479",
    vin: "YDV12345R626",
    date: "20.09.2026",
    paid: "0 ₽",
    closeDate: "05.10.2026",
    status: "open",
    virtual: false,
  },
  {
    id: "D-1054",
    client: "Дмитрий Кузнецов",
    company: "ИП Кузнецов Д.А.",
    product: "Can-Am Maverick X3 X rs Turbo RR",
    amount: "5 950 000 ₽",
    stage: "Квалификация",
    manager: "Анна Волкова",
    task: "Уточнить форму оплаты",
    due: "Сегодня, 12:30",
    source: "Авито: объявление 2481",
    vin: "Не назначен",
    date: "22.09.2026",
    paid: "500 000 ₽",
    closeDate: "12.10.2026",
    status: "open",
    virtual: true,
  },
  {
    id: "D-1049",
    client: "ГК Полярный",
    company: "ООО Полярный Тур",
    product: "Ski-Doo Expedition LE",
    amount: "3 650 000 ₽",
    stage: "Подбор",
    manager: "Мария Лебедева",
    task: "Согласовать ТК до Мурманска",
    due: "Завтра",
    source: "Лист ожидания",
    vin: "Не назначен",
    date: "15.09.2026",
    paid: "300 000 ₽",
    closeDate: "20.10.2026",
    status: "open",
    virtual: true,
  },
  {
    id: "D-1028",
    client: "Алексей Орлов",
    company: "Алексей Орлов",
    product: "Sea-Doo GTX Limited 300",
    amount: "2 490 000 ₽",
    stage: "Закрыта успешно",
    manager: "Олег Романов",
    task: "Сделка завершена",
    due: "Закрыта 16.09",
    source: "Лендинг BRP",
    vin: "YDV98765H526",
    date: "03.09.2026",
    paid: "2 490 000 ₽",
    closeDate: "16.09.2026",
    status: "closed",
    virtual: false,
  },
];

const stages = ["Квалификация", "Подбор", "Ожидается оплата", "Связаться позже", "Отказ"];

const clients = [
  {
    id: "C-104",
    form: "Физлицо",
    name: "Алексей Орлов",
    displayName: "Алексей Орлов",
    inn: "781245690112",
    phone: "+7 911 214-55-09",
    email: "a.orlov@example.ru",
    address: "Санкт-Петербург, ул. Савушкина, 14",
    passport: "40 18 654321, выдан 12.04.2019",
    legalAddress: "—",
    bik: "—",
    bank: "—",
    account: "—",
    kpp: "—",
    director: "—",
  },
  {
    id: "C-101",
    form: "ИП",
    name: "Кузнецов Дмитрий Андреевич",
    displayName: "ИП Кузнецов Д.А.",
    inn: "780512345678",
    phone: "+7 921 334-18-90",
    email: "dk@kuznetsov.pro",
    address: "Санкт-Петербург, Московский пр., 91",
    passport: "40 16 432109, выдан 08.11.2017",
    legalAddress: "196084, Санкт-Петербург, Московский пр., 91",
    bik: "044030653",
    bank: "Северо-Западный банк ПАО Сбербанк",
    account: "40802810955000012345",
    kpp: "—",
    director: "Кузнецов Дмитрий Андреевич",
  },
  {
    id: "C-102",
    form: "ООО",
    name: "Север",
    displayName: "ООО Север",
    inn: "2901309488",
    phone: "+7 812 707-40-66",
    email: "info@sever-base.ru",
    address: "Архангельск, наб. Северной Двины, 55",
    passport: "—",
    legalAddress: "163000, Архангельск, наб. Северной Двины, 55",
    bik: "041117601",
    bank: "Архангельское отделение ПАО Сбербанк",
    account: "40702810404000087654",
    kpp: "290101001",
    director: "Петрова Елена Сергеевна",
  },
  {
    id: "C-103",
    form: "ООО",
    name: "Полярный Тур",
    displayName: "ООО Полярный Тур",
    inn: "5190127643",
    phone: "+7 815 255-14-44",
    email: "office@polar-tour.ru",
    address: "Мурманск, ул. Полярные Зори, 8",
    passport: "—",
    legalAddress: "183038, Мурманск, ул. Полярные Зори, 8",
    bik: "044705615",
    bank: "Мурманское отделение ПАО Сбербанк",
    account: "40702810641000045678",
    kpp: "519001001",
    director: "Волков Андрей Игоревич",
  },
];

const managers = [
  { id: "maria", name: "Мария Лебедева", initials: "МЛ", schedule: "09:00–18:00", days: "Пн–Пт", focus: "Юрлица и крупные сделки", leads: 4 },
  { id: "anna", name: "Анна Волкова", initials: "АВ", schedule: "10:00–19:00", days: "Вт–Сб", focus: "Багги и квадроциклы", leads: 3 },
  { id: "oleg", name: "Олег Романов", initials: "ОР", schedule: "09:00–18:00", days: "Пн–Пт", focus: "Гидроциклы и доставка", leads: 2 },
];

const reportPeriods = {
  month: {
    label: "Сентябрь 2026",
    summary: { leads: 64, totalDeals: 31, inWork: 18, closed: 13, revenue: "42,8 млн ₽", margin: "9,6 млн ₽", marginPercent: "22,4%", units: 17, conversion: "20,3%" },
    funnel: [
      { label: "Лиды", value: 64, conversion: "100%" },
      { label: "Отправлено КП", value: 41, conversion: "64,1%" },
      { label: "Выставлен счёт", value: 24, conversion: "58,5%" },
      { label: "Счёт оплачен", value: 13, conversion: "54,2%" },
    ],
    managers: [
      { name: "Мария Лебедева", total: 13, inWork: 7, closed: 6, conversion: "28,6%", amount: "18,4 млн ₽" },
      { name: "Анна Волкова", total: 10, inWork: 6, closed: 4, conversion: "19,0%", amount: "13,1 млн ₽" },
      { name: "Олег Романов", total: 8, inWork: 5, closed: 3, conversion: "14,3%", amount: "11,3 млн ₽" },
    ],
    sources: [
      { source: "Авито", leads: 31, open: 9, closed: 8, amount: "23,6 млн ₽", margin: "5,8 млн ₽", marginPercent: "24,6%", conversion: "25,8%", recommendation: "Увеличить бюджет", tone: "good" },
      { source: "Лендинг BRP", leads: 19, open: 6, closed: 4, amount: "12,4 млн ₽", margin: "2,7 млн ₽", marginPercent: "21,8%", conversion: "21,1%", recommendation: "Масштабировать", tone: "good" },
      { source: "Телефон и рекомендации", leads: 10, open: 2, closed: 1, amount: "4,9 млн ₽", margin: "0,9 млн ₽", marginPercent: "18,4%", conversion: "10,0%", recommendation: "Сохранить объём", tone: "neutral" },
      { source: "Социальные сети", leads: 4, open: 1, closed: 0, amount: "1,9 млн ₽", margin: "0,2 млн ₽", marginPercent: "10,5%", conversion: "0%", recommendation: "Пересобрать кампании", tone: "risk" },
    ],
  },
  quarter: {
    label: "III квартал 2026",
    summary: { leads: 188, totalDeals: 92, inWork: 34, closed: 58, revenue: "176,2 млн ₽", margin: "38,7 млн ₽", marginPercent: "22,0%", units: 71, conversion: "30,9%" },
    funnel: [
      { label: "Лиды", value: 188, conversion: "100%" },
      { label: "Отправлено КП", value: 126, conversion: "67,0%" },
      { label: "Выставлен счёт", value: 83, conversion: "65,9%" },
      { label: "Счёт оплачен", value: 58, conversion: "69,9%" },
    ],
    managers: [
      { name: "Мария Лебедева", total: 39, inWork: 12, closed: 27, conversion: "36,5%", amount: "76,8 млн ₽" },
      { name: "Анна Волкова", total: 31, inWork: 11, closed: 20, conversion: "29,0%", amount: "58,1 млн ₽" },
      { name: "Олег Романов", total: 22, inWork: 11, closed: 11, conversion: "23,9%", amount: "41,3 млн ₽" },
    ],
    sources: [
      { source: "Авито", leads: 87, open: 14, closed: 31, amount: "92,6 млн ₽", margin: "21,5 млн ₽", marginPercent: "23,2%", conversion: "35,6%", recommendation: "Увеличить бюджет", tone: "good" },
      { source: "Лендинг BRP", leads: 54, open: 9, closed: 17, amount: "51,7 млн ₽", margin: "11,4 млн ₽", marginPercent: "22,1%", conversion: "31,5%", recommendation: "Масштабировать", tone: "good" },
      { source: "Телефон и рекомендации", leads: 32, open: 7, closed: 8, amount: "25,8 млн ₽", margin: "4,9 млн ₽", marginPercent: "19,0%", conversion: "25,0%", recommendation: "Сохранить объём", tone: "neutral" },
      { source: "Социальные сети", leads: 15, open: 4, closed: 2, amount: "6,1 млн ₽", margin: "0,9 млн ₽", marginPercent: "14,8%", conversion: "13,3%", recommendation: "Оптимизировать", tone: "risk" },
    ],
  },
  year: {
    label: "2026 год",
    summary: { leads: 612, totalDeals: 284, inWork: 46, closed: 238, revenue: "704,5 млн ₽", margin: "151,8 млн ₽", marginPercent: "21,5%", units: 296, conversion: "38,9%" },
    funnel: [
      { label: "Лиды", value: 612, conversion: "100%" },
      { label: "Отправлено КП", value: 422, conversion: "69,0%" },
      { label: "Выставлен счёт", value: 311, conversion: "73,7%" },
      { label: "Счёт оплачен", value: 238, conversion: "76,5%" },
    ],
    managers: [
      { name: "Мария Лебедева", total: 112, inWork: 17, closed: 95, conversion: "43,8%", amount: "301,2 млн ₽" },
      { name: "Анна Волкова", total: 94, inWork: 14, closed: 80, conversion: "38,5%", amount: "226,7 млн ₽" },
      { name: "Олег Романов", total: 78, inWork: 15, closed: 63, conversion: "33,0%", amount: "176,6 млн ₽" },
    ],
    sources: [
      { source: "Авито", leads: 271, open: 18, closed: 112, amount: "331,9 млн ₽", margin: "75,1 млн ₽", marginPercent: "22,6%", conversion: "41,3%", recommendation: "Увеличить бюджет", tone: "good" },
      { source: "Лендинг BRP", leads: 181, open: 12, closed: 74, amount: "221,4 млн ₽", margin: "48,6 млн ₽", marginPercent: "22,0%", conversion: "40,9%", recommendation: "Масштабировать", tone: "good" },
      { source: "Телефон и рекомендации", leads: 111, open: 10, closed: 42, amount: "126,3 млн ₽", margin: "24,5 млн ₽", marginPercent: "19,4%", conversion: "37,8%", recommendation: "Сохранить объём", tone: "neutral" },
      { source: "Социальные сети", leads: 49, open: 6, closed: 10, amount: "24,9 млн ₽", margin: "3,6 млн ₽", marginPercent: "14,5%", conversion: "20,4%", recommendation: "Оптимизировать", tone: "risk" },
    ],
  },
};

const ropPeriodProfiles = {
  today: { label: "Сегодня", factor: 0.12, response: 7, deltaBias: 1.2 },
  yesterday: { label: "Вчера", factor: 0.1, response: 12, deltaBias: 0.8 },
  week: { label: "Текущая неделя", factor: 0.34, response: 9, deltaBias: 1.05 },
  month: { label: "Текущий месяц", factor: 1, response: 11, deltaBias: 1 },
  previous: { label: "Предыдущий месяц", factor: 0.89, response: 14, deltaBias: 0.91 },
  custom: { label: "Произвольный период", factor: 0.55, response: 10, deltaBias: 0.97 },
};

const ropKpiDefinitions = [
  { key: "newLeads", label: "Новые лиды", base: 64, kind: "count", delta: "+12,3%", icon: ChatCircleText },
  { key: "unprocessed", label: "Необработанные лиды", base: 5, kind: "count", delta: "−16,7%", icon: WarningCircle, favorable: true },
  { key: "response", label: "Среднее время ответа", base: 11, kind: "minutes", delta: "−3 мин", icon: Clock, favorable: true },
  { key: "unanswered", label: "Лиды без ответа", base: 2, kind: "count", delta: "−50%", icon: XCircle, favorable: true },
  { key: "overdue", label: "Просроченные задачи", base: 4, kind: "count", delta: "−20%", icon: CalendarCheck, favorable: true },
  { key: "visitsSet", label: "Назначенные визиты", base: 18, kind: "count", delta: "+20%", icon: MapPin },
  { key: "visitsHeld", label: "Состоявшиеся визиты", base: 13, kind: "count", delta: "+8,3%", icon: CheckCircle },
  { key: "testDrives", label: "Тест-драйвы", base: 9, kind: "count", delta: "+12,5%", icon: Jeep },
  { key: "proposals", label: "Отправленные КП", base: 41, kind: "count", delta: "+17,1%", icon: NotePencil },
  { key: "prepayments", label: "Брони / предоплаты", base: 16, kind: "count", delta: "+14,3%", icon: HourglassHigh },
  { key: "contracts", label: "Заключённые договоры", base: 14, kind: "count", delta: "+7,7%", icon: ShieldCheck },
  { key: "units", label: "Продано техники", base: 17, kind: "count", delta: "+21,4%", icon: Storefront },
  { key: "revenue", label: "Выручка", base: 42.8, kind: "money", delta: "+18,2%", icon: CurrencyRub },
  { key: "grossProfit", label: "Валовая прибыль", base: 9.6, kind: "money", delta: "+16,4%", icon: ChartLineUp },
  { key: "avgCheck", label: "Средний чек", base: 3.29, kind: "money", delta: "−2,1%", icon: CurrencyRub },
  { key: "conversion", label: "Конверсия лид → продажа", base: 20.3, kind: "percent", delta: "+2,7 п.п.", icon: Funnel },
  { key: "plan", label: "Выполнение плана", base: 82, kind: "percent", delta: "+11 п.п.", icon: CheckCircle },
  { key: "forecast", label: "Прогноз до конца месяца", base: 54.6, kind: "money", delta: "108% плана", icon: ChartLineUp },
];

const ropFunnelStages = [
  { label: "Новый лид", count: 64, amount: 190.4, avg: "18 мин", stale: 2 },
  { label: "В работе", count: 59, amount: 178.2, avg: "4 ч", stale: 3 },
  { label: "Квалифицирован", count: 51, amount: 160.7, avg: "9 ч", stale: 2 },
  { label: "Назначен визит", count: 42, amount: 136.8, avg: "1,4 дня", stale: 1 },
  { label: "Визит состоялся", count: 34, amount: 111.6, avg: "6 ч", stale: 0 },
  { label: "Тест-драйв", count: 29, amount: 96.3, avg: "8 ч", stale: 0 },
  { label: "Коммерческое предложение", count: 27, amount: 89.5, avg: "1,8 дня", stale: 5 },
  { label: "Переговоры / согласование", count: 23, amount: 78.1, avg: "3,2 дня", stale: 6 },
  { label: "Бронь / предоплата", count: 19, amount: 63.7, avg: "2,1 дня", stale: 2 },
  { label: "Договор", count: 16, amount: 52.9, avg: "1,2 дня", stale: 1 },
  { label: "Оплачено", count: 14, amount: 46.2, avg: "11 ч", stale: 0 },
  { label: "Выдача техники", count: 13, amount: 42.8, avg: "1,6 дня", stale: 1 },
  { label: "Успешная продажа", count: 13, amount: 42.8, avg: "—", stale: 0 },
  { label: "Сделка потеряна", count: 9, amount: 26.7, avg: "4,5 дня", stale: 0, lost: true },
];

const ropManagerPerformance = [
  { name: "Мария Лебедева", initials: "МЛ", newLeads: 21, processed: 21, incoming: 34, outgoing: 87, successful: 69, missed: 2, chats: 46, messages: 118, meetingsSet: 8, meetingsHeld: 7, testDrives: 5, proposals: 14, reservations: 7, contracts: 6, sales: 6, conversion: 28.6, revenue: 18.4, grossProfit: 4.5, avgCheck: 3.07, overdue: 1, lost: 3, plan: 96, forecast: 112 },
  { name: "Анна Волкова", initials: "АВ", newLeads: 22, processed: 20, incoming: 39, outgoing: 74, successful: 51, missed: 5, chats: 53, messages: 101, meetingsSet: 6, meetingsHeld: 4, testDrives: 3, proposals: 13, reservations: 5, contracts: 4, sales: 4, conversion: 18.2, revenue: 13.1, grossProfit: 2.8, avgCheck: 3.28, overdue: 4, lost: 5, plan: 74, forecast: 86 },
  { name: "Олег Романов", initials: "ОР", newLeads: 21, processed: 18, incoming: 31, outgoing: 61, successful: 39, missed: 7, chats: 38, messages: 84, meetingsSet: 4, meetingsHeld: 2, testDrives: 1, proposals: 14, reservations: 4, contracts: 4, sales: 3, conversion: 14.3, revenue: 11.3, grossProfit: 2.3, avgCheck: 3.77, overdue: 7, lost: 7, plan: 62, forecast: 71 },
];

const ropManagerColumns = [
  ["newLeads", "Новые лиды"], ["processed", "Обработано"], ["incoming", "Входящие звонки"], ["outgoing", "Исходящие звонки"],
  ["successful", "Успешные звонки"], ["missed", "Пропущено"], ["chats", "Переписки"], ["messages", "Сообщения"],
  ["meetingsSet", "Встречи назначены"], ["meetingsHeld", "Встречи состоялись"], ["testDrives", "Тест-драйвы"], ["proposals", "КП"],
  ["reservations", "Брони"], ["contracts", "Договоры"], ["sales", "Продажи"], ["conversion", "Конверсия"],
  ["revenue", "Выручка"], ["grossProfit", "Валовая прибыль"], ["avgCheck", "Средний чек"], ["overdue", "Просрочено задач"],
  ["lost", "Потеряно лидов"], ["plan", "Личный план"], ["forecast", "Прогноз плана"],
];

const leadSpeedRows = [
  { group: "Отдел продаж", type: "Итого", avg: 11, median: 7, under5: 21, under15: 42, under30: 51, under60: 57, over60: 5, over120: 2, unanswered: 2 },
  { group: "Мария Лебедева", type: "Менеджер", avg: 6, median: 4, under5: 10, under15: 17, under30: 19, under60: 20, over60: 1, over120: 0, unanswered: 0 },
  { group: "Анна Волкова", type: "Менеджер", avg: 12, median: 8, under5: 7, under15: 15, under30: 18, under60: 20, over60: 2, over120: 1, unanswered: 1 },
  { group: "Олег Романов", type: "Менеджер", avg: 18, median: 12, under5: 4, under15: 10, under30: 14, under60: 17, over60: 2, over120: 1, unanswered: 1 },
  { group: "Авито", type: "Источник", avg: 9, median: 6, under5: 12, under15: 23, under30: 27, under60: 29, over60: 2, over120: 1, unanswered: 1 },
  { group: "Лендинг BRP", type: "Источник", avg: 7, median: 5, under5: 7, under15: 15, under30: 17, under60: 18, over60: 1, over120: 0, unanswered: 0 },
  { group: "Телефон и рекомендации", type: "Источник", avg: 21, median: 14, under5: 2, under15: 4, under30: 7, under60: 9, over60: 1, over120: 1, unanswered: 1 },
];

const attentionItems = [
  { type: "Без ответа", client: "Ирина Смирнова", manager: "Олег Романов", age: "2 ч 14 мин", reason: "Заявка с лендинга не обработана", action: "Позвонить сейчас", severity: "high" },
  { type: "Просрочена задача", client: "Дмитрий Кузнецов", manager: "Анна Волкова", age: "1 день", reason: "Не уточнена форма оплаты", action: "Вернуть в работу", severity: "high" },
  { type: "Застряла на этапе", client: "ООО Вектор", manager: "Олег Романов", age: "6 дней", reason: "КП отправлено, следующего действия нет", action: "Назначить задачу", severity: "high" },
  { type: "Нет следующего действия", client: "ГК Полярный", manager: "Мария Лебедева", age: "3 дня", reason: "Ожидает поступление Ski-Doo", action: "Запланировать контакт", severity: "medium" },
  { type: "Пропущенный звонок", client: "Алексей Орлов", manager: "Анна Волкова", age: "47 мин", reason: "Нет обратного звонка", action: "Перезвонить", severity: "medium" },
  { type: "Долгий этап", client: "Илья Соколов", manager: "Олег Романов", age: "4 дня", reason: "Подбор без отправленного КП", action: "Подготовить КП", severity: "medium" },
];

const inventoryReport = [
  { label: "В наличии", value: 38, meta: "22 модели", tone: "good" },
  { label: "В резерве", value: 11, meta: "29% склада", tone: "warning" },
  { label: "В продаже", value: 27, meta: "доступно клиентам", tone: "neutral" },
  { label: "Ожидается поставка", value: 14, meta: "до конца месяца", tone: "neutral" },
];

const demandReport = [
  { model: "Can-Am Maverick X3", leads: 18, deals: 7, available: 3, reserve: 4 },
  { model: "Sea-Doo RXT-X 325", leads: 13, deals: 5, available: 6, reserve: 2 },
  { model: "Can-Am Defender MAX HD10", leads: 11, deals: 4, available: 2, reserve: 3 },
  { model: "Ski-Doo Expedition LE", leads: 9, deals: 3, available: 0, reserve: 2 },
];

const lossReasons = [
  { label: "Нет техники в наличии", value: 4, share: 44 },
  { label: "Цена / условия оплаты", value: 2, share: 22 },
  { label: "Клиент отложил покупку", value: 2, share: 22 },
  { label: "Выбрал конкурента", value: 1, share: 12 },
];

const history = [
  { time: "Сегодня 10:42", title: "Создана задача", text: "Проверить поступление оплаты до 16:00" },
  { time: "Сегодня 09:15", title: "Изменена стадия", text: "Сделка переведена в Ожидается оплата" },
  { time: "Вчера 17:30", title: "Комментарий менеджера", text: "Клиент подтвердил безналичную оплату с НДС" },
  { time: "Вчера 12:05", title: "Обращение Авито", text: "Распознано объявление Can-Am Defender MAX HD10 Limited" },
];

const stats = [
  { label: "Новые обращения", value: "3", delta: "+2 к вчера", icon: ChatCircleText },
  { label: "Просроченные задачи", value: "1", delta: "нужна реакция", icon: WarningCircle },
  { label: "Сделки в оплате", value: "4", delta: "12,8 млн ₽", icon: CurrencyRub },
  { label: "Клиенты ждут модель", value: "8", delta: "лист ожидания", icon: HourglassHigh },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function App() {
  const [screen, setScreen] = useState("today");
  const [leadRecords, setLeadRecords] = useState(leads);
  const [dealRecords, setDealRecords] = useState(deals);
  const [clientRecords, setClientRecords] = useState(clients);
  const [selectedLead, setSelectedLead] = useState(leads[0].id);
  const [selectedDeal, setSelectedDeal] = useState(deals[0].id);
  const [selectedClient, setSelectedClient] = useState(clients[0].id);
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
  const [workingManagers, setWorkingManagers] = useState(["maria", "anna"]);
  const [assignmentRules, setAssignmentRules] = useState({ avito: "anna", landing: "maria", phone: "maria" });

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
    const id = `D-${1060 + dealRecords.length}`;
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
      date: "23.09.2026",
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
      id: `L-${2482 + leadRecords.length}`,
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

        {screen === "today" && <TodayScreen go={go} />}
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
            <span className="badge-dot" />
          </button>
          {noticeOpen ? (
            <div className="notice-popover">
              <div className="notice-title">Внутренние уведомления</div>
              <button type="button" onClick={() => go("leads")}>
                Новое обращение с Авито по Maverick X3
              </button>
              <button type="button" onClick={() => go("deal")}>
                Задача по ООО Север просрочится через 1 час
              </button>
              <button type="button" onClick={() => go("showroom")}>
                Клиент ждёт поступление Ski-Doo Expedition
              </button>
            </div>
          ) : null}
        </div>
        <button className="profile-chip" type="button">
          <span>МЛ</span>
          Мария Лебедева
          <CaretDown size={14} />
        </button>
      </div>
    </header>
  );
}

function TodayScreen({ go }) {
  return (
    <section className="screen screen-today">
      <div className="page-heading">
        <div>
          <div className="eyebrow">22 сентября 2026</div>
          <h1>Сегодня</h1>
        </div>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={() => go("reports")}>
            <ChartLineUp size={18} weight="bold" />
            Дашборд РОПа
          </button>
          <button className="primary-button" type="button" onClick={() => go("leads")}>
            Разобрать новые обращения
            <ArrowRight size={18} weight="bold" />
          </button>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <article className="stat-card" key={item.label}>
              <div className="stat-icon">
                <Icon size={20} weight="bold" />
              </div>
              <div>
                <div className="stat-value">{item.value}</div>
                <div className="stat-label">{item.label}</div>
                <div className="stat-delta">{item.delta}</div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="today-grid">
        <section className="plain-section">
          <div className="section-title">
            <h2>Приоритеты менеджеров</h2>
            <span>5 сотрудников</span>
          </div>
          <div className="task-stack">
            <ActionRow
              icon={ChatCircleText}
              title="3 новых обращения Авито"
              meta="По Maverick X3, Sea-Doo RXT-X и Defender MAX"
              tag="Нужно назначить"
              onClick={() => go("leads")}
            />
            <ActionRow
              icon={WarningCircle}
              title="Просрочен перезвон"
              meta="Дмитрий Кузнецов ждёт уточнение оплаты с НДС"
              tag="До 12:30"
              tone="danger"
              onClick={() => go("deal")}
            />
            <ActionRow
              icon={CurrencyRub}
              title="Ожидается оплата"
              meta="ООО Север, 2 единицы Defender MAX HD10"
              tag="8,84 млн ₽"
              onClick={() => go("deal")}
            />
            <ActionRow
              icon={HourglassHigh}
              title="Лист ожидания"
              meta="Появилось совпадение по Ski-Doo Expedition LE"
              tag="2 клиента"
              onClick={() => go("showroom")}
            />
          </div>
        </section>

        <aside className="side-rail">
          <div className="section-title compact">
            <h2>Короткая аналитика</h2>
            <span>Неделя</span>
          </div>
          <div className="analytics-list">
            <MetricBar label="Конверсия обращение → сделка" value="42%" width="42%" />
            <MetricBar label="Ответ в первые 15 минут" value="76%" width="76%" />
            <MetricBar label="Сделки без следующей задачи" value="2" width="22%" />
          </div>
          <div className="manager-strip">
            <ManagerLine name="Мария" role="7 сделок" value="11,6 млн ₽" />
            <ManagerLine name="Анна" role="5 сделок" value="6,4 млн ₽" />
            <ManagerLine name="Олег" role="4 сделки" value="4,1 млн ₽" />
          </div>
        </aside>
      </div>
    </section>
  );
}

function ReportsScreen() {
  const [period, setPeriod] = useState("month");
  const [reportTab, setReportTab] = useState("overview");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [customStart, setCustomStart] = useState("2026-09-01");
  const [customEnd, setCustomEnd] = useState("2026-09-15");
  const [sortConfig, setSortConfig] = useState({ key: "revenue", direction: "desc" });
  const [selectedManager, setSelectedManager] = useState(null);
  const profile = ropPeriodProfiles[period];
  const periodLabel = period === "custom" ? `${formatShortDate(customStart)} — ${formatShortDate(customEnd)}` : profile.label;

  const kpis = ropKpiDefinitions.map((metric) => ({ ...metric, value: getRopMetricValue(metric, profile) }));
  const scaledFunnel = ropFunnelStages.map((stage) => ({
    ...stage,
    scaledCount: scaleReportCount(stage.count, profile.factor),
    scaledAmount: stage.amount * profile.factor,
    scaledStale: stage.stale ? Math.max(1, Math.round(stage.stale * Math.max(profile.factor, 0.35))) : 0,
  }));
  const scaledManagers = ropManagerPerformance.map((manager) => scaleManagerReport(manager, profile.factor));
  const sortedManagers = [...scaledManagers].sort((a, b) => {
    const left = a[sortConfig.key];
    const right = b[sortConfig.key];
    const direction = sortConfig.direction === "asc" ? 1 : -1;
    return typeof left === "string" ? left.localeCompare(right, "ru") * direction : (left - right) * direction;
  });
  const marketingSources = reportPeriods.month.sources.map((source) => scaleMarketingSource(source, profile.factor));
  const visibleSources = sourceFilter === "all" ? marketingSources : marketingSources.filter((item) => item.source === sourceFilter);
  const topSource = [...marketingSources].sort((a, b) => parseFloat(b.conversion) - parseFloat(a.conversion))[0];

  const toggleSort = (key) => {
    setSortConfig((current) => ({ key, direction: current.key === key && current.direction === "desc" ? "asc" : "desc" }));
  };

  const tabs = [
    ["overview", "Обзор"],
    ["funnel", "Воронка"],
    ["managers", "Менеджеры"],
    ["activity", "Активность"],
    ["speed", "Скорость ответа"],
    ["attention", "Требуют внимания"],
    ["marketing", "Маркетинг"],
  ];

  return (
    <section className="screen screen-reports">
      <div className="page-heading report-heading">
        <div><div className="eyebrow">Управление отделом продаж</div><h1>Дашборд РОПа</h1><p>Ключевые результаты, риски и точки вмешательства</p></div>
        <div className="report-filter-bar">
          <label className="period-control">
            <CalendarCheck size={18} weight="bold" />
            <span>Период</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Период дашборда">
              <option value="today">Сегодня</option>
              <option value="yesterday">Вчера</option>
              <option value="week">Текущая неделя</option>
              <option value="month">Текущий месяц</option>
              <option value="previous">Предыдущий месяц</option>
              <option value="custom">Произвольный период</option>
            </select>
          </label>
          {period === "custom" ? (
            <div className="custom-period">
              <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} aria-label="Начало периода" />
              <span>—</span>
              <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} aria-label="Конец периода" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="report-tabs" role="tablist" aria-label="Разделы дашборда РОПа">
        {tabs.map(([id, label]) => (
          <button className={cx(reportTab === id && "active")} type="button" role="tab" aria-selected={reportTab === id} key={id} onClick={() => setReportTab(id)}>
            {label}
            {id === "attention" ? <span>{attentionItems.length}</span> : null}
          </button>
        ))}
      </div>

      {reportTab === "overview" ? <RopOverview kpis={kpis} profile={profile} periodLabel={periodLabel} topSource={topSource} /> : null}
      {reportTab === "funnel" ? <RopFunnel stages={scaledFunnel} periodLabel={periodLabel} /> : null}
      {reportTab === "managers" ? (
        <RopManagers
          managers={sortedManagers}
          periodLabel={periodLabel}
          sortConfig={sortConfig}
          onSort={toggleSort}
          selectedManager={selectedManager}
          setSelectedManager={setSelectedManager}
        />
      ) : null}
      {reportTab === "activity" ? <RopActivity managers={scaledManagers} periodLabel={periodLabel} /> : null}
      {reportTab === "speed" ? <RopSpeed profile={profile} periodLabel={periodLabel} /> : null}
      {reportTab === "attention" ? <RopAttention /> : null}
      {reportTab === "marketing" ? (
        <RopMarketing
          sources={marketingSources}
          visibleSources={visibleSources}
          topSource={topSource}
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          periodLabel={periodLabel}
        />
      ) : null}
    </section>
  );
}

function RopOverview({ kpis, profile, periodLabel, topSource }) {
  const heroKeys = ["newLeads", "unprocessed", "response", "units", "revenue", "grossProfit"];
  const hero = kpis.filter((metric) => heroKeys.includes(metric.key));
  const secondary = kpis.filter((metric) => !heroKeys.includes(metric.key));
  const forecast = kpis.find((metric) => metric.key === "forecast");
  const plan = kpis.find((metric) => metric.key === "plan");
  return (
    <>
      <div className="rop-hero-kpis">
        {hero.map((metric) => <RopKpiCard metric={metric} key={metric.key} hero />)}
      </div>
      <div className="rop-secondary-kpis">
        {secondary.map((metric) => <RopKpiCard metric={metric} key={metric.key} />)}
      </div>

      <div className="rop-overview-grid">
        <section className="report-panel forecast-panel">
          <div className="section-title"><div><h2>План и прогноз месяца</h2><p>Ожидаемые продажи с учётом активных сделок</p></div><span>{periodLabel}</span></div>
          <div className="forecast-values">
            <div><span>Выполнение плана</span><strong>{plan.value}</strong></div>
            <div><span>Прогноз выручки</span><strong>{forecast.value}</strong></div>
            <div><span>Потенциал активных сделок</span><strong>{formatMoney(31.7 * profile.factor)}</strong></div>
          </div>
          <div className="plan-track"><span style={{ width: `${Math.min(100, parseFloat(plan.value))}%` }} /></div>
          <div className="forecast-note"><ChartLineUp size={18} weight="bold" /><span>При текущей скорости отдел выйдет на <strong>108% плана</strong>. Основной резерв — 6 сделок на согласовании и предоплате.</span></div>
        </section>
        <section className="report-panel source-summary">
          <div className="section-title compact"><h2>Качество потока</h2><span>Решение</span></div>
          <div className="source-winner"><strong>{topSource.source}</strong><span>Лучший источник по конверсии и марже</span></div>
          <div className="pulse-row"><span>Конверсия</span><strong>{topSource.conversion}</strong></div>
          <div className="pulse-row"><span>Маржинальность</span><strong>{topSource.marginPercent}</strong></div>
          <div className="pulse-row"><span>Решение</span><strong>{topSource.recommendation}</strong></div>
        </section>
      </div>

      <section className="report-panel report-section">
        <div className="section-title"><div><h2>Техника: наличие и спрос</h2><p>Что продаём сейчас и где спрос выше остатка</p></div><span>Склад на сегодня</span></div>
        <div className="inventory-strip">
          {inventoryReport.map((item) => <div className={cx("inventory-item", item.tone)} key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.meta}</small></div>)}
        </div>
        <div className="demand-table-wrap">
          <table className="report-table demand-report-table">
            <thead><tr><th>Модель</th><th>Лиды</th><th>Сделки</th><th>В наличии</th><th>В резерве</th><th>Сигнал</th></tr></thead>
            <tbody>{demandReport.map((item) => <tr key={item.model}><td data-label="Модель"><strong>{item.model}</strong></td><td data-label="Лиды">{item.leads}</td><td data-label="Сделки">{item.deals}</td><td data-label="В наличии">{item.available}</td><td data-label="В резерве">{item.reserve}</td><td data-label="Сигнал"><span className={cx("demand-signal", item.available <= 2 && "risk")}>{item.available === 0 ? "Нет в наличии" : item.available <= 2 ? "Дефицит" : "Запас достаточен"}</span></td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="report-panel report-section">
        <div className="section-title"><div><h2>Почему теряем сделки</h2><p>Причины закрытия без продажи</p></div><span>{scaleReportCount(9, profile.factor)} потеряно</span></div>
        <div className="loss-reasons">
          {lossReasons.map((reason) => <div className="loss-row" key={reason.label}><div><strong>{reason.label}</strong><span>{scaleReportCount(reason.value, profile.factor)} сделок · {reason.share}%</span></div><div className="loss-track"><span style={{ width: `${reason.share}%` }} /></div></div>)}
        </div>
      </section>
    </>
  );
}

function RopKpiCard({ metric, hero }) {
  const Icon = metric.icon;
  const deltaGood = metric.favorable ? metric.delta.startsWith("−") : metric.delta.startsWith("+") || metric.key === "forecast";
  return (
    <article className={cx("rop-kpi", hero && "hero")}>
      <div className="rop-kpi-top"><div className="report-metric-icon"><Icon size={19} weight="bold" /></div><span className={cx("kpi-delta", deltaGood ? "good" : "risk")}>{metric.delta}</span></div>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      <small>к предыдущему периоду</small>
    </article>
  );
}

function RopFunnel({ stages, periodLabel }) {
  const first = stages[0].scaledCount;
  return (
    <section className="report-panel report-section">
      <div className="section-title"><div><h2>Воронка продаж</h2><p>Объём, сумма, конверсия и скорость прохождения этапов</p></div><span>{periodLabel}</span></div>
      <div className="full-funnel">
        {stages.map((stage, index) => {
          const previous = index === 0 ? stage.scaledCount : stages[index - 1].scaledCount;
          const stepConversion = stage.lost
            ? Math.round((stage.scaledCount / Math.max(first, 1)) * 100)
            : index === 0 ? 100 : Math.round((stage.scaledCount / Math.max(previous, 1)) * 100);
          const saleConversion = stage.lost ? 0 : Math.round((stages.find((item) => item.label === "Успешная продажа").scaledCount / Math.max(stage.scaledCount, 1)) * 100);
          return (
            <article className={cx("full-funnel-row", stage.scaledStale > 0 && "stale", stage.lost && "lost")} key={stage.label}>
              <div className="funnel-index">{index + 1}</div>
              <div className="funnel-name"><strong>{stage.label}</strong>{stage.scaledStale > 0 ? <span><WarningCircle size={14} weight="fill" /> {stage.scaledStale} дольше нормы</span> : <span>В пределах нормы</span>}</div>
              <div><small>Клиенты</small><strong>{stage.scaledCount}</strong></div>
              <div><small>Потенциал</small><strong>{formatMoney(stage.scaledAmount)}</strong></div>
              <div><small>{stage.lost ? "Доля всех лидов" : "С прошлого этапа"}</small><strong>{stepConversion}%</strong></div>
              <div><small>В продажу</small><strong>{saleConversion}%</strong></div>
              <div><small>Среднее время</small><strong>{stage.avg}</strong></div>
              <div className="funnel-volume"><span style={{ width: `${Math.max(8, (stage.scaledCount / Math.max(first, 1)) * 100)}%` }} /></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RopManagers({ managers, periodLabel, sortConfig, onSort, selectedManager, setSelectedManager }) {
  const detail = selectedManager ? managers.find((manager) => manager.name === selectedManager) : null;
  return (
    <>
      {detail ? <ManagerPerformanceDetail manager={detail} onClose={() => setSelectedManager(null)} /> : null}
      <section className="report-panel report-section">
        <div className="section-title"><div><h2>Эффективность менеджеров</h2><p>Нажмите на заголовок для сортировки, на ФИО — для подробного отчёта</p></div><span>{periodLabel}</span></div>
        <div className="report-table-wrap manager-wide-wrap">
          <table className="report-table manager-performance-table">
            <thead><tr><SortableHeader label="Менеджер" field="name" sortConfig={sortConfig} onSort={onSort} />{ropManagerColumns.map(([key, label]) => <SortableHeader label={label} field={key} sortConfig={sortConfig} onSort={onSort} key={key} />)}</tr></thead>
            <tbody>
              {managers.map((manager) => (
                <tr key={manager.name}>
                  <td data-label="Менеджер"><button className="manager-report-link" type="button" onClick={() => setSelectedManager(manager.name)}><span>{manager.initials}</span><strong>{manager.name}</strong></button></td>
                  {ropManagerColumns.map(([key, label]) => <td data-label={label} key={key}>{formatManagerValue(key, manager[key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function SortableHeader({ label, field, sortConfig, onSort }) {
  const active = sortConfig.key === field;
  return <th><button type="button" onClick={() => onSort(field)}>{label}<span>{active ? (sortConfig.direction === "desc" ? "↓" : "↑") : "↕"}</span></button></th>;
}

function ManagerPerformanceDetail({ manager, onClose }) {
  const diagnostics = manager.conversion >= 25
    ? { tone: "good", title: "Сильный результат", text: "Высокая конверсия поддерживается встречами, тест-драйвами и быстрым переходом к договору." }
    : manager.overdue >= 6
      ? { tone: "risk", title: "Нужна помощь РОПа", text: "Продажи ограничивают просроченные задачи, пропущенные звонки и клиенты без следующего действия." }
      : { tone: "warning", title: "Зона роста", text: "Активность достаточная, но теряется конверсия после встречи и отправки коммерческого предложения." };
  return (
    <section className="report-panel manager-detail-panel">
      <div className="manager-detail-head"><div className="manager-avatar">{manager.initials}</div><div><div className="eyebrow">Подробный отчёт</div><h2>{manager.name}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть подробный отчёт">×</button></div>
      <div className="manager-detail-metrics">
        <div><span>Продажи</span><strong>{manager.sales}</strong></div><div><span>Конверсия</span><strong>{manager.conversion}%</strong></div><div><span>Выручка</span><strong>{formatMoney(manager.revenue)}</strong></div><div><span>Валовая прибыль</span><strong>{formatMoney(manager.grossProfit)}</strong></div><div><span>План</span><strong>{manager.plan}%</strong></div><div><span>Прогноз</span><strong>{manager.forecast}%</strong></div>
      </div>
      <div className={cx("manager-diagnostic", diagnostics.tone)}><ChartLineUp size={20} weight="bold" /><div><strong>{diagnostics.title}</strong><span>{diagnostics.text}</span></div></div>
    </section>
  );
}

function RopActivity({ managers, periodLabel }) {
  return (
    <>
      <div className="report-callout"><GearSix size={21} weight="bold" /><div><strong>Активность — диагностический показатель</strong><span>Она объясняет результат, но не заменяет продажи, конверсию, выручку и валовую прибыль.</span></div></div>
      <div className="activity-grid">
        {managers.map((manager) => {
          const diagnosis = manager.sales <= 3 ? "Мало встреч и высокий хвост просроченных задач" : manager.conversion < 20 ? "Достаточно контактов, но слабая конверсия после КП" : "Активность поддерживает устойчивый результат";
          return (
            <article className="report-panel activity-card" key={manager.name}>
              <div className="activity-card-head"><div className="manager-avatar">{manager.initials}</div><div><h2>{manager.name}</h2><span>{periodLabel}</span></div></div>
              <div className="activity-metrics"><div><span>Входящие</span><strong>{manager.incoming}</strong></div><div><span>Исходящие</span><strong>{manager.outgoing}</strong></div><div><span>Успешные</span><strong>{manager.successful}</strong></div><div><span>Пропущено</span><strong>{manager.missed}</strong></div><div><span>Переписки</span><strong>{manager.chats}</strong></div><div><span>Сообщения</span><strong>{manager.messages}</strong></div><div><span>Встречи</span><strong>{manager.meetingsHeld}</strong></div><div><span>Тест-драйвы</span><strong>{manager.testDrives}</strong></div><div><span>КП</span><strong>{manager.proposals}</strong></div><div><span>Задачи просрочены</span><strong>{manager.overdue}</strong></div></div>
              <div className={cx("activity-diagnosis", manager.sales <= 3 ? "risk" : manager.conversion < 20 ? "warning" : "good")}><strong>Вывод РОПа</strong><span>{diagnosis}</span></div>
            </article>
          );
        })}
      </div>
    </>
  );
}

function RopSpeed({ profile, periodLabel }) {
  const rows = leadSpeedRows.map((row) => ({
    ...row,
    avg: row.group === "Отдел продаж" ? profile.response : Math.max(2, Math.round(row.avg * (profile.response / 11))),
    median: Math.max(1, Math.round(row.median * (profile.response / 11))),
    under5: scaleReportCount(row.under5, profile.factor), under15: scaleReportCount(row.under15, profile.factor), under30: scaleReportCount(row.under30, profile.factor), under60: scaleReportCount(row.under60, profile.factor), over60: scaleReportCount(row.over60, profile.factor), over120: scaleReportCount(row.over120, profile.factor), unanswered: scaleReportCount(row.unanswered, profile.factor),
  }));
  const department = rows[0];
  return (
    <>
      <div className="speed-summary">
        <div className="report-panel"><span>Среднее время ответа</span><strong>{department.avg} мин</strong><small>−3 мин к предыдущему периоду</small></div>
        <div className="report-panel"><span>Медианное время</span><strong>{department.median} мин</strong><small>половина лидов быстрее</small></div>
        <div className="report-panel"><span>Ответ до 15 минут</span><strong>{department.under15}</strong><small>{Math.round((department.under15 / Math.max(scaleReportCount(64, profile.factor), 1)) * 100)}% лидов</small></div>
        <div className="report-panel risk"><span>Без ответа</span><strong>{department.unanswered}</strong><small>требуют реакции сейчас</small></div>
      </div>
      <section className="report-panel report-section">
        <div className="section-title"><div><h2>Скорость обработки лидов</h2><p>По отделу, менеджерам и источникам</p></div><span>{periodLabel}</span></div>
        <div className="report-table-wrap"><table className="report-table speed-table"><thead><tr><th>Срез</th><th>Тип</th><th>Среднее</th><th>Медиана</th><th>&lt; 5 мин</th><th>&lt; 15 мин</th><th>&lt; 30 мин</th><th>&lt; 1 часа</th><th>&gt; 1 часа</th><th>&gt; 2 часов</th><th>Без ответа</th></tr></thead><tbody>{rows.map((row) => <tr className={row.unanswered > 0 ? "has-unanswered" : ""} key={row.group}><td data-label="Срез"><strong>{row.group}</strong></td><td data-label="Тип">{row.type}</td><td data-label="Среднее">{row.avg} мин</td><td data-label="Медиана">{row.median} мин</td><td data-label="До 5 мин">{row.under5}</td><td data-label="До 15 мин">{row.under15}</td><td data-label="До 30 мин">{row.under30}</td><td data-label="До 1 часа">{row.under60}</td><td data-label="Более 1 часа">{row.over60}</td><td data-label="Более 2 часов">{row.over120}</td><td data-label="Без ответа"><span className={row.unanswered ? "attention-count" : ""}>{row.unanswered}</span></td></tr>)}</tbody></table></div>
      </section>
      <section className="report-panel report-section"><div className="section-title"><div><h2>До сих пор не обработаны</h2><p>Критические лиды для немедленного контакта</p></div><span>2 лида</span></div><div className="unanswered-list">{attentionItems.filter((item) => item.type === "Без ответа" || item.type === "Пропущенный звонок").map((item) => <div key={item.client}><WarningCircle size={18} weight="fill" /><div><strong>{item.client}</strong><span>{item.reason} · {item.manager}</span></div><small>{item.age}</small></div>)}</div></section>
    </>
  );
}

function RopAttention() {
  const high = attentionItems.filter((item) => item.severity === "high").length;
  return (
    <section className="report-panel report-section attention-report">
      <div className="section-title"><div><h2>Требуют внимания</h2><p>Клиенты и сделки, где РОПу нужно вмешаться</p></div><span>{high} критичных</span></div>
      <div className="attention-summary"><div><strong>{attentionItems.length}</strong><span>всего сигналов</span></div><div><strong>{high}</strong><span>критичных</span></div><div><strong>4</strong><span>без следующего действия</span></div><div><strong>11,8 млн ₽</strong><span>под риском</span></div></div>
      <div className="attention-list">{attentionItems.map((item) => <article className={cx("attention-row", item.severity)} key={`${item.type}-${item.client}`}><div className="attention-icon"><WarningCircle size={19} weight="fill" /></div><div><span className="attention-type">{item.type}</span><strong>{item.client}</strong><p>{item.reason}</p></div><div><small>Ответственный</small><strong>{item.manager}</strong></div><div><small>Без движения</small><strong>{item.age}</strong></div><span className="attention-action">{item.action}</span></article>)}</div>
    </section>
  );
}

function RopMarketing({ sources, visibleSources, topSource, sourceFilter, setSourceFilter, periodLabel }) {
  return (
    <section className="report-panel report-section marketing-report">
      <div className="section-title marketing-title"><div><h2>Маркетинг и источники лидов</h2><p>Качество трафика, сделки, маржа и решение по бюджету</p></div><label className="source-filter"><span>Источник трафика</span><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} aria-label="Источник трафика"><option value="all">Все источники</option>{sources.map((source) => <option key={source.source}>{source.source}</option>)}</select></label></div>
      <div className="budget-insight"><ChartLineUp size={21} weight="bold" /><div><strong>Куда направить бюджет</strong><span>{topSource.source} лидирует по конверсии ({topSource.conversion}) и маржинальности {topSource.marginPercent}. Второй приоритет — Лендинг BRP. Социальные сети требуют пересборки кампаний.</span></div></div>
      <div className="report-table-wrap"><table className="report-table marketing-table"><thead><tr><th>Источник</th><th>Период</th><th>Лиды</th><th>Открыто</th><th>Закрыто</th><th>Сумма сделок</th><th>Маржа</th><th>Маржинальность</th><th>Конверсия</th><th>Решение</th></tr></thead><tbody>{visibleSources.map((source) => <tr key={source.source}><td data-label="Источник"><strong>{source.source}</strong></td><td data-label="Период">{periodLabel}</td><td data-label="Лиды">{source.leads}</td><td data-label="Открыто">{source.open}</td><td data-label="Закрыто">{source.closed}</td><td data-label="Сумма сделок">{source.amount}</td><td data-label="Маржа">{source.margin}</td><td data-label="Маржинальность">{source.marginPercent}</td><td data-label="Конверсия"><span className="conversion-value">{source.conversion}</span></td><td data-label="Решение"><span className={cx("budget-status", source.tone)}>{source.recommendation}</span></td></tr>)}</tbody></table></div>
    </section>
  );
}

function formatShortDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function scaleReportCount(value, factor) {
  if (!value) return 0;
  return Math.max(1, Math.round(value * factor));
}

function formatMoney(value) {
  return `${value.toLocaleString("ru-RU", { minimumFractionDigits: value < 10 ? 1 : 0, maximumFractionDigits: 1 })} млн ₽`;
}

function getRopMetricValue(metric, profile) {
  if (metric.key === "response") return `${profile.response} мин`;
  if (metric.kind === "count") return scaleReportCount(metric.base, profile.factor);
  if (metric.kind === "money") {
    const shouldScale = !["avgCheck", "forecast"].includes(metric.key);
    return formatMoney(shouldScale ? metric.base * profile.factor : metric.base);
  }
  if (metric.kind === "percent") {
    const adjusted = metric.key === "conversion" ? metric.base * (0.88 + profile.factor * 0.12) : metric.base * profile.deltaBias;
    return `${adjusted.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`;
  }
  return metric.base;
}

function scaleManagerReport(manager, factor) {
  const countKeys = ["newLeads", "processed", "incoming", "outgoing", "successful", "missed", "chats", "messages", "meetingsSet", "meetingsHeld", "testDrives", "proposals", "reservations", "contracts", "sales", "overdue", "lost"];
  const scaled = { ...manager };
  countKeys.forEach((key) => { scaled[key] = scaleReportCount(manager[key], factor); });
  scaled.revenue = manager.revenue * factor;
  scaled.grossProfit = manager.grossProfit * factor;
  return scaled;
}

function formatManagerValue(key, value) {
  if (["conversion", "plan", "forecast"].includes(key)) return <span className={key === "conversion" ? "conversion-value" : ""}>{value.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%</span>;
  if (["revenue", "grossProfit", "avgCheck"].includes(key)) return <strong>{formatMoney(value)}</strong>;
  return value;
}

function scaleMarketingSource(source, factor) {
  const amount = parseFloat(source.amount.replace(",", ".")) * factor;
  const margin = parseFloat(source.margin.replace(",", ".")) * factor;
  return { ...source, leads: scaleReportCount(source.leads, factor), open: scaleReportCount(source.open, factor), closed: scaleReportCount(source.closed, factor), amount: formatMoney(amount), margin: formatMoney(margin) };
}

function ShowroomScreen({ notify, waitAdded, setWaitAdded }) {
  return (
    <section className="screen screen-showroom">
      <div className="product-hero">
        <div className="product-main">
          <div className="crumbs">Шоурум / Багги / Can-Am</div>
          <div className="product-header">
            <div>
              <h1>Can-Am Maverick X3 X rs Turbo RR</h1>
              <p>2024, в наличии в Санкт-Петербурге, готов к продаже с полным пакетом документов.</p>
            </div>
            <div className="price-box">
              <span>Цена</span>
              <strong>5 950 000 ₽</strong>
            </div>
          </div>

          <div className="vehicle-stage">
            <img src="/assets/can-am-maverick-x3.png" alt="Can-Am Maverick X3 X rs Turbo RR" />
          </div>

          <div className="spec-row">
            <SpecItem label="Статус" value="В наличии" />
            <SpecItem label="Категория" value="Багги" />
            <SpecItem label="Комплектация" value="X rs Turbo RR" />
            <SpecItem label="Документы" value="Проверены" />
          </div>
        </div>

        <aside className="demand-panel">
          <div className="section-title compact">
            <h2>Спрос на модель</h2>
            <span>{waitAdded ? "5 клиентов" : "4 клиента"}</span>
          </div>
          <div className="demand-lead">
            <div>
              <strong>Дмитрий Кузнецов</strong>
              <span>Ждёт счёт с НДС, готов внести предоплату</span>
            </div>
            <button type="button" onClick={() => notify("Напоминание менеджеру Анне создано")}>
              <PhoneCall size={17} weight="bold" />
            </button>
          </div>
          <div className="wait-list">
            {waitlist.map((item) => (
              <div className="wait-item" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.target}</span>
                </div>
                <div>
                  <span>{item.date}</span>
                  <small>{item.priority}</small>
                </div>
              </div>
            ))}
            {waitAdded ? (
              <div className="wait-item added">
                <div>
                  <strong>Новый клиент</strong>
                  <span>Can-Am Maverick X3 X rs</span>
                </div>
                <div>
                  <span>22 сен</span>
                  <small>Новый</small>
                </div>
              </div>
            ) : null}
          </div>
          <button
            className="primary-button full"
            type="button"
            onClick={() => {
              setWaitAdded(true);
              notify("Клиент добавлен в лист ожидания по Maverick X3");
            }}
          >
            Добавить в лист ожидания
            <Plus size={18} weight="bold" />
          </button>
        </aside>
      </div>

      <div className="lower-grid">
        <section className="plain-section">
          <div className="section-title">
            <h2>Работа по технике</h2>
            <span>Операционные заметки</span>
          </div>
          <div className="detail-grid">
            <InfoTile icon={MapPin} label="Локация" value="Шоурум СПб, зона BRP" />
            <InfoTile icon={UserGear} label="Ответственный" value="Анна Волкова" />
            <InfoTile icon={CalendarCheck} label="Ближайшее действие" value="Связаться с Дмитрием до 12:30" />
          </div>
        </section>

        <section className="plain-section">
          <div className="section-title">
            <h2>История спроса</h2>
            <span>Последние события</span>
          </div>
          <div className="mini-timeline">
            <TimelineItem title="Новый лид с Авито" text="Система распознала объявление Maverick X3" />
            <TimelineItem title="Клиент добавлен в ожидание" text="ГК Полярный ждёт Ski-Doo Expedition" />
            <TimelineItem title="Резерв снят" text="Свободна 1 единица Can-Am ATV Outlander" />
          </div>
        </section>
      </div>
    </section>
  );
}

function LeadsScreen({ activeLead, filteredLeads, selectedLead, setSelectedLead, go, notify, updateLead }) {
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
              <img src="/assets/can-am-maverick-x3.png" alt="Миниатюра объявления Can-Am" />
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
  const [taskDate, setTaskDate] = useState("2026-09-24");
  const [customTasks, setCustomTasks] = useState([]);
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
              <InfoTile icon={UsersThree} label="Тип" value="Юридическое лицо" />
              <InfoTile icon={PhoneCall} label="Телефон" value="+7 812 707-40-66" />
              <InfoTile icon={MapPin} label="Регион доставки" value="Архангельск" />
              <InfoTile icon={ShieldCheck} label="Оплата" value="Безналичный расчёт с НДС" />
              <InfoTile icon={HourglassHigh} label="Ожидание" value="2 единицы Defender MAX" />
              <InfoTile icon={NotePencil} label="Комментарий" value="Для базы отдыха, важны документы" />
            </div>
          </section>
        )}

        {dealTab === "tasks" && (
          <section className="plain-section">
            <div className="section-title">
              <h2>Задачи и напоминания</h2>
              <span>3 активные</span>
            </div>
            <div className="task-stack">
              <ActionRow icon={CurrencyRub} title="Проверить оплату" meta="Сегодня, 16:00" tag="Оплата" />
              <ActionRow icon={PhoneCall} title="Вернуться к клиенту" meta="После проверки бухгалтерии" tag="Перезвон" />
              <ActionRow icon={CalendarCheck} title="Забронировать выдачу" meta="После поступления денег" tag="Выдача" />
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
  const [clientTaskDate, setClientTaskDate] = useState("2026-09-24");
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
        <img src="/assets/can-am-maverick-x3.png" alt="Can-Am Maverick X3" />
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
  const [draft, setDraft] = useState({ client: clients[0]?.displayName || "", product: "", vin: "", amount: "", paid: "", closeDate: "2026-10-15", virtual: false });
  const set = (field, value) => setDraft((item) => ({ ...item, [field]: value }));
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-card" onSubmit={(event) => { event.preventDefault(); onCreate(draft); }}>
        <div className="modal-head"><div><div className="eyebrow">Продажи</div><h2>Новая сделка</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть">×</button></div>
        <label className="editable-field wide"><span>Клиент</span><select value={draft.client} onChange={(event) => set("client", event.target.value)}>{clients.map((client) => <option key={client.id}>{client.displayName}</option>)}</select></label>
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
