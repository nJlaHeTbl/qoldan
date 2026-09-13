import { z } from 'zod';
import { canModerate, forbidden, getMarketplaceDb, getRateLimitResponse, getViewer, serverError, unauthorized, upsertViewer } from '@/lib/server/marketplace-db';
import { KAZAKHSTAN_REGIONS } from '@/lib/regions';
import settlementRegions from '@/lib/server/settlement-regions.json';
export const dynamic = 'force-dynamic';
const inputSchema = z.object({
  settlementId:z.string().regex(/^(\d+|custom:[a-f0-9-]{36})$/),
  regionCode:z.enum(KAZAKHSTAN_REGIONS.map(r=>r.code)),
  name:z.string().trim().min(2).max(160),
  latitude:z.number().min(40).max(56), longitude:z.number().min(45).max(88),
  aliases:z.array(z.string().trim().min(1).max(160)).max(40),
  reason:z.string().trim().min(5).max(1000),
  expectedRevision:z.string().max(80), reset:z.boolean().default(false),
});

export async function GET(request:Request) {
  const viewer=getViewer(request);
  if(!viewer) return unauthorized();
  try {
    const admin=canModerate(viewer);
    const url=new URL(request.url);
    const target=url.searchParams.get('settlementId');
    const db=getMarketplaceDb();
    const rows=target
      ? await db.prepare(`SELECT id, settlement_id, region_code, name, latitude, longitude, aliases, reset, expected_revision, reason, status, created_at, reviewed_at FROM settlement_edits WHERE settlement_id=? AND (status='approved' OR owner_id=? OR ?=1) ORDER BY COALESCE(reviewed_at,created_at) DESC LIMIT 50`).bind(target,viewer.id,admin?1:0).all()
      : await db.prepare(`SELECT id, settlement_id, region_code, name, latitude, longitude, aliases, reset, expected_revision, reason, status, created_at, reviewed_at FROM settlement_edits WHERE status='pending' AND (owner_id=? OR ?=1) ORDER BY created_at LIMIT 100`).bind(viewer.id,admin?1:0).all();
    return Response.json({canEdit:admin,items:rows.results},{headers:{'cache-control':'no-store'}});
  } catch(e) {return serverError(e);}
}

export async function POST(request:Request) {
  const viewer=getViewer(request);
  if(!viewer) return unauthorized();
  try {
    const parsed=inputSchema.safeParse(await request.json());
    if(!parsed.success) return Response.json({error:'Проверьте название, координаты и описание исправления.'},{status:400});
    const data=parsed.data;
    if(data.reset && !canModerate(viewer)) return forbidden();
    const db=getMarketplaceDb();
    const baseRegion=(settlementRegions as Record<string,string>)[data.settlementId];
    const current=await db.prepare('SELECT region_code FROM settlement_overrides WHERE settlement_id=?').bind(data.settlementId).first<{region_code:string}>();
    if((!data.settlementId.startsWith('custom:') && !baseRegion) || (baseRegion && baseRegion!==data.regionCode) || (current && current.region_code!==data.regionCode)) {
      return Response.json({error:'Населённый пункт не относится к выбранному региону. Выберите его заново.'},{status:400});
    }
    const limited=await getRateLimitResponse(db.prepare('SELECT created_at FROM settlement_edits WHERE owner_id=? AND created_at>=? ORDER BY created_at DESC LIMIT 1 OFFSET 19').bind(viewer.id,Date.now()-3600000),3600000,'Можно отправить до 20 исправлений в час.');
    if(limited) return limited;
    await upsertViewer(viewer);
    const id=crypto.randomUUID();
    await db.prepare(`INSERT INTO settlement_edits (id,settlement_id,region_code,owner_id,name,latitude,longitude,aliases,reset,expected_revision,reason,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending',?)`).bind(id,data.settlementId,data.regionCode,viewer.id,data.name,data.latitude,data.longitude,JSON.stringify(data.aliases),data.reset?1:0,data.expectedRevision,data.reason,Date.now()).run();
    return Response.json({id,status:'pending'},{status:201});
  } catch(e) {if(e instanceof SyntaxError) return Response.json({error:'Некорректный запрос'},{status:400});return serverError(e);}
}

export async function PATCH(request:Request) {
  const viewer=getViewer(request);
  if(!viewer) return unauthorized();
  if(!canModerate(viewer)) return forbidden();
  try {
    const parsed=z.object({id:z.string().uuid(),action:z.enum(['approve','reject'])}).safeParse(await request.json());
    if(!parsed.success) return Response.json({error:'Некорректное действие'},{status:400});
    await upsertViewer(viewer);
    const db=getMarketplaceDb(), {id,action}=parsed.data, now=Date.now();
    if(action==='reject') {
      const result=await db.prepare("UPDATE settlement_edits SET status='rejected',reviewed_at=?,reviewed_by=? WHERE id=? AND status='pending'").bind(now,viewer.id,id).run();
      return result.meta.changes ? Response.json({ok:true}) : Response.json({error:'Предложение уже обработано'},{status:409});
    }
    const writes=await db.batch([
      db.prepare(`INSERT INTO settlement_overrides (settlement_id,region_code,name,latitude,longitude,aliases,reset,revision,updated_at)
        SELECT settlement_id,region_code,name,latitude,longitude,aliases,reset,id,? FROM settlement_edits e
        WHERE e.id=? AND e.status='pending' AND COALESCE((SELECT revision FROM settlement_overrides WHERE settlement_id=e.settlement_id),'')=e.expected_revision
        ON CONFLICT(settlement_id) DO UPDATE SET region_code=excluded.region_code,name=excluded.name,latitude=excluded.latitude,longitude=excluded.longitude,aliases=excluded.aliases,reset=excluded.reset,revision=excluded.revision,updated_at=excluded.updated_at`).bind(now,id),
      db.prepare("UPDATE settlement_edits SET status='approved',reviewed_at=?,reviewed_by=? WHERE id=? AND status='pending' AND changes()=1").bind(now,viewer.id,id),
    ]);
    if(!writes[1].meta.changes) return Response.json({error:'Точка уже изменена или предложение обработано. Загрузите актуальную версию и отправьте исправление заново.'},{status:409});
    return Response.json({ok:true});
  } catch(e) {return serverError(e);}
}
