// Kazakh and English versions of the public offer. The Russian text in page.tsx prevails; keep the same
// sections and list items (scripts/test-legal.mjs compares the structure). Kazakh needs a native speaker's
// and a lawyer's review.
import Link from 'next/link';
import LegalPage, { Op } from '@/components/LegalPage';

export function TermsKk() {
  return (
    <LegalPage lang="kk" title="Жария оферта (пайдаланушы келісімі)">
      <h2>1. Терминдер</h2>
      <ul>
        <li><b>Qoldan</b> — Оператор басқаратын сайт пен сервистер: <Op lang="kk" field="name" />, <Op lang="kk" field="id" />, <Op lang="kk" field="address" />.</li>
        <li><b>Пайдаланушы</b> — Qoldan-ды пайдаланатын тұлға.</li>
        <li><b>Хабарландыру</b> — тауар, жалға беру, қызмет немесе баспана туралы жарияланым. <b>Өтінім</b> — «Маған керек» жарияланымы. <b>Жауап</b> — орындаушының өтінім бойынша ұсынысы.</li>
      </ul>

      <h2>2. Qoldan-ның мәні мен рөлі</h2>
      <p>
        Qoldan — ақпараттық алаң: ол хабарландырулар мен өтінімдерді жариялауға, бір-бірін табуға және
        сөйлесуге мүмкіндік береді. Qoldan сатушы, жалға беруші, орындаушы, делдал немесе пайдаланушылар
        арасындағы мәмілелердің тарапы болып табылмайды. Баға, мерзім, беру және есеп айырысу туралы
        келісімдерді қатысушылар тікелей жасайды.
      </p>
      <p>
        Qoldan төлем қабылдамайды және комиссия ұстамайды. Ақылы функциялар пайда болса, баға мен шарттар
        кез келген ақылы әрекетке дейін көрсетіледі, ал бұл құжат жаңартылады.
      </p>

      <h2>3. Шарттарды қабылдау</h2>
      <p>
        Бұл құжат — жария оферта. Сіз оны Qoldan-ға кіргенде, ақпарат жариялағанда немесе формалар
        жібергенде қабылдайсыз. Шарттармен келіспесеңіз, Qoldan-ды пайдаланбаңыз.
      </p>

      <h2>4. Кіру және қол жеткізу</h2>
      <p>
        Кіру ChatGPT сервисі арқылы орындалады. Есептік жазбаңыздан жасалған әрекеттерге сіз жауап бересіз.
        Жария хабарландыруларды кірмей-ақ қарауға болады; жариялау, жауап беру және чатта жазу — тек
        кіргеннен кейін.
      </p>

      <h2>5. Орналастыру ережелері</h2>
      <ul>
        <li>Мәліметтер шынайы болуы керек: нақты тауар, нақты баспана, нақты жануар, өзекті баға мен байланыс.</li>
        <li>Фотосуреттер сізге тиесілі болуы немесе оларды пайдалануға құқығыңыз болуы керек.</li>
        <li>Алдау, ұрланған және заңсыз тауарлар, қауіпті қызметтер, жануарлар туралы жалған мәліметтер, бөгде фотосуреттер, спам және сервис шектеулерін айналып өту тыйым салынады.</li>
        <li>Бөгде адамдардың дербес деректерін, ЖСН, құжат нөмірлерін, банк деректерін және SMS-кодтарды жарияламаңыз.</li>
        <li>Бір фотосуретті әртүрлі хабарландыруларда пайдалануға болмайды.</li>
      </ul>

      <h2>6. Модерация және апелляциялар</h2>
      <p>
        Кез келген пайдаланушы жарияланымға шағымдана алады. Жарияланым автоматты түрде жоғалмайды:
        модератор мән-жайды тексеріп, шешімді (ескерту, жасыру немесе қалпына келтіру) жазады және авторға
        апелляция беру мүмкіндігін береді. Жарияланым модератормен жасырылып тұрғанда, автор оны көрсетуге
        өзі қайтара алмайды: бұл модератордың шешімінен немесе қанағаттандырылған апелляциядан кейін ғана
        мүмкін. Қайталанған бұзушылықтар қол жеткізуді шектеуге әкелуі мүмкін.
      </p>

      <h2>7. Пайдаланушылар арасындағы мәмілелер</h2>
      <ul>
        <li>Келісім алдында күйін, шарттарын, құжаттарын және контрагенттің жеке басын нақтылаңыз.</li>
        <li>Бейтаныс адамға тексермей алдын ала төлем аудармаңыз.</li>
        <li>Qoldan қатысушылардың сапасына, бар-жоғына, бос күндеріне, төлем қабілеттілігіне және адалдығына кепілдік бермейді.</li>
        <li>Пікірлер мен бағалар — пайдаланушылардың пікірі, Qoldan-ның ұсынымы немесе кепілдігі емес.</li>
      </ul>
      <p>Қайтару, бас тарту және даулар туралы толығырақ — <Link href="/legal/returns">қайтару шарттарында</Link>.</p>

      <h2>8. Бизнес-профильді тексеру</h2>
      <p>
        Тексеру белгісі Оператордың ұйым туралы берілген мәліметтерді салыстырғанын білдіреді. Бұл тауарлар
        мен қызметтер сапасының кепілдігі емес және ұсыным емес.
      </p>

      <h2>9. Пайдаланушы мазмұны</h2>
      <p>
        Мәтіндеріңіз бен фотосуреттеріңізге құқықтар сізде қалады. Оларды жариялау арқылы сіз Qoldan-ға
        жарияланым бар болғанша оларды сервистің жұмысы үшін сайтта және қызметтік хабарламаларда көрсетудің
        айрықша емес құқығын бересіз. Жарияланатын материалдарға құқығыңыздың бар екеніне сіз жауап бересіз.
      </p>

      <h2>10. Жауапкершілік</h2>
      <p>
        Оператор Qoldan-ның жұмысы үшін Қазақстан Республикасының заңнамасында белгіленген шекте жауап
        береді. Оператор пайдаланушылар жарияланымдарының мазмұны, олардың мәмілелері мен есеп айырысулары,
        сондай-ақ оның бақылауынан тыс себептерден туындаған жұмыстағы үзілістер үшін жауап бермейді. Сервис
        «қалай бар, солай» ұсынылады. Бұл құжаттағы ешнәрсе заң бойынша шектеуге болмайтын тұтынушылар
        құқықтарын шектемейді.
      </p>

      <h2>11. Дербес деректер және cookie</h2>
      <p>
        Дербес деректерді өңдеу <Link href="/legal/privacy">деректерді қорғау саясатында</Link>, браузер
        қоймасын пайдалану — <Link href="/legal/cookies">cookie саясатында</Link> сипатталған.
      </p>

      <h2>12. Өзгерістер</h2>
      <p>
        Оператор бұл құжатты өзгерте алады. Жаңа редакция осы бетте жарияланған сәттен бастап күшіне енеді;
        Qoldan-ды пайдалануды жалғастыра отырып, сіз оны қабылдайсыз. Редакция күні жоғарыда көрсетілген.
      </p>

      <h2>13. Қолданылатын құқық және даулар</h2>
      <p>
        Қатынастарға Қазақстан Республикасының заңнамасы қолданылады. Наразылықтарды «Qoldan командасына
        жазыңыз» формасы арқылы немесе <Op lang="kk" field="email" /> мекенжайына жіберіңіз; дауды шешу мүмкін
        болмаса, ол заңнамада белгіленген тәртіппен шешіледі.
      </p>

      <h2>14. Оператордың деректемелері</h2>
      <p>
        <Op lang="kk" field="name" />, <Op lang="kk" field="id" />, <Op lang="kk" field="address" />, <Op lang="kk" field="email" />.
      </p>
    </LegalPage>
  );
}

export function TermsEn() {
  return (
    <LegalPage lang="en" title="Public Offer (User Agreement)">
      <h2>1. Terms</h2>
      <ul>
        <li><b>Qoldan</b> — the website and services run by the Operator: <Op lang="en" field="name" />, <Op lang="en" field="id" />, <Op lang="en" field="address" />.</li>
        <li><b>User</b> — a person who uses Qoldan.</li>
        <li><b>Listing</b> — a publication about goods, rental, a service or a stay. <b>Request</b> — a “Wanted” publication. <b>Response</b> — a provider’s offer on a request.</li>
      </ul>

      <h2>2. Subject and role of Qoldan</h2>
      <p>
        Qoldan is an information platform: it lets people publish listings and requests, find each other and
        communicate. Qoldan is not a seller, landlord, provider, intermediary or party to deals between users.
        Participants agree on price, timing, handover and payment directly.
      </p>
      <p>
        Qoldan does not take payments and does not charge a fee. If paid features appear, the price and terms will
        be shown before any paid action, and this document will be updated.
      </p>

      <h2>3. Acceptance</h2>
      <p>
        This document is a public offer. You accept it when you sign in to Qoldan, publish information or send
        forms. If you do not agree with the terms, do not use Qoldan.
      </p>

      <h2>4. Sign-in and access</h2>
      <p>
        Sign-in is provided by the ChatGPT service. You are responsible for actions taken from your account. Public
        listings can be viewed without signing in; publishing, responding and chatting require signing in.
      </p>

      <h2>5. Posting rules</h2>
      <ul>
        <li>Information must be truthful: a real item, a real place to stay, a real animal, a current price and contact.</li>
        <li>Photos must belong to you or you must have the right to use them.</li>
        <li>Deception, stolen and illegal goods, dangerous services, false information about animals, other people’s photos, spam and circumventing the service’s limits are prohibited.</li>
        <li>Do not publish other people’s personal data, IINs, document numbers, bank details or SMS codes.</li>
        <li>The same photo cannot be used in different listings.</li>
      </ul>

      <h2>6. Moderation and appeals</h2>
      <p>
        Any user can report a publication. A publication does not disappear automatically: a moderator checks the
        context, records a decision (warning, hiding or restoring) and gives the author the chance to appeal. While
        a publication is hidden by a moderator, the author cannot show it again on their own: this is possible after
        the moderator’s decision or a successful appeal. Repeated violations may lead to restricted access.
      </p>

      <h2>7. Deals between users</h2>
      <ul>
        <li>Before agreeing, check the condition, terms, documents and the identity of the other party.</li>
        <li>Do not send a prepayment to a stranger without checking.</li>
        <li>Qoldan does not guarantee the quality, availability, free dates, solvency or good faith of participants.</li>
        <li>Reviews and ratings are users’ opinions, not a recommendation or guarantee by Qoldan.</li>
      </ul>
      <p>More about returns, cancellations and disputes — in the <Link href="/legal/returns">returns terms</Link>.</p>

      <h2>8. Business profile verification</h2>
      <p>
        The verification mark means that the Operator has matched the submitted details of the organisation. It is
        not a guarantee of the quality of goods and services and not a recommendation.
      </p>

      <h2>9. User content</h2>
      <p>
        The rights to your texts and photos remain yours. By publishing them you give Qoldan a non-exclusive right
        to show them on the website and in service notifications to run the service while the publication exists.
        You are responsible for having the right to the materials you publish.
      </p>

      <h2>10. Liability</h2>
      <p>
        The Operator is liable for the operation of Qoldan within the limits set by the legislation of the Republic
        of Kazakhstan. The Operator is not liable for the content of users’ publications, their deals and payments,
        or for interruptions caused by reasons beyond its control. The service is provided as is. Nothing in this
        document limits consumer rights that cannot be limited by law.
      </p>

      <h2>11. Personal data and cookies</h2>
      <p>
        Processing of personal data is described in the <Link href="/legal/privacy">data protection policy</Link>,
        use of browser storage — in the <Link href="/legal/cookies">cookie policy</Link>.
      </p>

      <h2>12. Changes</h2>
      <p>
        The Operator may change this document. A new version takes effect when published on this page; by
        continuing to use Qoldan you accept it. The date of the version is shown at the top.
      </p>

      <h2>13. Governing law and disputes</h2>
      <p>
        The legislation of the Republic of Kazakhstan applies. Send claims via the “Write to the Qoldan team” form
        or to <Op lang="en" field="email" />; if a dispute cannot be settled, it is resolved in the manner set by law.
      </p>

      <h2>14. Operator details</h2>
      <p>
        <Op lang="en" field="name" />, <Op lang="en" field="id" />, <Op lang="en" field="address" />, <Op lang="en" field="email" />.
      </p>
    </LegalPage>
  );
}
