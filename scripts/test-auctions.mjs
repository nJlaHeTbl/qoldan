// Isolated real route/SQLite integration tests for online auctions: bids, races, anti-sniping,
// reserve price, settlement, cancellation and the database immutability triggers. No network writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as housing from '../lib/housing.ts';
import * as regions from '../lib/regions.ts';
const require = createRequire(import.meta.url), sqlite = new DatabaseSync(':memory:');
for (const file of fs.readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort()) sqlite.exec(fs.readFileSync('drizzle/' + file, 'utf8'));
const db = {
  prepare(sql) {
    return {
      args: [],
      bind(...values) { this.args = values; return this; },
      async first() { return sqlite.prepare(sql).get(...this.args) || null; },
      async all() { return { results: sqlite.prepare(sql).all(...this.args) }; },
      async run() { const result = sqlite.prepare(sql).run(...this.args); return { meta: { changes: Number(result.changes) } }; },
    };
  },
  queue: Promise.resolve(),
  batch(statements) { const run = this.queue.then(() => this.runBatch(statements)); this.queue = run.catch(() => {}); return run; },
  async runBatch(statements) {
    sqlite.exec('BEGIN');
    try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  },
};
const blobs = new Map();
const images = { async put(key, stream) { blobs.set(key, await new Response(stream).arrayBuffer()); }, async delete(key) { blobs.delete(key); } };
const loaded = new Map();
function compile(path) {
  if (loaded.has(path)) return loaded.get(path);
  const result = {};
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const resolver = name => {
    if (name === 'cloudflare:workers') return { env: { DB: db, IMAGES: images, QOLDAN_ADMIN_USER_IDS: 'mod' } };
    if (name === '@/lib/housing') return housing;
    if (name === '@/lib/regions') return regions;
    if (name.startsWith('@/')) return compile(name.slice(2) + '.ts');
    return require(name);
  };
  vm.compileFunction(output, ['require', 'exports'], { filename: path })(resolver, result); loaded.set(path, result); return result;
}
const listings = compile('app/api/listings/route.ts');
const listingStatus = compile('app/api/listings/status/route.ts');
const bootstrap = compile('app/api/bootstrap/route.ts');
const uploads = compile('app/api/uploads/route.ts');
const identity = id => id ? { 'oai-authenticated-user-id': id, 'oai-authenticated-user-email': id + '@qoldan.test' } : {};
const req = (path, method, body, id = 'owner', origin = 'https://qoldan.example') => {
  const init = { method, headers: { ...identity(id), ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }) } };
  if (body !== undefined) init.body = body instanceof FormData ? body : JSON.stringify(body);
  return new Request(origin + path, init);
};
const ok = async (promise, status, label) => { const response = await promise; assert.equal(response.status, status, `${label}: ${await response.clone().text()}`); return response; };
const auctions = compile('app/api/auctions/route.ts');
const cancelRoute = compile('app/api/auctions/cancel/route.ts');
const png = () => { const form = new FormData(); form.append('image', new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF6kAAAAASUVORK5CYII=', 'base64')], 'test.png', { type: 'image/png' })); return form; };
const baseListing = async (seller, extra = {}) => {
  const imageUrl = (await (await ok(uploads.POST(req('/api/uploads', 'POST', png(), seller)), 201, 'upload')).json()).url;
  return { title: 'LOCAL TEST Каток дорожный', category: 'Спецтехника', price: '100000', unit: '', type: 'Продам', region: 'Область Жетісу', location: 'Талдыкорган', description: 'Тестовое описание без настоящего объекта.', phone: '+70000000000', sellerType: 'Частное лицо', imageUrl, delivery: false, ...extra };
};
const auctionTerms = { startPrice: 100000, minStep: 5000, reservePrice: 150000, durationHours: 24 };
const createListing = async (seller, extra) => listings.POST(req('/api/listings', 'POST', await baseListing(seller, extra), seller));
const state = async (listingId, who) => (await ok(auctions.GET(req('/api/auctions?listingId=' + listingId, 'GET', undefined, who)), 200, 'state')).json();
const bid = (auctionId, amount, who, extra = {}) => auctions.POST(req('/api/auctions', 'POST', { auctionId, amount, acceptRules: true, ...extra }, who));
const insertAuction = (listingId, seller, { endsAt, startsAt = Date.now() - 1000, currentBid = null, leader = null, reserve = null, bidCount = 0 }) => {
  const id = crypto.randomUUID();
  sqlite.prepare("INSERT INTO auctions (id, listing_id, seller_id, start_price, min_step, reserve_price, starts_at, ends_at, base_ends_at, status, current_bid, bid_count, leader_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?, 'active', ?,?,?,?,?)").run(id, listingId, seller, 100000, 5000, reserve, startsAt, endsAt, endsAt, currentBid, bidCount, leader, Date.now(), Date.now());
  return id;
};
const plainListing = async seller => { sqlite.prepare('UPDATE listings SET created_at = created_at - 7200000 WHERE owner_id = ?').run(seller); return (await (await ok(createListing(seller), 201, 'plain listing')).json()).listing.id; }; // ages earlier listings so the 8-per-hour publishing limit does not interfere
const row = id => sqlite.prepare('SELECT * FROM auctions WHERE id = ?').get(id);

// --- creation rules ---
const rejected = async (extra, label) => { const response = await createListing('seller', extra); assert.equal(response.status, 400, label + ': ' + await response.clone().text()); };
await rejected({ auction: { ...auctionTerms, reservePrice: 90000 } }, 'reserve below start');
await rejected({ auction: { ...auctionTerms, minStep: 200000 } }, 'step above start price');
await rejected({ auction: { ...auctionTerms, durationHours: 5 } }, 'unsupported duration');
await rejected({ auction: auctionTerms, price: '90000' }, 'price differs from start price');
await rejected({ auction: auctionTerms, type: 'Сдам' }, 'rentals cannot be auctioned');
await rejected({ auction: auctionTerms, category: 'Скот и животные', livestockType: 'Овцы', livestockQuantity: 5, livestockPriceMode: 'per_head' }, 'livestock cannot be auctioned');
await rejected({ auction: auctionTerms, category: 'Сельхозуслуги' }, 'services cannot be auctioned');
const listing = (await (await ok(createListing('seller', { auction: auctionTerms }), 201, 'create auction listing')).json()).listing;
const first = await state(listing.id, null);
const auctionId = first.auction.id;
assert.equal(first.auction.phase, 'active');
assert.equal(first.auction.nextMinimum, 100000);
assert.equal(first.auction.hasReserve, true);
assert.ok(!JSON.stringify(first).includes('150000'), 'the reserve price must stay hidden');
assert.ok(!JSON.stringify(first).includes('reserve_price') && !('reservePrice' in first.auction));
assert.equal(row(auctionId).ends_at - row(auctionId).starts_at, 24 * 3600 * 1000);

// --- bidding rules ---
await ok(bid(auctionId, 100000, null), 401, 'guest cannot bid');
await ok(bid(auctionId, 100000, 'seller'), 403, 'seller cannot bid on own auction');
await ok(auctions.POST(req('/api/auctions', 'POST', { auctionId, amount: 100000 }, 'bidA')), 400, 'rules must be accepted');
await ok(auctions.POST(req('/api/auctions', 'POST', { auctionId, amount: 100000, acceptRules: false }, 'bidA')), 400, 'rules must be accepted (false)');
await ok(bid(auctionId, 99999, 'bidA'), 409, 'below the starting price');
await ok(bid(auctionId, 100000 * 10 + 1, 'bidA'), 409, 'fat-finger guard');
await ok(bid(auctionId, 100000, 'bidA'), 201, 'first bid at the start price');
await ok(bid(auctionId, 200000, 'bidA'), 409, 'the leader cannot outbid themselves');
await ok(bid(auctionId, 104999, 'bidB'), 409, 'bid below current + step');
await ok(bid(auctionId, 105000, 'bidB'), 201, 'outbid by exactly one step');
const afterTwo = await state(listing.id, 'bidA');
assert.deepEqual([afterTwo.auction.currentBid, afterTwo.auction.nextMinimum, afterTwo.auction.bidCount], [105000, 110000, 2]);
assert.deepEqual(afterTwo.bids.map(item => [item.amount, item.bidder, item.mine]), [[105000, 'Участник 2', false], [100000, 'Участник 1', true]], 'history is anonymous and flags my bids');
assert.ok(!JSON.stringify(afterTwo).includes('bidA') && !JSON.stringify(afterTwo).includes('bidB'), 'bidder ids never leave the server');
const mineA = await (await ok(auctions.GET(req('/api/auctions?mine=1', 'GET', undefined, 'bidA')), 200, 'my auctions')).json();
assert.equal(mineA.auctions.length, 1); assert.equal(mineA.auctions[0].outbid, true, 'bidA was outbid'); assert.equal(mineA.auctions[0].role, 'bidder');
const mineSeller = await (await ok(auctions.GET(req('/api/auctions?mine=1', 'GET', undefined, 'seller')), 200, 'seller auctions')).json();
assert.equal(mineSeller.auctions[0].role, 'seller');
await ok(auctions.GET(req('/api/auctions?mine=1', 'GET', undefined, null)), 401, 'my auctions need sign-in');

// --- simultaneous equal bids: exactly one wins ---
const racers = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'];
const raced = await Promise.all(racers.map(who => bid(auctionId, 110000, who)));
assert.deepEqual(raced.map(r => r.status).sort((a, b) => a - b), [201, 409, 409, 409, 409, 409, 409, 409], 'only one of eight equal simultaneous bids is accepted');
const afterRace = row(auctionId);
assert.equal(afterRace.current_bid, 110000); assert.equal(afterRace.bid_count, 3);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM bids WHERE auction_id = ?').get(auctionId).n, 3, 'a rejected bid leaves no trace');
// ... and simultaneous different bids: the stored price is always the highest accepted bid
const chain = await Promise.all([115000, 120000, 125000, 130000].map((amount, i) => bid(auctionId, amount, 'c' + i)));
const accepted = chain.filter(r => r.status === 201).length;
assert.ok(accepted >= 1);
const finalRow = row(auctionId);
assert.equal(finalRow.current_bid, sqlite.prepare('SELECT MAX(amount) AS m FROM bids WHERE auction_id = ?').get(auctionId).m, 'the stored price is always the highest bid');
assert.equal(finalRow.bid_count, 3 + accepted);

// --- anti-sniping ---
const snipeListing = await plainListing('seller');
const nearEnd = insertAuction(snipeListing, 'seller', { endsAt: Date.now() + 60_000 });
await ok(bid(nearEnd, 100000, 'bidA'), 201, 'last-minute bid');
const extended = row(nearEnd);
assert.ok(extended.ends_at >= Date.now() + 110_000, 'the end moves to about two minutes from the bid'); assert.equal(extended.extensions, 1);
const farListing = await plainListing('seller');
const farEnd = insertAuction(farListing, 'seller', { endsAt: Date.now() + 3600_000 });
const farBefore = row(farEnd).ends_at;
await ok(bid(farEnd, 100000, 'bidA'), 201, 'early bid');
assert.equal(row(farEnd).ends_at, farBefore, 'an early bid does not extend the auction'); assert.equal(row(farEnd).extensions, 0);
const capListing = await plainListing('seller');
const capped = insertAuction(capListing, 'seller', { endsAt: Date.now() + 30_000 });
sqlite.prepare('UPDATE auctions SET extensions = 10 WHERE id = ?').run(capped);
const cappedEnd = row(capped).ends_at;
await ok(bid(capped, 100000, 'bidA'), 201, 'bid after the extension cap');
assert.equal(row(capped).ends_at, cappedEnd, 'extensions are capped at ten');

// --- scheduled, finished and settled auctions ---
const futureListing = await plainListing('seller');
const scheduled = insertAuction(futureListing, 'seller', { startsAt: Date.now() + 3600_000, endsAt: Date.now() + 7200_000 });
await ok(bid(scheduled, 100000, 'bidA'), 409, 'bids before the start are refused');
assert.equal((await state(futureListing, null)).auction.phase, 'scheduled');
const soldListing = await plainListing('seller'), reserveListing = await plainListing('seller'), emptyListing = await plainListing('seller');
const sold = insertAuction(soldListing, 'seller', { endsAt: Date.now() - 5000, currentBid: 120000, leader: 'bidA', reserve: 100000, bidCount: 3 });
const belowReserve = insertAuction(reserveListing, 'seller', { endsAt: Date.now() - 5000, currentBid: 120000, leader: 'bidA', reserve: 150000, bidCount: 3 });
const noBids = insertAuction(emptyListing, 'seller', { endsAt: Date.now() - 5000 });
const soldState = await state(soldListing, 'bidA');
assert.equal(soldState.auction.phase, 'ended'); assert.equal(soldState.auction.result, 'sold'); assert.equal(soldState.viewer.youWon, true);
assert.equal(row(belowReserve).result, 'reserve_not_met'); assert.equal(row(belowReserve).winner_id, null, 'no winner when the reserve is not reached');
assert.equal(row(noBids).result, 'no_bids');
assert.equal((await state(soldListing, 'bidB')).viewer.youWon, false);
await ok(bid(sold, 500000, 'bidB'), 409, 'no bids after the end');
const settledOnce = JSON.stringify(row(sold)); await state(soldListing, null); assert.equal(JSON.stringify(row(sold)), settledOnce, 'settling is idempotent');

// --- a hidden listing (for example restricted by a moderator) accepts no bids ---
const hiddenListing = await plainListing('seller');
const hiddenAuction = insertAuction(hiddenListing, 'seller', { endsAt: Date.now() + 3600_000 });
sqlite.prepare("UPDATE listings SET status = 'paused' WHERE id = ?").run(hiddenListing);
await ok(bid(hiddenAuction, 100000, 'bidA'), 409, 'no bids while the listing is hidden');
sqlite.prepare("UPDATE listings SET status = 'active' WHERE id = ?").run(hiddenListing);
await ok(bid(hiddenAuction, 100000, 'bidA'), 201, 'bids resume when the listing is visible again');

// --- cancellation ---
const cancelListing = await plainListing('seller');
const toCancel = insertAuction(cancelListing, 'seller', { endsAt: Date.now() + 3600_000 });
const cancel = (id, who) => cancelRoute.POST(req('/api/auctions/cancel', 'POST', { auctionId: id }, who));
await ok(cancel(toCancel, null), 401, 'guest cannot cancel');
await ok(cancel(toCancel, 'bidA'), 404, 'a stranger cannot cancel');
await ok(cancel(toCancel, 'seller'), 200, 'seller cancels an auction without bids');
assert.equal(row(toCancel).status, 'cancelled');
await ok(cancel(toCancel, 'seller'), 409, 'cancelled twice');
await ok(bid(toCancel, 100000, 'bidA'), 409, 'no bids on a cancelled auction');
await ok(cancel(auctionId, 'seller'), 409, 'cannot cancel after bids');

// --- pausing a listing with a live auction that has bids ---
await ok(listingStatus.POST(req('/api/listings/status', 'POST', { listingId: listing.id, status: 'paused' }, 'seller')), 409, 'cannot hide a listing during live bidding');
await ok(listingStatus.POST(req('/api/listings/status', 'POST', { listingId: cancelListing, status: 'paused' }, 'seller')), 200, 'a listing without bids can be paused');

// --- database triggers: the history cannot be rewritten even by a buggy code path ---
assert.throws(() => sqlite.prepare('UPDATE bids SET amount = 1 WHERE auction_id = ?').run(auctionId), /immutable/);
assert.throws(() => sqlite.prepare('UPDATE auctions SET start_price = 1 WHERE id = ?').run(auctionId), /locked/);
assert.throws(() => sqlite.prepare('UPDATE auctions SET reserve_price = 1 WHERE id = ?').run(auctionId), /locked/);
assert.throws(() => sqlite.prepare('UPDATE auctions SET ends_at = ends_at - 1000 WHERE id = ?').run(auctionId), /shortened/);
assert.throws(() => sqlite.prepare('UPDATE auctions SET current_bid = 1 WHERE id = ?').run(sold), /finished/);
assert.throws(() => sqlite.prepare("UPDATE auctions SET winner_id = 'bidB' WHERE id = ?").run(sold), /finished/);

// --- bid rate limit: 30 bids per hour per person ---
const busy = await plainListing('seller');
const live = insertAuction(busy, 'seller', { endsAt: Date.now() + 3600_000 * 5 });
const donor = insertAuction(await plainListing('seller'), 'seller', { endsAt: Date.now() + 3600_000 * 5 });
sqlite.prepare("INSERT OR IGNORE INTO users (id, email, display_name, created_at, updated_at) VALUES ('heavy','heavy@qoldan.test','H',1,1)").run();
for (let i = 1; i <= 30; i++) sqlite.prepare('INSERT INTO bids (id, auction_id, bidder_id, amount, created_at) VALUES (?,?,?,?,?)').run(crypto.randomUUID(), donor, 'heavy', i, Date.now());
await ok(bid(live, 100000, 'heavy'), 429, 'more than 30 bids per hour');

// --- notifications derived from auction events ---
for (const id of [sold, belowReserve]) sqlite.prepare('INSERT INTO bids (id, auction_id, bidder_id, amount, created_at) VALUES (?,?,?,?,?)').run(crypto.randomUUID(), id, 'bidA', 120000, Date.now()); // the directly inserted auctions had no bid rows
const titlesFor = async who => (await (await ok(bootstrap.GET(req('/api/bootstrap', 'GET', undefined, who)), 200, 'bootstrap ' + who)).json()).activities.map(item => item.title);
const bidderTitles = await titlesFor('bidA'), sellerTitles = await titlesFor('seller'), strangerTitles = await titlesFor('nobody');
assert.ok(bidderTitles.includes('Вы выиграли торги'), 'the winner is told');
assert.ok(bidderTitles.includes('Вашу ставку перебили'), 'an outbid bidder is told (main auction: bidB and later bids lead)');
assert.ok(sellerTitles.includes('Новая ставка в ваших торгах'), 'the seller sees new bids');
assert.ok(sellerTitles.includes('Торги завершены: товар продан'), 'the seller sees a sale');
assert.ok(sellerTitles.includes('Торги завершены: резервная цена не достигнута'), 'the seller sees a missed reserve');
assert.ok(!strangerTitles.some(title => title.includes('торг') || title.includes('ставк')), 'uninvolved users get no auction notices');

// --- the catalogue payload carries the public summary, never the reserve ---
const boot = await (await ok(bootstrap.GET(req('/api/bootstrap', 'GET', undefined, null)), 200, 'bootstrap')).json();
const summary = boot.listings.find(item => item.id === listing.id).auction;
assert.equal(summary.currentBid, finalRow.current_bid); assert.equal(summary.phase, 'active');
assert.ok(!JSON.stringify(boot).includes('150000'), 'the reserve never reaches the catalogue');

sqlite.close();
console.log('PASS auctions: creation rules, hidden reserve, anonymous history, one-step outbids, simultaneous bids, anti-sniping with cap, settlement with reserve, cancellation, DB immutability triggers, rate limit. No network writes.');
