// Kazakh and English versions of the privacy policy. The Russian text in page.tsx prevails; keep the same
// sections, rows and list items (scripts/test-legal.mjs compares the structure). Kazakh needs a native speaker's
// and a lawyer's review.
import Link from 'next/link';
import LegalPage, { DataTable, Op } from '@/components/LegalPage';

export function PrivacyKk() {
  return (
    <LegalPage lang="kk" title="Дербес деректерді қорғау саясаты">
      <h2>1. Жалпы ережелер</h2>
      <p>
        Бұл саясат Qoldan сайты (бұдан әрі — Qoldan) қандай дербес деректерді өңдейтінін, бұл не үшін
        қажет екенін, деректер қалай қорғалатынын және сізде қандай құқықтар бар екенін түсіндіреді. Ол
        Қазақстан Республикасының дербес деректер және оларды қорғау туралы заңнамасына сәйкес жасалған.
      </p>
      <p>
        Дербес деректер операторы: <Op lang="kk" field="name" />, <Op lang="kk" field="id" />, <Op lang="kk" field="address" />.
        Деректер бойынша сұраулар: <Op lang="kk" field="email" /> немесе сайттағы «Қолдау» бөліміндегі «Qoldan командасына жазыңыз» формасы.
      </p>
      <p>
        Qoldan-ды пайдалану және формаларды жіберу арқылы сіз осы саясатпен танысқаныңызды растайсыз. Егер
        онымен келіспесеңіз, формаларды жібермеңіз және сайтты пайдаланбаңыз.
      </p>

      <h2>2. Біз қандай деректерді өңдейміз</h2>
      <DataTable
        head={['Санат', 'Нақты не', 'Не үшін', 'Кім көреді']}
        rows={[
          ['ChatGPT арқылы кіру', 'Пайдаланушы идентификаторы, аты, e-mail. Qoldan-ға құпиясөз берілмейді.', 'Кіру, қол жеткізу құқықтары, хабарландырулар астындағы қолтаңба', 'Атыңызды басқалар көреді; e-mail — тек сіз және модераторлар'],
          ['Хабарландырулар және баспана', 'Атауы, сипаттамасы, бағасы, өңірі, елді мекені, фотосуреттері, байланыс телефоны, қонақтар мен бөлмелер саны', 'Хабарландыруды жариялау', 'Хабарландыру мен фотосуретті барлық келушілер көреді; телефон тек кірген пайдаланушыларға «Телефонды көрсету» батырмасы арқылы және иесі рұқсат еткен жағдайда ғана көрсетіледі'],
          ['Картадағы нүкте', 'Координаттар, егер оларды өзіңіз көрсетсеңіз', 'Картада көрсету', 'Барлық келушілер; елді мекен әрқашан көрінеді'],
          ['«Маған керек» өтінімдері және жауаптар', 'Атауы, орны, мерзімі, бюджеті, жауаптың бағасы мен мәтіні', 'Орындаушыны іздеу', 'Өтінімді барлығы көреді; жауаптарды — өтінім авторы мен жауап авторы'],
          ['Чаттар', 'Хабарламалар мәтіні және жіберілген уақыты', 'Қатысушылар арасындағы байланыс', 'Тек диалог қатысушылары'],
          ['Брондау және техниканы беру', 'Күндер, түсініктеме, тапсырыс берушінің телефоны, беру және қайтару кезіндегі күйі, тараптардың жазбасы бойынша кепілақы туралы мәліметтер', 'Тараптар арасындағы келісімді тіркеу', 'Тек келісім тараптары'],
          ['Пікірлер мен бағалар', 'Баға және түсініктеме', 'Қатысушылардың беделі', 'Барлық келушілер'],
          ['Шағымдар, апелляциялар, өтініштер', 'Өтініш мәтіні, тақырыбы, ол жіберілген бет', 'Модерация және қолдау', 'Өтініш авторы және модераторлар'],
          ['Бизнес-профильді тексеру', 'Профиль түрі, ұйымның атауы, БСН, телефон, өңір, сілтеме, ескертпе', 'Профильдің ұйымға тиесілі екенін растау', 'Тек модераторлар; БСН мен тексеру деректері жарияланбайды'],
          ['Код арқылы кіру (жеке хостинг кезінде)', 'Кіруге арналған телефон нөмірі немесе e-mail, бір реттік кодтар мен кіру сессиялары — тек хэш түрінде сақталады; код 10 минут, сессия 30 күн әрекет етеді', 'Аккаунтқа құпиясөзсіз кіру және кодты таңдаудан қорғау', 'Тек сіз; модераторлар бұзушылықтарды қарау кезінде нөмірді немесе e-mail-ді көреді'],
          ['Онлайн-сауда және ставкалар', 'Сауда шарттары, ставкалардың сомасы мен уақыты, әр ставканың қатысушысы', 'Сауданы өткізу және жасанды көтеруден қорғау', 'Сома мен уақытты барлығы көреді, қатысушылар атсыз «N қатысушы» ретінде көрсетіледі; толық мәліметтерді модераторлар көреді'],
          ['Телефон нөмірлерін қарау', 'Қай кірген пайдаланушы қай хабарландырудың нөмірін қашан ашқаны; 12 ай сақталады', 'Иелерді нөмір жинаудан қорғау және нөмірдің олардың келісімімен көрсетілгенін растау', 'Модераторлар және техникалық қолдау'],
          ['Таңдаулылар және сақталған іздеулер', 'Хабарландырулар тізімі және іздеу параметрлері', 'Жеке ыңғайлылық', 'Тек сіз'],
          ['Картаны түзету', 'Елді мекеннің атауы мен координаттары, түзету себебі', 'Елді мекендер анықтамалығын жақсарту', 'Модераторлар; қабылданған түзету жария болады'],
          ['Техникалық деректер', 'IP-мекенжай және браузер туралы мәліметтерді хостинг-платформа өз журналдарында өңдейді', 'Сайттың жұмысы және қорғалуы', 'Хостинг-платформа'],
        ]}
      />

      <h2>3. Біз нені жинамаймыз</h2>
      <ul>
        <li>Төлем деректері: Qoldan төлем қабылдамайды.</li>
        <li>Құпиясөздер: кіруді бөгде сервис орындайды, құпиясөз бізге түспейді.</li>
        <li>ЖСН және құжат нөмірлері: оларды хабарландырулар мен хабарламаларда жарияламауыңызды сұраймыз.</li>
        <li>Сіздің әрекетіңізсіз нақты геолокация: координаттар тек сіз көрсеткенде қосылады.</li>
        <li>Жарнама және мінез-құлық аналитикасы үшін деректер: редакция күніне мұндай сервистер қосылмаған.</li>
      </ul>

      <h2>4. Өңдеудің мақсаттары мен негіздері</h2>
      <ul>
        <li>Qoldan функцияларының жұмысы: жарияланымдар, өтінімдер, жауаптар, чаттар, брондау, пікірлер.</li>
        <li>Қауіпсіздік және модерация: шағымдар мен апелляцияларды қарау, алаяқтық пен спамнан қорғау.</li>
        <li>Кері байланыс: өтініштеріңізге жауап беру.</li>
        <li>Заңнама талаптарын орындау.</li>
      </ul>
      <p>
        Негіз — форманы жіберу немесе ақпаратты жариялау арқылы беретін келісіміңіз, сондай-ақ заң
        талаптары. Келісіміңізді кері қайтарып алуыңызға болады (8-бөлім); онда заң бойынша өзге негіз
        болмаса, өңдеуді тоқтатамыз.
      </p>

      <h2>5. Басқалар нені көреді</h2>
      <p>
        Жария түрде хабарландыруға қажет мәліметтер ғана көрсетіледі: атауы, фото, бағасы, сипаттамасы,
        өңірі, автордың аты және байланыс контакті. БСН, модерация ескертпелері, жеке хабарламалар және
        бизнес-профильді тексеру деректері жарияланбайды. Жариялау алдында ашық сипаттамада қандай
        контактілер қалдыратыныңызды тексеріңіз және онда ЖСН, құжат нөмірін, банк деректерін, үй мекенжайын
        және SMS-кодтарды жазбаңыз.
      </p>

      <h2>6. Деректерді беру және бөгде сервистер</h2>
      <ul>
        <li>
          <b>Хостинг және кіру.</b> Qoldan бұлттық хостинг платформасында жұмыс істейді; кіру ChatGPT
          сервисі арқылы орындалады. Бұл сервистер кіру мен сайттың жұмысына қажет деректерді алады.
          Деректер Қазақстаннан тыс серверлерде өңделуі мүмкін.
        </li>
        <li>
          <b>Карталар.</b> Картаны ашқанда браузеріңіз OpenStreetMap-тен тайлдарды сұрайды; тайл сервері
          IP-мекенжайыңызды және сұрау параметрлерін алады.
        </li>
        <li>
          <b>WhatsApp.</b> «WhatsApp-қа жазу» сілтемелері сыртқы сервисті тек сіз басқанда ашады.
        </li>
        <li>Біз дербес деректерді сатпаймыз және жарнама желілеріне бермейміз.</li>
        <li>Заң талап етсе, деректер мемлекеттік органдарға берілуі мүмкін.</li>
      </ul>

      <h2>7. Сақтау мерзімдері</h2>
      <ul>
        <li>Хабарландырулар, өтінімдер, жауаптар, чаттар мен пікірлер деректері профиліңіз немесе жарияланым бар болғанша сақталады.</li>
        <li>Жүктелген, бірақ хабарландыруға бекітілмеген фотосуреттер 24 сағаттан кешіктірілмей автоматты түрде өшіріледі.</li>
        <li>Форма жобалары мен соңғы қаралғандар тізімі тек браузеріңізде, оларды тазартқанша сақталады.</li>
        <li>
          Аккаунтты профильде өзіңіз өшіре аласыз («Менің деректерім» → «Аккаунтты өшіру»): профиль,
          хабарландырулар, өтінімдер, жауаптар, хабарламалар, ставкалар мен фотосуреттер бірден өшіріледі.
          E-mail арқылы сұрау бойынша деректерді 30 күнтізбелік күн ішінде өшіреміз немесе иесіздендіреміз.
          Модерация журналының жазбалары, егер бұл алаяқтықтан қорғау үшін қажет болса немесе заң талап
          етсе, профиліңізге байланыстырылмай сақталады. Ставкаңыз жүріп жатқан саудада алда болса немесе
          сізде ставкалары бар сауда жүріп жатса, өшіру олар аяқталғанша кейінге қалдырылады.
        </li>
      </ul>

      <h2>8. Сіздің құқықтарыңыз және оларды қалай пайдалану керек</h2>
      <p>Сіз:</p>
      <ul>
        <li>біз қандай деректеріңізді өңдейтінімізді біліп, оларға қол жеткізуге құқылысыз — көшірмесін профильден жүктеп алуға болады («Менің деректерім» → «Деректерімді жүктеп алу»);</li>
        <li>дұрыс емес деректерді түзетуді талап етуге;</li>
        <li>келісімді кері қайтарып алуға, деректерді бұғаттауды немесе өшіруді талап етуге;</li>
        <li>біздің әрекеттерімізге уәкілетті органға немесе сотқа шағымдануға құқылысыз.</li>
      </ul>
      <p>
        Ол үшін «Qoldan командасына жазыңыз» формасы («Қолдау» бөлімі) арқылы немесе{' '}
        <Op lang="kk" field="email" /> мекенжайына өтініш жіберіңіз. Қазақстан Республикасының заңнамасында
        белгіленген мерзімде жауап береміз. Жауап алғанға дейін хабарландыруды жариялаудан өзіңіз алып
        тастай немесе өтінімді жаба аласыз.
      </p>

      <h2>9. Деректерді қалай қорғаймыз</h2>
      <ul>
        <li>Жарияланымдарды, өтінімдерді және олардың мәртебесін тек авторы өзгерте алады.</li>
        <li>Жеке хабарламалар, бизнесті тексеру деректері және модерация ескертпелері жария тізімдерге түспейді.</li>
        <li>Модерация мен өтініштерді қарауға қол жеткізу әкімшілер тізімімен шектелген.</li>
        <li>Жүктелетін файлдар түрі, қолтаңбасы және өлшемі бойынша тексеріледі; сағатына жүктеулер мен жарияланымдар саны шектелген.</li>
        <li>Беттер мен файлдарды беру браузердің қорғаныс тақырыптарымен бірге жүреді.</li>
      </ul>
      <p>Ешбір сервис абсолютті қорғалмаған; деректердің жылыстауы анықталса, заң талап еткендей зардап шеккен пайдаланушыларды хабардар етеміз.</p>

      <h2>10. Балалар</h2>
      <p>Qoldan 18 жасқа толмаған адамдарға арналмаған. Егер бала бізге деректер берді деп ойласаңыз, бізге жазыңыз, біз оларды өшіреміз.</p>

      <h2>11. Саясаттың өзгеруі</h2>
      <p>
        Біз саясатты жаңарта аламыз. Өзекті нұсқасы әрдайым осы бетте редакция күнімен қолжетімді.
        Браузер қоймасы туралы толығырақ — <Link href="/legal/cookies">cookie саясатында</Link>; пайдалану
        ережелері — <Link href="/legal/terms">офертада</Link>.
      </p>
    </LegalPage>
  );
}

export function PrivacyEn() {
  return (
    <LegalPage lang="en" title="Personal Data Protection Policy">
      <h2>1. General</h2>
      <p>
        This policy explains which personal data the Qoldan website (Qoldan) processes, why, how the data is
        protected and what rights you have. It follows the legislation of the Republic of Kazakhstan on personal
        data and its protection.
      </p>
      <p>
        Personal data operator: <Op lang="en" field="name" />, <Op lang="en" field="id" />, <Op lang="en" field="address" />.
        Data requests: <Op lang="en" field="email" /> or the “Write to the Qoldan team” form in the Support section of the website.
      </p>
      <p>
        By using Qoldan and sending forms you confirm that you have read this policy. If you do not agree with it,
        do not send forms and do not use the website.
      </p>

      <h2>2. What data we process</h2>
      <DataTable
        head={['Category', 'What exactly', 'Why', 'Who sees it']}
        rows={[
          ['Sign-in with ChatGPT', 'User identifier, name, e-mail. No Qoldan password is transferred.', 'Sign-in, access rights, author name on listings', 'Others see your name; the e-mail is seen only by you and moderators'],
          ['Listings and stays', 'Title, description, price, region, settlement, photos, contact phone, number of guests and rooms', 'Publishing the listing', 'All visitors see the listing and photos; the phone is shown only to signed-in users via the “Show phone” button and only if the owner allowed it'],
          ['Point on the map', 'Coordinates, if you set them yourself', 'Showing on the map', 'All visitors; the settlement is always visible'],
          ['“Wanted” requests and responses', 'Title, place, timing, budget, price and text of the response', 'Finding a provider', 'Everyone sees the request; responses are seen by the request author and the response author'],
          ['Chats', 'Message text and time sent', 'Communication between participants', 'Only the participants of the conversation'],
          ['Bookings and equipment handover', 'Dates, comment, customer phone, condition at handover and return, deposit details as recorded by the parties', 'Recording the agreement between the parties', 'Only the parties to the agreement'],
          ['Reviews and ratings', 'Rating and comment', 'Reputation of participants', 'All visitors'],
          ['Complaints, appeals, requests', 'Text of the request, topic, the page it was sent from', 'Moderation and support', 'The author of the request and moderators'],
          ['Business profile verification', 'Profile type, organisation name, BIN, phone, region, link, note', 'Confirming that the profile belongs to the organisation', 'Only moderators; the BIN and verification data are not published'],
          ['Sign-in with a code (when self-hosted)', 'Phone number or e-mail for sign-in, one-time codes and sign-in sessions — stored only as hashes; a code is valid for 10 minutes, a session for 30 days', 'Password-free sign-in and protection against code guessing', 'Only you; moderators see the number or e-mail when reviewing violations'],
          ['Online auctions and bids', 'Auction terms, bid amounts and times, the participant of each bid', 'Running auctions and protecting against shill bidding', 'Everyone sees amounts and times, participants are shown as “Participant N” without names; moderators see full details'],
          ['Phone number views', 'Which signed-in user opened the number of which listing and when; kept for 12 months', 'Protecting owners from number harvesting and confirming the number was shown with their consent', 'Moderators and technical support'],
          ['Favourites and saved searches', 'List of listings and search parameters', 'Personal convenience', 'Only you'],
          ['Map edits', 'Name and coordinates of a settlement, reason for the edit', 'Improving the settlement directory', 'Moderators; an accepted edit becomes public'],
          ['Technical data', 'The IP address and browser details are processed by the hosting platform in its logs', 'Operation and protection of the website', 'Hosting platform'],
        ]}
      />

      <h2>3. What we do not collect</h2>
      <ul>
        <li>Payment data: Qoldan does not take payments.</li>
        <li>Passwords: sign-in is handled by a third-party service, the password never reaches us.</li>
        <li>IIN and document numbers: please do not publish them in listings and messages.</li>
        <li>Precise location without your action: coordinates are added only if you set them.</li>
        <li>Data for advertising and behavioural analytics: no such services are connected as of this version.</li>
      </ul>

      <h2>4. Purposes and grounds of processing</h2>
      <ul>
        <li>Operating Qoldan features: listings, requests, responses, chats, bookings, reviews.</li>
        <li>Safety and moderation: reviewing complaints and appeals, protection against fraud and spam.</li>
        <li>Feedback: answering your requests.</li>
        <li>Complying with legal requirements.</li>
      </ul>
      <p>
        The ground is your consent, given when you send a form or publish information, and legal requirements.
        You may withdraw consent (section 8); we will then stop processing unless the law provides another ground.
      </p>

      <h2>5. What others see</h2>
      <p>
        Only the details needed for a listing are public: title, photos, price, description, region, author name
        and contact. The BIN, moderation notes, private messages and business verification data are not published.
        Before publishing, check which contacts you leave in the public description, and do not write your IIN,
        document number, bank details, home address or SMS codes there.
      </p>

      <h2>6. Data transfer and third-party services</h2>
      <ul>
        <li>
          <b>Hosting and sign-in.</b> Qoldan runs on a cloud hosting platform; sign-in is provided by the ChatGPT
          service. These services receive the data needed for sign-in and for the website to work. Data may be
          processed on servers outside Kazakhstan.
        </li>
        <li>
          <b>Maps.</b> When you open a map, your browser requests tiles from OpenStreetMap; the tile server receives
          your IP address and the request parameters.
        </li>
        <li>
          <b>WhatsApp.</b> “Message on WhatsApp” links open the external service only when you tap them.
        </li>
        <li>We do not sell personal data and do not pass it to advertising networks.</li>
        <li>Data may be disclosed to state authorities where the law requires it.</li>
      </ul>

      <h2>7. Retention periods</h2>
      <ul>
        <li>Data of listings, requests, responses, chats and reviews is kept while your profile or the publication exists.</li>
        <li>Photos uploaded but not attached to a listing are deleted automatically within 24 hours.</li>
        <li>Form drafts and the list of recently viewed items are kept only in your browser until you clear them.</li>
        <li>
          You can delete your account yourself in the profile (“My data” → “Delete account”): the profile, listings,
          requests, responses, messages, bids and photos are deleted immediately. On request by e-mail we delete or
          anonymise the data within 30 calendar days. Moderation log entries are kept without a link to your
          profile if needed for fraud protection or required by law. While your bid leads a running auction or you
          have a running auction with bids, deletion is postponed until they end.
        </li>
      </ul>

      <h2>8. Your rights and how to use them</h2>
      <p>You have the right to:</p>
      <ul>
        <li>know which of your data we process and access it — a copy can be downloaded in the profile (“My data” → “Download my data”);</li>
        <li>require correction of inaccurate data;</li>
        <li>withdraw consent, require blocking or deletion of data;</li>
        <li>appeal our actions to the authorised body or to court.</li>
      </ul>
      <p>
        To do so, send a request via the “Write to the Qoldan team” form (Support section) or to{' '}
        <Op lang="en" field="email" />. We will answer within the time limits set by the legislation of the
        Republic of Kazakhstan. Until you receive an answer, you can unpublish your listing or close your request
        yourself.
      </p>

      <h2>9. How we protect data</h2>
      <ul>
        <li>Only the author can change listings, requests and their status.</li>
        <li>Private messages, business verification data and moderation notes never appear in public lists.</li>
        <li>Access to moderation and request handling is limited to a list of administrators.</li>
        <li>Uploaded files are checked by type, signature and size; uploads and publications per hour are limited.</li>
        <li>Pages and files are served with protective browser headers.</li>
      </ul>
      <p>No service is absolutely secure; if a data breach is detected, we will notify affected users as the law requires.</p>

      <h2>10. Children</h2>
      <p>Qoldan is not intended for persons under 18. If you believe a child has given us data, write to us and we will delete it.</p>

      <h2>11. Changes to the policy</h2>
      <p>
        We may update the policy. The current version is always available on this page with its date. More about
        browser storage — in the <Link href="/legal/cookies">cookie policy</Link>; rules of use — in the{' '}
        <Link href="/legal/terms">offer</Link>.
      </p>
    </LegalPage>
  );
}
