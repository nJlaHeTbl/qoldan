// Texts of the server-rendered request page (/request/[id]) in RU/KK/EN. Kazakh texts need a native speaker's review.
import type { Lang } from '@/lib/ui-copy';

type Kind = 'agro' | 'rent' | 'build' | 'recycle';

type Copy = {
  missingTitle: string;
  missingText: string;
  missingLink: string;
  allRequests: string;
  eyebrow: string;
  kinds: Record<Kind, string>;
  responses: (count: number) => string;
  directionNote: string;
  requestNo: (id: string) => string;
  budget: string;
  published: string;
  customer: string;
  respond: string;
  others: string;
  safety: string;
  locale: string;
};

const ruResponses = (count: number) => {
  const mod100 = count % 100;
  const mod10 = count % 10;
  const word =
    mod100 >= 11 && mod100 <= 14 ? 'откликов' : mod10 === 1 ? 'отклик' : mod10 >= 2 && mod10 <= 4 ? 'отклика' : 'откликов';
  return `${count} ${word}`;
};

const COPIES: Record<Lang, Copy> = {
  ru: {
    missingTitle: 'Заявка больше недоступна',
    missingText: 'Возможно, заказчик уже выбрал исполнителя, закрыл заявку или она была снята с публикации.',
    missingLink: 'Смотреть актуальные заявки',
    allRequests: 'Все заявки',
    eyebrow: 'МНЕ НУЖНО',
    kinds: { agro: 'Сельхозработы', rent: 'Аренда оборудования', build: 'Стройка и материалы', recycle: 'Вторсырьё' },
    responses: ruResponses,
    directionNote: 'Исполнители предлагают цену сами. Qoldan не принимает оплату и не удерживает комиссию за отклик.',
    requestNo: (id) => `ЗАЯВКА #${id}`,
    budget: 'Бюджет',
    published: 'Опубликовано',
    customer: 'Заказчик на Qoldan',
    respond: 'Откликнуться в Qoldan',
    others: 'Посмотреть другие заявки',
    safety: 'До начала работы уточните объём, сроки, итоговую цену и условия выезда. Не переводите предоплату незнакомому человеку без проверки.',
    locale: 'ru-RU',
  },
  kk: {
    missingTitle: 'Өтінім енді қолжетімсіз',
    missingText: 'Тапсырыс беруші орындаушыны таңдап қойған, өтінімді жапқан немесе ол жариялаудан алынған болуы мүмкін.',
    missingLink: 'Өзекті өтінімдерді көру',
    allRequests: 'Барлық өтінім',
    eyebrow: 'МАҒАН КЕРЕК',
    kinds: { agro: 'Ауыл шаруашылық жұмыстары', rent: 'Жабдықты жалға алу', build: 'Құрылыс және материалдар', recycle: 'Қайталама шикізат' },
    responses: (count) => `${count} жауап`,
    directionNote: 'Орындаушылар бағаны өздері ұсынады. Qoldan төлем қабылдамайды және жауап үшін комиссия алмайды.',
    requestNo: (id) => `ӨТІНІМ #${id}`,
    budget: 'Бюджет',
    published: 'Жарияланды',
    customer: 'Qoldan-дағы тапсырыс беруші',
    respond: 'Qoldan-да жауап беру',
    others: 'Басқа өтінімдерді көру',
    safety: 'Жұмысты бастамас бұрын көлемін, мерзімін, соңғы бағасын және бару шарттарын нақтылаңыз. Бейтаныс адамға тексермей алдын ала төлем аудармаңыз.',
    locale: 'kk-KZ',
  },
  en: {
    missingTitle: 'This request is no longer available',
    missingText: 'The customer may have chosen a provider, closed the request, or it was removed.',
    missingLink: 'See current requests',
    allRequests: 'All requests',
    eyebrow: 'WANTED',
    kinds: { agro: 'Farm work', rent: 'Equipment rental', build: 'Construction and materials', recycle: 'Recyclables' },
    responses: (count) => `${count} ${count === 1 ? 'response' : 'responses'}`,
    directionNote: 'Providers name their own price. Qoldan does not take payments or charge a fee for responding.',
    requestNo: (id) => `REQUEST #${id}`,
    budget: 'Budget',
    published: 'Published',
    customer: 'Customer on Qoldan',
    respond: 'Respond in Qoldan',
    others: 'See other requests',
    safety: 'Before starting, agree on the scope, timing, final price and travel terms. Do not send a prepayment to a stranger without checking.',
    locale: 'en-US',
  },
};

export const requestPageCopy = (lang: Lang) => COPIES[lang];
