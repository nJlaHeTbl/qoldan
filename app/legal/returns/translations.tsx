// Kazakh and English versions of the returns and disputes terms. The Russian text in page.tsx prevails; keep the
// same sections and list items (scripts/test-legal.mjs compares the structure). Kazakh needs a native speaker's
// and a lawyer's review.
import Link from 'next/link';
import LegalPage, { Op } from '@/components/LegalPage';

export function ReturnsKk() {
  return (
    <LegalPage lang="kk" title="Қайтару, бас тарту және дау шарттары">
      <h2>1. Қысқаша</h2>
      <p>
        Qoldan тауар сатпайды, қызмет көрсетпейді және төлем қабылдамайды, сондықтан Qoldan ақша қайтармайды
        және кепілақы ұстамайды. Қайтару мен бас тарту шарттарын сатушы, иесі немесе орындаушы сізбен
        келісім бойынша және заң шеңберінде белгілейді. Qoldan келісімді тіркеуге және ереже бұзушылықтарды
        қарауға көмектеседі, бірақ шартты немесе сотты алмастырмайды.
      </p>

      <h2>2. Тауар сатып алу</h2>
      <ul>
        <li>Егер сатушы ұйым немесе жеке кәсіпкер болса, Қазақстан Республикасының заңнамасы бойынша тұтынушы ретіндегі құқықтарыңыз сақталады.</li>
        <li>Кездесуге дейін чатта бағаны, жиынтығын, мерзімін және қайтару шарттарын келісіп, хат алмасуды сақтаңыз.</li>
        <li>Тауарды төлемге дейін қараңыз; бейтаныс адамға тексермей алдын ала төлем жібермеңіз.</li>
      </ul>

      <h2>3. Жануарлар және ауыл шаруашылығы өнімдері</h2>
      <p>
        Жануарлардың және өнім партияларының күйін, құжаттарын және қарау шарттарын алдын ала келісіңіз.
        Қайтару тек тараптардың келісімі бойынша немесе заңда көзделген жағдайларда мүмкін.
      </p>

      <h2>4. Техника мен жабдықты жалға алу</h2>
      <ul>
        <li>Беру кезінде тараптар Qoldan-да беру кезіндегі күйін, жиынтықтылығын, кепілақы сомасын және қайтару нәтижесін жаза алады.</li>
        <li>Кепілақы тараптар арасында тікелей беріледі және қайтарылады. Qoldan кепілақыны сақтамайды және оны ұстау-ұстамауды шешпейді.</li>
        <li>Qoldan-дағы жазба — тараптардың келісімін тіркеу, қайтарудың кепілдігі емес.</li>
      </ul>

      <h2>5. Тәуліктік баспана</h2>
      <p>
        Бос күндер мен броньды иесі растайды. Алдын ала төлем, бас тарту және қоныстану шарттарын иесі өзі
        белгілейді. Qoldan тұру үшін төлем қабылдамайды және күндердің бар екеніне кепілдік бермейді.
      </p>

      <h2>6. Қызметтер және «Маған керек» өтінімдері</h2>
      <ul>
        <li>Бағаны, көлемді және бас тарту шарттарын тапсырыс беруші мен орындаушы белгілейді.</li>
        <li>Өтінім авторы жұмыс аяқталды деп белгіленбейінше өтінім карточкасында орындаушы таңдауын болдырмай алады; аяқталғаннан кейін шешімді өзгертуге болмайды.</li>
        <li>Орындаушыны жұмыс аяқталғаннан кейін бағалауға болады.</li>
      </ul>

      <h2>7. Дау кезінде Qoldan не істейді</h2>
      <ul>
        <li>Жарияланымға шағымдана аласыз; модератор оны тексеріп, ереже бұзылса, жасыра алады.</li>
        <li>Автор модератордың шешіміне апелляция бере алады.</li>
        <li>Qoldan қатысушылар арасындағы ақшалай талаптарды қарамайды және ақшаны мәжбүрлеп қайтармайды.</li>
        <li>Алаяқтыққа күдік болса, хат алмасуды сақтап, құқық қорғау органдарына жүгініңіз.</li>
      </ul>

      <h2>8. Ақылы функциялар</h2>
      <p>
        Қазір ақылы функциялар жоқ. Олар пайда болса, олар үшін қайтару шарттары төлемге дейін көрсетіліп,
        осы құжатқа қосылады.
      </p>

      <h2>9. Байланыс</h2>
      <p>
        Сұрақтар мен наразылықтар — «Qoldan командасына жазыңыз» формасы («Қолдау» бөлімі) арқылы немесе{' '}
        <Op lang="kk" field="email" />. Сондай-ақ <Link href="/legal/terms">офертаны</Link> қараңыз.
      </p>
    </LegalPage>
  );
}

export function ReturnsEn() {
  return (
    <LegalPage lang="en" title="Returns, Cancellations and Disputes">
      <h2>1. In short</h2>
      <p>
        Qoldan does not sell goods, provide services or take payments, so Qoldan does not refund money and does not
        hold deposits. Return and cancellation terms are set by the seller, owner or provider by agreement with you
        and within the law. Qoldan helps record the agreement and review rule violations, but it does not replace a
        contract or a court.
      </p>

      <h2>2. Buying goods</h2>
      <ul>
        <li>If the seller is an organisation or an individual entrepreneur, your consumer rights under the legislation of the Republic of Kazakhstan remain in force.</li>
        <li>Before meeting, agree in the chat on the price, contents, timing and return terms, and keep the conversation.</li>
        <li>Inspect the item before paying; do not send a prepayment to a stranger without checking.</li>
      </ul>

      <h2>3. Animals and farm produce</h2>
      <p>
        Agree in advance on the condition of animals and produce batches, documents and inspection terms. A return
        is possible only by agreement of the parties or in cases provided by law.
      </p>

      <h2>4. Renting machinery and equipment</h2>
      <ul>
        <li>At handover the parties can record in Qoldan the condition at handover, completeness, deposit amount and the result at return.</li>
        <li>The deposit is handed over and returned directly between the parties. Qoldan does not hold the deposit and does not decide whether to keep it.</li>
        <li>A record in Qoldan documents the parties’ agreement; it is not a guarantee of return.</li>
      </ul>

      <h2>5. Stays by the day</h2>
      <p>
        Free dates and bookings are confirmed by the owner. The owner sets the prepayment, cancellation and check-in
        terms. Qoldan does not take payment for stays and does not guarantee availability.
      </p>

      <h2>6. Services and “Wanted” requests</h2>
      <ul>
        <li>The price, scope and cancellation terms are set by the customer and the provider.</li>
        <li>The request author can cancel the choice of provider on the request card until the work is marked as completed; after completion the decision cannot be changed.</li>
        <li>The provider can be rated after the work is completed.</li>
      </ul>

      <h2>7. What Qoldan does in a dispute</h2>
      <ul>
        <li>You can report a publication; a moderator will check it and may hide it if it breaks the rules.</li>
        <li>The author can appeal the moderator’s decision.</li>
        <li>Qoldan does not handle money claims between participants and does not force refunds.</li>
        <li>If you suspect fraud, keep the conversation and contact law enforcement.</li>
      </ul>

      <h2>8. Paid features</h2>
      <p>
        There are no paid features now. If they appear, their refund terms will be shown before payment and added
        to this document.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions and claims — via the “Write to the Qoldan team” form (Support section) or to{' '}
        <Op lang="en" field="email" />. See also the <Link href="/legal/terms">offer</Link>.
      </p>
    </LegalPage>
  );
}
