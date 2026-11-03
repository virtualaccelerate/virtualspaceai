import type { GroupResources } from "./merge";
const w = (captchaFailed: string) => ({ shellUi: { auth: { captchaFailed } } });
export default {
  ru: w("Не удалось проверить, что вы не бот. Обновите страницу"),
  en: w("We couldn't verify that you're not a bot. Please refresh the page"),
  ky: w("Сиздин бот эмес экениңизди текшерүү мүмкүн болбоду. Баракты жаңыртыңыз"),
  kk: w("Сіздің бот емес екеніңізді тексеру мүмкін болмады. Бетті жаңартыңыз"),
  uz: w("Bot emasligingizni tekshirib bo'lmadi. Sahifani yangilang"),
  tg: w("Санҷидани он, ки шумо бот нестед, имконнопазир шуд. Саҳифаро нав кунед"),
} satisfies GroupResources;
