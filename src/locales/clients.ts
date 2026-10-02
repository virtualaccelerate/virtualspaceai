import type { GroupResources } from "./merge";

const en = {
  title: "Client Database", description: "Clients from Task Tracker tasks are collected automatically and deduplicated by phone number.",
  columns: { name: "Name", phone: "Phone", email: "Email", company: "Company", status: "Status", notes: "Notes", tasks: "Tasks" },
  sheet: "Google Sheet", sync: "Sync", createSheet: "Create Google Sheet", scan: "Find clients in tasks", addRow: "Add row",
  sheetUpdated: "Sheet updated", setupDone: "Google Sheet and guide created", scanDone: "Tasks with contacts: {{contacts}}, clients changed: {{changed}}",
  driveHint: "Connect Google Drive to create a Google Sheet —", integrations: "Integrations", knowledgeHint: "The link and the “Client Database” guide will appear in Knowledge Base.",
  search: "Search by name, phone, company…", count: "{{shown}} of {{total}}", synced: "Sheet synced: {{date}}",
  empty: "No clients yet. Add a row or click “Find clients in tasks”.", newClient: "New client", deleteClient: "Delete client", deleteConfirm: "Delete “{{name}}”?",
};

const ru = {
  title: "База клиентов", description: "Клиенты из задач Task Tracker собираются автоматически, без дубликатов по телефону.",
  columns: { name: "Имя", phone: "Телефон", email: "Email", company: "Компания", status: "Статус", notes: "Заметки", tasks: "Задачи" },
  sheet: "Google Таблица", sync: "Синхронизировать", createSheet: "Создать Google Таблицу", scan: "Найти клиентов в задачах", addRow: "Добавить строку",
  sheetUpdated: "Таблица обновлена", setupDone: "Google Таблица и методичка созданы", scanDone: "Задач с контактами: {{contacts}}, изменено клиентов: {{changed}}",
  driveHint: "Для Google Таблицы нужен подключённый Google Drive —", integrations: "Интеграции", knowledgeHint: "Ссылка и методичка «База клиентов» появятся в Базе знаний.",
  search: "Поиск по имени, телефону, компании…", count: "{{shown}} из {{total}}", synced: "Синхр. с таблицей: {{date}}",
  empty: "Клиентов пока нет. Добавьте строку или нажмите «Найти клиентов в задачах».", newClient: "Новый клиент", deleteClient: "Удалить клиента", deleteConfirm: "Удалить «{{name}}»?",
};

const kk = {
  title: "Клиенттер базасы", description: "Task Tracker тапсырмаларындағы клиенттер автоматты түрде жиналып, телефон бойынша қайталанбайды.",
  columns: { name: "Аты", phone: "Телефон", email: "Email", company: "Компания", status: "Күйі", notes: "Ескертпелер", tasks: "Тапсырмалар" },
  sheet: "Google кестесі", sync: "Синхрондау", createSheet: "Google кестесін құру", scan: "Тапсырмалардан клиенттерді табу", addRow: "Жол қосу",
  sheetUpdated: "Кесте жаңартылды", setupDone: "Google кестесі мен нұсқаулық құрылды", scanDone: "Контактілері бар тапсырмалар: {{contacts}}, өзгерген клиенттер: {{changed}}",
  driveHint: "Google кестесі үшін Google Drive қосыңыз —", integrations: "Интеграциялар", knowledgeHint: "Сілтеме мен «Клиенттер базасы» нұсқаулығы Білім базасында пайда болады.",
  search: "Аты, телефоны, компаниясы бойынша іздеу…", count: "{{shown}} / {{total}}", synced: "Кестемен синхрондалды: {{date}}",
  empty: "Әзірге клиенттер жоқ. Жол қосыңыз немесе «Тапсырмалардан клиенттерді табу» түймесін басыңыз.", newClient: "Жаңа клиент", deleteClient: "Клиентті жою", deleteConfirm: "«{{name}}» жойылсын ба?",
};

const ky = {
  title: "Кардарлар базасы", description: "Task Tracker тапшырмаларындагы кардарлар автоматтык түрдө чогултулуп, телефон боюнча кайталанбайт.",
  columns: { name: "Аты", phone: "Телефон", email: "Email", company: "Компания", status: "Статус", notes: "Эскертмелер", tasks: "Тапшырмалар" },
  sheet: "Google жадыбалы", sync: "Шайкештештирүү", createSheet: "Google жадыбалын түзүү", scan: "Тапшырмалардан кардарларды табуу", addRow: "Сап кошуу",
  sheetUpdated: "Жадыбал жаңыртылды", setupDone: "Google жадыбалы жана нускама түзүлдү", scanDone: "Байланышы бар тапшырмалар: {{contacts}}, өзгөргөн кардарлар: {{changed}}",
  driveHint: "Google жадыбалы үчүн Google Drive туташтырыңыз —", integrations: "Интеграциялар", knowledgeHint: "Шилтеме жана «Кардарлар базасы» нускамасы Билим базасында пайда болот.",
  search: "Аты, телефону, компаниясы боюнча издөө…", count: "{{shown}} / {{total}}", synced: "Жадыбал менен шайкештешти: {{date}}",
  empty: "Азырынча кардарлар жок. Сап кошуңуз же «Тапшырмалардан кардарларды табуу» баскычын басыңыз.", newClient: "Жаңы кардар", deleteClient: "Кардарды өчүрүү", deleteConfirm: "«{{name}}» өчүрүлсүнбү?",
};

const uz = {
  title: "Mijozlar bazasi", description: "Task Tracker vazifalaridagi mijozlar avtomatik yig‘iladi va telefon bo‘yicha takrorlanmaydi.",
  columns: { name: "Ism", phone: "Telefon", email: "Email", company: "Kompaniya", status: "Holat", notes: "Izohlar", tasks: "Vazifalar" },
  sheet: "Google jadvali", sync: "Sinxronlash", createSheet: "Google jadvalini yaratish", scan: "Vazifalardan mijozlarni topish", addRow: "Qator qo‘shish",
  sheetUpdated: "Jadval yangilandi", setupDone: "Google jadvali va qo‘llanma yaratildi", scanDone: "Kontaktli vazifalar: {{contacts}}, o‘zgargan mijozlar: {{changed}}",
  driveHint: "Google jadvali uchun Google Drive’ni ulang —", integrations: "Integratsiyalar", knowledgeHint: "Havola va “Mijozlar bazasi” qo‘llanmasi Bilimlar bazasida paydo bo‘ladi.",
  search: "Ism, telefon, kompaniya bo‘yicha qidirish…", count: "{{shown}} / {{total}}", synced: "Jadval bilan sinxronlandi: {{date}}",
  empty: "Hozircha mijozlar yo‘q. Qator qo‘shing yoki “Vazifalardan mijozlarni topish” tugmasini bosing.", newClient: "Yangi mijoz", deleteClient: "Mijozni o‘chirish", deleteConfirm: "“{{name}}” o‘chirilsinmi?",
};

const tg = {
  title: "Пойгоҳи муштариён", description: "Муштариён аз вазифаҳои Task Tracker худкор ҷамъ шуда, аз рӯи телефон такрор намешаванд.",
  columns: { name: "Ном", phone: "Телефон", email: "Email", company: "Ширкат", status: "Ҳолат", notes: "Ёддоштҳо", tasks: "Вазифаҳо" },
  sheet: "Ҷадвали Google", sync: "Ҳамоҳангсозӣ", createSheet: "Сохтани ҷадвали Google", scan: "Ёфтани муштариён дар вазифаҳо", addRow: "Иловаи сатр",
  sheetUpdated: "Ҷадвал нав шуд", setupDone: "Ҷадвали Google ва дастур сохта шуданд", scanDone: "Вазифаҳои дорои тамос: {{contacts}}, муштариёни тағйирёфта: {{changed}}",
  driveHint: "Барои ҷадвали Google, Google Drive-ро пайваст кунед —", integrations: "Ҳамгироиҳо", knowledgeHint: "Пайванд ва дастури «Пойгоҳи муштариён» дар Пойгоҳи дониш пайдо мешаванд.",
  search: "Ҷустуҷӯ аз рӯи ном, телефон, ширкат…", count: "{{shown}} аз {{total}}", synced: "Бо ҷадвал ҳамоҳанг шуд: {{date}}",
  empty: "Ҳоло муштарӣ нест. Сатр илова кунед ё «Ёфтани муштариён дар вазифаҳо»-ро пахш кунед.", newClient: "Муштарии нав", deleteClient: "Ҳазфи муштарӣ", deleteConfirm: "«{{name}}» ҳазф шавад?",
};

const bundle: GroupResources = { en: { clientsUi: en }, ru: { clientsUi: ru }, kk: { clientsUi: kk }, ky: { clientsUi: ky }, uz: { clientsUi: uz }, tg: { clientsUi: tg } };
export default bundle;