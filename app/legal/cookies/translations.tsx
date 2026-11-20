// Kazakh and English versions of the cookie policy. The Russian text in page.tsx prevails; keep the same
// sections, rows and list items (scripts/test-legal.mjs compares the structure). Kazakh needs a native speaker's
// and a lawyer's review.
import Link from 'next/link';
import LegalPage, { DataTable } from '@/components/LegalPage';

export function CookiesKk() {
  return (
    <LegalPage lang="kk" title="Cookie және жергілікті сақтау саясаты">
      <h2>1. Бұл не</h2>
      <p>
        Cookie — сайт браузерде сақтайтын шағын файлдар. Жергілікті қойма осыған ұқсас жұмыс істейді, бірақ
        деректер серверге өздігінен жіберілмейді. Төменде Qoldan пайдаланатынның бәрі көрсетілген.
      </p>

      <h2>2. Qoldan браузеріңізде не сақтайды</h2>
      <DataTable
        head={['Кілт', 'Не үшін', 'Мерзімі']}
        rows={[
          ['qoldan-ui-language-v1', 'Таңдалған интерфейс тілі', 'Сайт деректерін тазартқанша'],
          ['qoldan-lang (cookie)', 'Хабарландыру беттері сол тілде ашылуы үшін сол таңдалған тіл (ru, kk немесе en). Басқа ештеңе жоқ', '1 жыл'],
          ['qoldan-recent-views-v1', 'Жақында қаралған хабарландырулар мен өтінімдер тізімі; тек браузеріңізде қалады және интерфейстегі батырмамен тазартылады', 'Тазартқанша'],
          ['qoldan-listing-draft-v1, qoldan-request-draft-v1', 'Енгізілгенді жоғалтпау үшін форма жобалары', 'Жарияланғанша немесе тазартқанша'],
          ['qoldan-compare-v1', 'Салыстыруға таңдалған хабарландырулар тізімі (3-ке дейін)', 'Сайт деректерін тазартқанша'],
          ['qoldan-housing-filters-v1', 'Хабарландырудан оралғанда қалпына келмеуі үшін баспана іздеу сүзгілері мен беті (қойынды қоймасы)', 'Қойынды жабылғанша'],
          ['qoldan-cookie-notice-v1', 'Осы саясат туралы хабарламаны көргеніңізді есте сақтайды', 'Сайт деректерін тазартқанша'],
        ]}
      />
      <p>
        Бұл қажетті қойма: ол интерфейстің жұмысына керек және жарнама немесе бақылау үшін пайдаланылмайды.
        Qoldan-ның өз cookie-і біреу — таңдалған тіл коды бар qoldan-lang; онда жеке деректер жоқ. ChatGPT
        арқылы кіру сервисі мен хостинг-платформа авторизация және қауіпсіздік үшін техникалық cookie
        пайдалануы мүмкін; оларсыз кіру мүмкін емес.
      </p>

      <h2>3. Не жоқ</h2>
      <p>
        Qoldan-да жарнамалық, аналитикалық, бақылау және әлеуметтік cookie мен пиксельдер жоқ. Сондықтан біз
        санаттарды таңдауды сұрамай, ақпараттық хабарлама көрсетеміз: таңдайтын ештеңе жоқ.
      </p>

      <h2>4. Сыртқы ресурстар</h2>
      <ul>
        <li>
          <b>OpenStreetMap.</b> Картаны ашқанда браузер tile.openstreetmap.org-тан тайлдарды сұрайды; сервер
          IP-мекенжайыңызды және сұрау параметрлерін көреді.
        </li>
        <li>Қаріптер мен көрсетілім суреттері сайттың өзінде орналасқан және сыртқы серверлерден жүктелмейді.</li>
      </ul>

      <h2>5. Қалай басқаруға болады</h2>
      <p>
        Сақталғанды браузер баптауларынан («сайт деректері») тазартуға болады. Қойманы бұғаттасаңыз, интерфейс
        жұмысын жалғастырады, бірақ тіл мен жобалар сақталмайды, ал кіру орындалмауы мүмкін.
      </p>

      <h2>6. Өзгерістер</h2>
      <p>
        Жаңа cookie немесе сервистер пайда болса, біз осы бетті жаңартамыз және қажет болса, келісіміңізді
        сұраймыз. Деректер туралы толығырақ — <Link href="/legal/privacy">деректерді қорғау саясатында</Link>.
      </p>
    </LegalPage>
  );
}

export function CookiesEn() {
  return (
    <LegalPage lang="en" title="Cookie and Local Storage Policy">
      <h2>1. What this is</h2>
      <p>
        Cookies are small files a website stores in the browser. Local storage works similarly, but its data is not
        sent to the server by itself. Everything Qoldan uses is listed below.
      </p>

      <h2>2. What Qoldan stores in your browser</h2>
      <DataTable
        head={['Key', 'Purpose', 'Period']}
        rows={[
          ['qoldan-ui-language-v1', 'The chosen interface language', 'Until you clear site data'],
          ['qoldan-lang (cookie)', 'The same chosen language (ru, kk or en), so listing pages open in it. Contains nothing else', '1 year'],
          ['qoldan-recent-views-v1', 'List of recently viewed listings and requests; stays only in your browser and is cleared with a button in the interface', 'Until you clear it'],
          ['qoldan-listing-draft-v1, qoldan-request-draft-v1', 'Form drafts, so what you typed is not lost', 'Until publication or until you clear them'],
          ['qoldan-compare-v1', 'List of listings selected for comparison (up to 3)', 'Until you clear site data'],
          ['qoldan-housing-filters-v1', 'Filters and page of the stays search, so they are not reset when you return from a listing (tab storage)', 'Until the tab is closed'],
          ['qoldan-cookie-notice-v1', 'Remembers that you have seen the notice about this policy', 'Until you clear site data'],
        ]}
      />
      <p>
        This is necessary storage: it is needed for the interface to work and is not used for advertising or
        tracking. Qoldan has a single cookie of its own — qoldan-lang with the chosen language code; it contains no
        personal data. The ChatGPT sign-in service and the hosting platform may use technical cookies for
        authorisation and security; sign-in is impossible without them.
      </p>

      <h2>3. What there is not</h2>
      <p>
        Qoldan has no advertising, analytics, tracking or social cookies and pixels. That is why we show an
        information notice instead of asking you to choose categories: there is nothing to choose.
      </p>

      <h2>4. External resources</h2>
      <ul>
        <li>
          <b>OpenStreetMap.</b> When you open a map, the browser requests tiles from tile.openstreetmap.org; the
          server sees your IP address and the request parameters.
        </li>
        <li>Fonts and demo images are hosted on the website itself and are not loaded from external servers.</li>
      </ul>

      <h2>5. How to manage it</h2>
      <p>
        You can clear stored data in your browser settings (“site data”). If you block storage, the interface keeps
        working, but the language and drafts are not saved and sign-in may fail.
      </p>

      <h2>6. Changes</h2>
      <p>
        If new cookies or services appear, we will update this page and ask for your consent if required. More
        about data — in the <Link href="/legal/privacy">data protection policy</Link>.
      </p>
    </LegalPage>
  );
}
