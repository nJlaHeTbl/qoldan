// Kazakh and English versions of the auction rules. The Russian text in page.tsx prevails; keep the same
// sections and list items (scripts/test-legal.mjs compares the structure). Kazakh needs a native speaker's
// and a lawyer's review.
import LegalPage, { Op } from '@/components/LegalPage';

export function AuctionsKk() {
  return (
    <LegalPage lang="kk" title="Онлайн-сауда ережелері">
      <p>
        Qoldan-дағы сауда ақшаның қатысуынсыз өтеді: Qoldan төлем қабылдамайды, кепілақы ұстамайды және
        комиссия алмайды. Жеңімпаз бен сатушы тауарды беру мен есеп айырысуды тікелей келіседі.
      </p>

      <h2>1. Кім қатыса алады</h2>
      <ul>
        <li>Тек 18 жасқа толған кірген пайдаланушылар. Әр ставка кезінде жасыңызды және осы ережелермен келісетініңізді растайсыз.</li>
        <li>Сатушы өз саудасында ставка жасай алмайды және бірінші ставкадан кейін шарттарды өзгерте алмайды.</li>
        <li>Сауда техниканы, құралдарды, жабдықты, құрылыс материалдарын және партия қалдықтарын сату үшін қолжетімді. Жылжымайтын мүлік, баспана, жануарлар, қызметтер және жалға беру саудаға қатыспайды.</li>
        <li>Тыйым салынған тауарларды және айналымы заңмен шектелген тауарларды саудаға шығаруға болмайды.</li>
      </ul>

      <h2>2. Ставкалар</h2>
      <ul>
        <li>Бірінші ставка бастапқы бағадан төмен болмауы керек, әр келесісі — ағымдағы баға мен ставка қадамының қосындысынан төмен емес.</li>
        <li>Сома теңгемен бүтін санмен көрсетіледі. Ағымдағы бағадан тым көп (10 еседен астам) асатын ставканы сайт қабылдамайды: осылайша қателерден қорғаймыз.</li>
        <li>Ставканы кері қайтаруға немесе өзгертуге болмайды: бұл көрсетілген сомаға сатып алу ұсынысы. Қателессеңіз, бірден қолдауға жазыңыз, модераторлар мән-жайды қарайды.</li>
        <li>Ставкаңыз алда тұрғанда қайта ставка жасауға болмайды. Ставкаңызды басып озса, бұл «Менің саудаларым» бөлімінде көрінеді.</li>
        <li>Қатысушылар атсыз «N қатысушы» ретінде көрсетіледі. Ставкалардың сомасы мен уақыты барлығына көрінеді.</li>
        <li>Барлық тексерулерді экраныңызда не көрсетілгеніне қарамастан сервер орындайды: бір мезгілдегі ставкалар кезінде тек дұрысы қабылданады.</li>
      </ul>

      <h2>3. Уақыт және ұзарту</h2>
      <ul>
        <li>Сауда 24 сағаттан 7 тәулікке дейін жүреді. Аяқталу уақытын сағатыңыз емес, сервер көрсетеді.</li>
        <li>Ставка соңғы 2 минутта жасалса, сауда соңына дейін 2 минут қалатындай ұзартылады. Ең көбі — 10 ұзарту. Бұл «соңғы секундтағы» ставкалардан қорғау.</li>
        <li>Мерзімді тек ұзартуға болады; қысқартуға болмайды.</li>
      </ul>

      <h2>4. Резервтік баға және жеңімпаз</h2>
      <ul>
        <li>Сатушы резервтік бағаны — сатуға дайын ең төменгі соманы белгілей алады. Оның мөлшері жасырын.</li>
        <li>Сауда аяқталғанда алдағы ставка резервтік бағадан төмен болмаса (немесе резервтік баға жоқ болса), алдағы қатысушы жеңеді. Әйтпесе сауда жеңімпазсыз аяқталады және бұл «резервтік бағаға жетпеді» деп көрсетіледі.</li>
        <li>Жеңімпаз бен сатушы Qoldan чаты арқылы байланысып, тауарды беру мен төлемді келіседі. Qoldan мәмілеге қатыспайды және тауардың күйіне, түпнұсқалығына және міндеттемелердің орындалуына кепілдік бермейді.</li>
      </ul>

      <h2>5. Болдырмау</h2>
      <ul>
        <li>Сатушы бірде-бір ставка болмағанда сауданы болдырмай алады. Бірінші ставкадан кейін болдырмау мүмкін емес, ал хабарландыруды сауда аяқталғанша жасыруға болмайды.</li>
        <li>Модераторлар ереже бұзылғанда немесе шағым бойынша сауданы тоқтата алады.</li>
      </ul>

      <h2>6. Айла-шарғы және шағымдар</h2>
      <ul>
        <li>Жалған ставкаларға, сөз байласуға, көмекші аккаунттардан ставка жасауға, қатысушыларға қысым көрсетуге және ережелерді айналып өтуге тыйым салынады.</li>
        <li>Сағатына ставкалар саны шектелген. Күдікті әрекеттер тіркеледі, ал аккаунттар шектелуі мүмкін.</li>
        <li>Саудаға хабарландырудағы «Шағымдану» батырмасы арқылы шағымдануға болады. Қарау тәртібі жария офертада және дау шарттарында сипатталған.</li>
      </ul>

      <h2>7. Байланыс</h2>
      <p>
        Сұрақтар мен өтініштер: <Op lang="kk" field="email" />.
      </p>
      <p className="legal-meta">
        Ережелердің жобасы сервистің құрылымы бойынша жасалған. Сауданы іске қоспас бұрын оны Қазақстан
        Республикасының заңгері тексеруі керек (электрондық сауда, жария сауда және тұтынушылар құқықтарын
        қорғау ережелеріне сәйкестігі).
      </p>
    </LegalPage>
  );
}

export function AuctionsEn() {
  return (
    <LegalPage lang="en" title="Online Auction Rules">
      <p>
        Auctions on Qoldan run without money changing hands through the platform: Qoldan does not take payments,
        hold deposits or charge fees. The winner and the seller agree on handover and payment directly.
      </p>

      <h2>1. Who can take part</h2>
      <ul>
        <li>Only signed-in users aged 18 or over. With every bid you confirm your age and acceptance of these rules.</li>
        <li>A seller cannot bid in their own auction and cannot change the terms after the first bid.</li>
        <li>Auctions are available for selling machinery, tools, equipment, building materials and surplus batches. Real estate, stays, animals, services and rentals are not auctioned.</li>
        <li>Prohibited goods and goods whose circulation is restricted by law cannot be auctioned.</li>
      </ul>

      <h2>2. Bids</h2>
      <ul>
        <li>The first bid must be at least the starting price, every next one at least the current price plus the bid step.</li>
        <li>The amount is a whole number of tenge. The site rejects a bid far above the current price (more than 10 times): this protects against typos.</li>
        <li>A bid cannot be withdrawn or changed: it is an offer to buy for that amount. If you made a mistake, write to support at once and moderators will review the circumstances.</li>
        <li>While your bid leads, you cannot bid again. If you are outbid, you will see it in “My auctions”.</li>
        <li>Participants are shown as “Participant N” without names. Bid amounts and times are visible to everyone.</li>
        <li>The server performs all checks regardless of what your screen shows: with simultaneous bids only the valid one is accepted.</li>
      </ul>

      <h2>3. Timing and extension</h2>
      <ul>
        <li>An auction runs from 24 hours to 7 days. The end time comes from the server, not from your clock.</li>
        <li>If a bid is placed in the last 2 minutes, the auction is extended so that 2 minutes remain. At most 10 extensions. This protects against last-second bids.</li>
        <li>The end can only be extended, never brought forward.</li>
      </ul>

      <h2>4. Reserve price and winner</h2>
      <ul>
        <li>The seller may set a reserve price — the minimum amount they are willing to sell for. Its amount is hidden.</li>
        <li>If at the end the leading bid is at least the reserve price (or there is no reserve), the leader wins. Otherwise the auction ends without a winner, shown as “reserve not met”.</li>
        <li>The winner and the seller contact each other in the Qoldan chat and agree on handover and payment. Qoldan does not take part in the deal and does not guarantee the condition or authenticity of the item or performance of obligations.</li>
      </ul>

      <h2>5. Cancellation</h2>
      <ul>
        <li>The seller can cancel the auction while there are no bids. After the first bid cancellation is impossible, and the listing cannot be hidden until the auction ends.</li>
        <li>Moderators may stop an auction for a rule violation or on a complaint.</li>
      </ul>

      <h2>6. Manipulation and complaints</h2>
      <ul>
        <li>Fake bids, collusion, bids from secondary accounts, pressure on participants and circumventing the rules are prohibited.</li>
        <li>The number of bids per hour is limited. Suspicious actions are recorded and accounts may be restricted.</li>
        <li>You can report an auction with the “Report” button on the listing. The review procedure is described in the public offer and the dispute terms.</li>
      </ul>

      <h2>7. Contacts</h2>
      <p>
        Questions and requests: <Op lang="en" field="email" />.
      </p>
      <p className="legal-meta">
        These draft rules follow how the service works. Before auctions launch, a lawyer of the Republic of
        Kazakhstan must review them (compliance with e-commerce, public auction and consumer protection rules).
      </p>
    </LegalPage>
  );
}
