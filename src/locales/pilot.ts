import type { GroupResources } from "./merge";

const texts = {
  ru: {
    title: "Чек-лист пилота", progress: "Пройдено {{count}} из 15", passed: "Пилот засчитан", blocks: ["Быстрый старт", "Онбординг", "Финансы"],
    result: "Результат теста, %", checkedBy: "Отметил(а)", automatic: "Автоматически", error: "Не удалось загрузить чек-лист", saveError: "Не удалось сохранить отметку", retry: "Повторить", loading: "Загрузка…", forbidden: "Снять отметку может только руководитель", noWorkspace: "Выберите пространство", open: "Открыть раздел", invalidResult: "Укажите результат от 0 до 100", manager: "Для руководителей",
    items: [
      ["Вход и пространство", "Пространство создано, логотип загружен"],
      ["Команда", "Коллеги приглашены, роли назначены"],
      ["Личный Telegram", "Бот привязан, пришла утренняя сводка"],
      ["Рабочая группа", "Бот в группе, привязан к проекту, создал задачу"],
      ["Первые задачи", "На доске, в AI-чате и в Telegram; одна прошла проверку → «Готово»"],
      ["Программа под реальную роль", "Программа онбординга создана для реальной роли"],
      ["Материалы, этапы и чек-листы", "Не менее 3 материалов и 2 этапов"],
      ["Тест", "Не менее 5 вопросов"],
      ["Назначено ≥2 сотрудникам", "Одна программа назначена не менее 2 сотрудникам"],
      ["Пройдено до конца", "Программа завершена; результат теста в процентах"],
      ["Данные подключены", "Данные не менее чем за 3 месяца"],
      ["Дашборд и ≥3 вопроса", "Дашборд построен, AI задано не менее 3 вопросов"],
      ["Цифры сверены с бухгалтерией", "Показатели проверены вместе с бухгалтерией"],
      ["Правила оплаты для ≥3 сотрудников", "Правила оплаты заданы не менее чем для 3 сотрудников"],
      ["Расчёт за месяц сверен с ведомостью", "Месячный расчёт оплаты сверён с ведомостью"],
    ],
  },
  en: {
    title: "Pilot checklist", progress: "Completed {{count}} of 15", passed: "Pilot passed", blocks: ["Quick start", "Onboarding", "Finance"],
    result: "Test result, %", checkedBy: "Checked by", automatic: "Automatic", error: "Could not load the checklist", saveError: "Could not save the check", retry: "Retry", loading: "Loading…", forbidden: "Only managers can uncheck items", noWorkspace: "Select a workspace", open: "Open section", invalidResult: "Enter a result from 0 to 100", manager: "Managers only",
    items: [
      ["Sign-in and workspace", "Workspace created, logo uploaded"], ["Team", "Colleagues invited, roles assigned"],
      ["Personal Telegram", "Bot linked, morning brief received"], ["Work group", "Bot in the group, linked to a project, created a task"],
      ["First tasks", "On the board, in AI chat and Telegram; one reviewed → Done"],
      ["Program for a real role", "An onboarding program created for a real role"], ["Materials, stages and checklists", "At least 3 materials and 2 stages"],
      ["Quiz", "At least 5 questions"], ["Assigned to ≥2 employees", "One program assigned to at least 2 employees"],
      ["Completed end to end", "Program completed; test result as a percentage"], ["Data connected", "At least 3 months of data"],
      ["Dashboard and ≥3 questions", "Dashboard built, at least 3 questions asked of AI"], ["Figures verified with accounting", "Metrics reviewed with accounting"],
      ["Pay rules for ≥3 employees", "Pay rules set for at least 3 employees"], ["Monthly calculation verified against payroll", "Monthly pay calculation checked against the payroll sheet"],
    ],
  },
  kk: {
    title: "Пилоттың тексеру тізімі", progress: "15 тармақтың {{count}}-і орындалды", passed: "Пилот есепке алынды", blocks: ["Жылдам бастау", "Онбординг", "Қаржы"],
    result: "Тест нәтижесі, %", checkedBy: "Белгілеген", automatic: "Автоматты", error: "Тізімді жүктеу мүмкін болмады", saveError: "Белгіні сақтау мүмкін болмады", retry: "Қайталау", loading: "Жүктелуде…", forbidden: "Белгіні тек басшы алып тастай алады", noWorkspace: "Жұмыс кеңістігін таңдаңыз", open: "Бөлімді ашу", invalidResult: "0 мен 100 арасындағы нәтижені енгізіңіз", manager: "Тек басшыларға",
    items: [
      ["Кіру және жұмыс кеңістігі", "Кеңістік құрылды, логотип жүктелді"], ["Команда", "Әріптестер шақырылды, рөлдер тағайындалды"],
      ["Жеке Telegram", "Бот байланыстырылды, таңғы қорытынды келді"], ["Жұмыс тобы", "Бот топта, жобаға байланыстырылды, тапсырма құрды"],
      ["Алғашқы тапсырмалар", "Тақтада, AI чатында және Telegram-да; біреуі тексерілді → «Дайын»"],
      ["Нақты рөлге арналған бағдарлама", "Нақты рөлге арналған онбординг бағдарламасы құрылды"], ["Материалдар, кезеңдер және тексеру тізімдері", "Кемінде 3 материал және 2 кезең"],
      ["Тест", "Кемінде 5 сұрақ"], ["≥2 қызметкерге тағайындалды", "Бір бағдарлама кемінде 2 қызметкерге тағайындалды"],
      ["Толық аяқталды", "Бағдарлама аяқталды; тест нәтижесі пайызбен"], ["Деректер қосылды", "Кемінде 3 айдың деректері"],
      ["Дашборд және ≥3 сұрақ", "Дашборд құрылды, AI-ға кемінде 3 сұрақ қойылды"], ["Сандар бухгалтериямен салыстырылды", "Көрсеткіштер бухгалтериямен тексерілді"],
      ["≥3 қызметкерге төлем ережелері", "Кемінде 3 қызметкерге төлем ережелері белгіленді"], ["Айлық есеп ведомостьпен салыстырылды", "Айлық төлем есебі ведомостьпен тексерілді"],
    ],
  },
  ky: {
    title: "Пилоттун текшерүү тизмеси", progress: "15 пункттун {{count}} аткарылды", passed: "Пилот эсепке алынды", blocks: ["Тез баштоо", "Онбординг", "Каржы"],
    result: "Тесттин жыйынтыгы, %", checkedBy: "Белгилеген", automatic: "Автоматтык", error: "Тизмени жүктөө мүмкүн болгон жок", saveError: "Белгини сактоо мүмкүн болгон жок", retry: "Кайталоо", loading: "Жүктөлүүдө…", forbidden: "Белгини жетекчи гана алып сала алат", noWorkspace: "Жумуш мейкиндигин тандаңыз", open: "Бөлүмдү ачуу", invalidResult: "0дөн 100гө чейинки жыйынтыкты киргизиңиз", manager: "Жетекчилер үчүн гана",
    items: [
      ["Кирүү жана жумуш мейкиндиги", "Мейкиндик түзүлдү, логотип жүктөлдү"], ["Команда", "Кесиптештер чакырылды, ролдор дайындалды"],
      ["Жеке Telegram", "Бот байланыштырылды, эртең мененки жыйынтык келди"], ["Жумуш тобу", "Бот топто, долбоорго байланыштырылды, тапшырма түздү"],
      ["Алгачкы тапшырмалар", "Тактада, AI чатында жана Telegram-да; бири текшерилди → «Даяр»"],
      ["Чыныгы роль үчүн программа", "Чыныгы роль үчүн онбординг программасы түзүлдү"], ["Материалдар, этаптар жана текшерүү тизмелери", "Кеминде 3 материал жана 2 этап"],
      ["Тест", "Кеминде 5 суроо"], ["≥2 кызматкерге дайындалды", "Бир программа кеминде 2 кызматкерге дайындалды"],
      ["Аягына чейин өтүлдү", "Программа аяктады; тесттин жыйынтыгы пайыз менен"], ["Маалыматтар туташтырылды", "Кеминде 3 айдын маалыматы"],
      ["Дашборд жана ≥3 суроо", "Дашборд түзүлдү, AI-га кеминде 3 суроо берилди"], ["Сандар бухгалтерия менен салыштырылды", "Көрсөткүчтөр бухгалтерия менен текшерилди"],
      ["≥3 кызматкер үчүн төлөм эрежелери", "Кеминде 3 кызматкерге төлөм эрежелери коюлду"], ["Айлык эсеп ведомость менен салыштырылды", "Айлык төлөмдүн эсеби ведомость менен текшерилди"],
    ],
  },
  uz: {
    title: "Pilot tekshiruv ro‘yxati", progress: "15 banddan {{count}} tasi bajarildi", passed: "Pilot hisobga olindi", blocks: ["Tez boshlash", "Onboarding", "Moliya"],
    result: "Test natijasi, %", checkedBy: "Belgilagan", automatic: "Avtomatik", error: "Ro‘yxatni yuklab bo‘lmadi", saveError: "Belgini saqlab bo‘lmadi", retry: "Qayta urinish", loading: "Yuklanmoqda…", forbidden: "Belgini faqat rahbar bekor qilishi mumkin", noWorkspace: "Ish maydonini tanlang", open: "Bo‘limni ochish", invalidResult: "0 dan 100 gacha natija kiriting", manager: "Faqat rahbarlar uchun",
    items: [
      ["Kirish va ish maydoni", "Ish maydoni yaratildi, logotip yuklandi"], ["Jamoa", "Hamkasblar taklif qilindi, rollar tayinlandi"],
      ["Shaxsiy Telegram", "Bot ulandi, ertalabki xulosa keldi"], ["Ishchi guruh", "Bot guruhda, loyihaga ulandi, vazifa yaratdi"],
      ["Birinchi vazifalar", "Doskada, AI chatida va Telegram’da; bittasi tekshirildi → «Tayyor»"],
      ["Haqiqiy rol uchun dastur", "Haqiqiy rol uchun onboarding dasturi yaratildi"], ["Materiallar, bosqichlar va tekshiruv ro‘yxatlari", "Kamida 3 material va 2 bosqich"],
      ["Test", "Kamida 5 savol"], ["≥2 xodimga tayinlandi", "Bitta dastur kamida 2 xodimga tayinlandi"],
      ["Oxirigacha o‘tildi", "Dastur yakunlandi; test natijasi foizda"], ["Ma’lumotlar ulandi", "Kamida 3 oylik ma’lumotlar"],
      ["Dashboard va ≥3 savol", "Dashboard qurildi, AI’ga kamida 3 savol berildi"], ["Raqamlar buxgalteriya bilan tekshirildi", "Ko‘rsatkichlar buxgalteriya bilan solishtirildi"],
      ["≥3 xodim uchun to‘lov qoidalari", "Kamida 3 xodimga to‘lov qoidalari belgilandi"], ["Oylik hisob qaydnoma bilan tekshirildi", "Oylik to‘lov hisobi qaydnoma bilan solishtirildi"],
    ],
  },
  tg: {
    title: "Рӯйхати санҷиши пилот", progress: "Аз 15 банд {{count}} иҷро шуд", passed: "Пилот қабул шуд", blocks: ["Оғози зуд", "Онбординг", "Молия"],
    result: "Натиҷаи тест, %", checkedBy: "Қайд кард", automatic: "Худкор", error: "Рӯйхат бор нашуд", saveError: "Қайд захира нашуд", retry: "Такрор кардан", loading: "Бор шуда истодааст…", forbidden: "Танҳо роҳбар метавонад қайдро бекор кунад", noWorkspace: "Фазои кориро интихоб кунед", open: "Кушодани бахш", invalidResult: "Натиҷаро аз 0 то 100 ворид кунед", manager: "Танҳо барои роҳбарон",
    items: [
      ["Воридшавӣ ва фазои корӣ", "Фазо сохта шуд, логотип бор шуд"], ["Даста", "Ҳамкорон даъват шуданд, нақшҳо таъин шуданд"],
      ["Telegram-и шахсӣ", "Бот пайваст шуд, ҷамъбасти саҳарӣ омад"], ["Гурӯҳи корӣ", "Бот дар гурӯҳ, ба лоиҳа пайваст шуд, вазифа сохт"],
      ["Вазифаҳои аввал", "Дар тахта, чати AI ва Telegram; яке санҷида шуд → «Омода»"],
      ["Барнома барои нақши воқеӣ", "Барномаи онбординг барои нақши воқеӣ сохта шуд"], ["Мавод, марҳилаҳо ва рӯйхатҳои санҷиш", "На кам аз 3 мавод ва 2 марҳила"],
      ["Тест", "На кам аз 5 савол"], ["Ба ≥2 корманд таъин шуд", "Як барнома ба на кам аз 2 корманд таъин шуд"],
      ["То охир гузашт", "Барнома анҷом ёфт; натиҷаи тест бо фоиз"], ["Маълумот пайваст шуд", "Маълумоти на кам аз 3 моҳ"],
      ["Дашборд ва ≥3 савол", "Дашборд сохта шуд, ба AI на кам аз 3 савол дода шуд"], ["Рақамҳо бо муҳосибӣ санҷида шуданд", "Нишондиҳандаҳо бо муҳосибӣ муқоиса шуданд"],
      ["Қоидаҳои пардохт барои ≥3 корманд", "Барои на кам аз 3 корманд қоидаҳои пардохт муқаррар шуданд"], ["Ҳисоби моҳона бо ведомост санҷида шуд", "Ҳисоби пардохти моҳона бо ведомост муқоиса шуд"],
    ],
  },
};

const resources: GroupResources = {};
for (const [language, text] of Object.entries(texts)) {
  resources[language] = {
    app: { nav: { pilot: text.title } },
    pilot: { ...text, blocks: { start: text.blocks[0], onboarding: text.blocks[1], finance: text.blocks[2] },
      items: Object.fromEntries(text.items.map(([title, hint], i) => [i + 1, { title, hint }])) },
  };
}
export default resources;
