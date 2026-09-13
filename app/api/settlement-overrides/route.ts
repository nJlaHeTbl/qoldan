import { getMarketplaceDb, serverError } from '@/lib/server/marketplace-db';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const code=new URL(request.url).searchParams.get('region');
  if(!code || !/^(0[1-9]|1[0-9]|20)$/.test(code)) return Response.json({error:'Выберите регион'},{status:400});
  try {
    const result=await getMarketplaceDb().prepare('SELECT settlement_id AS id, name, latitude, longitude, aliases, reset, revision FROM settlement_overrides WHERE region_code=?').bind(code).all();
    return Response.json(result.results.map(r=>({...r, aliases:JSON.parse(String(r.aliases)),district:''})),{headers:{'cache-control':'no-store'}});
  } catch(e) {return serverError(e);}
}
