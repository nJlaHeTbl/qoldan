'use client';
import { useEffect,useState } from 'react';
import {KAZAKHSTAN_REGIONS} from '@/lib/regions';
import {getRegionCenter} from '@/lib/geo';
import {SettlementSearch,type Settlement} from '@/components/SettlementSearch';
import {MapEditPoint} from '@/components/MapEditPoint';

type Edit={id:string;settlement_id:string;region_code:string;name:string;latitude:number;longitude:number;aliases:string;reset:number;reason:string;status:string;expected_revision:string;reviewed_at:number|null};
export default function MapEditor() {
  const [region,setRegion]=useState('Область Жетісу'),[query,setQuery]=useState(''),[selected,setSelected]=useState<Settlement|null>(null);
  const [name,setName]=useState(''),[point,setPoint]=useState(getRegionCenter(region)),[reason,setReason]=useState('');
  const [admin,setAdmin]=useState(false),[signedIn,setSignedIn]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [queue,setQueue]=useState<Edit[]>([]),[history,setHistory]=useState<Edit[]>([]),[refresh,setRefresh]=useState(0);
  const code=KAZAKHSTAN_REGIONS.find(r=>r.name===region)!.code;
  async function api(url:string, options?:RequestInit) {
    const r=await fetch(url,options);const data=await r.json() as any;
    if(!r.ok) throw new Error(data.error || 'Не удалось выполнить действие');
    return data;
  }
  async function loadQueue() {
    setLoading(true);
    try {
      const r=await fetch('/api/settlement-edits');
      if(r.status===401){setSignedIn(false);return;}
      const data=await r.json() as {canEdit:boolean;items:Edit[];error?:string};
      if(!r.ok)throw new Error(data.error || 'Не удалось загрузить предложения');
      setSignedIn(true);setAdmin(data.canEdit);setQueue(data.items);
    } catch(e){setMessage(e instanceof Error?e.message:'Ошибка загрузки');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void loadQueue();},[]);
  useEffect(()=>{
    setHistory([]);
    if(!selected || !signedIn)return;
    let active=true;
    void api(`/api/settlement-edits?settlementId=${encodeURIComponent(selected.id)}`).then(d=>{if(active)setHistory(d.items);}).catch(()=>{});
    return()=>{active=false;};
  },[selected?.id,signedIn,refresh]);
  const pick=(p:Settlement)=>{setSelected(p);setName(p.name);setQuery(p.name);setPoint({latitude:p.latitude,longitude:p.longitude});setReason('');setMessage('');};
  async function submit(reset=false, restored?:Edit) {
    if(busy)return;
    if(!name.trim() || (!reset && !restored && reason.trim().length<5)){setMessage('Укажите название и причину исправления (не менее 5 символов).');return;}
    setBusy(true);setMessage('');
    try {
      const settlementId=selected?.id || `custom:${crypto.randomUUID()}`;
      const data={settlementId,regionCode:code,name:restored?.name || name.trim(),
        latitude:restored?.latitude ?? point.latitude,longitude:restored?.longitude ?? point.longitude,
        aliases:[...new Set([selected?.name || name,...(selected?.aliases || [])])].filter(Boolean).slice(0,40),
        expectedRevision:selected?.revision || '',reset:restored ? Boolean(restored.reset) : reset,
        reason:restored?`Восстановление версии ${restored.id}`:reset?'Возврат к исходному справочнику':reason};
      const result=await api('/api/settlement-edits',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
      if(admin) await api('/api/settlement-edits',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:result.id,action:'approve'})});
      if(admin && data.reset){setSelected(null);setName('');setQuery('');setPoint(getRegionCenter(region));}
      else if(admin){setSelected({...selected,id:settlementId,name:data.name,latitude:data.latitude,longitude:data.longitude,aliases:data.aliases,district:'',revision:result.id});setName(data.name);setPoint({latitude:data.latitude,longitude:data.longitude});}
      setMessage(admin?'Изменение опубликовано. Поиск населённых пунктов использует обновлённую версию.':'Предложение отправлено. Оно появится в справочнике после проверки.');
      setReason('');setRefresh(v=>v+1);await loadQueue();
    }catch(e){setMessage(e instanceof Error?e.message:'Не удалось сохранить. Ваш ввод сохранён.');await loadQueue();}
    finally{setBusy(false);}
  }
  async function decide(item:Edit,action:'approve'|'reject') {
    setBusy(true);
    try{await api('/api/settlement-edits',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,action})});setMessage(action==='approve'?'Исправление опубликовано':'Предложение отклонено');setSelected(null);setRefresh(v=>v+1);await loadQueue();}
    catch(e){setMessage(e instanceof Error?e.message:'Не удалось обработать');}finally{setBusy(false);}
  }
  return <main className="map-editor-page">
    <a href="/">← Вернуться в Qoldan</a>
    <h1>Редактор карты и населённых пунктов</h1>
    <p>{admin?'Режим администратора: изменения публикуются сразу, история сохраняется.':'Предложите правильное название, уточните точку или добавьте отсутствующий населённый пункт. Публикация — после проверки.'}</p>
    {!loading && !signedIn && <p><a href="/signin-with-chatgpt?return_to=%2Fmap-editor" target="_top">Войти, чтобы отправить исправление</a></p>}
    {signedIn && !admin && <p>Вы вошли как пользователь. Имя «разработчик» не даёт дополнительных прав; доступ администратора назначается отдельно.</p>}
    <section className="map-editor-grid">
      <div className="location-fields">
        <label>Регион<select value={region} onChange={e=>{setRegion(e.target.value);setQuery('');setSelected(null);setName('');setReason('');setPoint(getRegionCenter(e.target.value));}}>
          {KAZAKHSTAN_REGIONS.map(r=><option key={r.code} value={r.name}>{r.code} — {r.name}</option>)}
        </select></label>
        <SettlementSearch key={`${region}-${refresh}`} region={region} value={query} onChange={setQuery} onSelect={pick}/>
        <button type="button" onClick={()=>{setSelected(null);setName(query);setReason('');setPoint(getRegionCenter(region));}}>Добавить новый населённый пункт</button>
        <h2>{selected?'Исправление выбранного пункта':'Новый населённый пункт'}</h2>
        <label>Название<input value={name} onChange={e=>setName(e.target.value)} maxLength={160}/></label>
        <p>Нажмите на карту или перетащите маркер. Здесь указывается центр населённого пункта, не частный адрес.</p>
        <MapEditPoint point={point} onChange={setPoint}/>
        <small>Широта: {point.latitude.toFixed(6)} · долгота: {point.longitude.toFixed(6)}</small>
        <label>Что исправить и источник информации<textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000} placeholder="Например: новое название; ссылка на постановление или местный источник"/></label>
        <button type="button" disabled={!signedIn || busy || loading} onClick={()=>void submit()}>{busy?'Сохраняем…':admin?'Опубликовать изменение':'Отправить на проверку'}</button>
        {admin && selected?.revision && <button type="button" disabled={busy} onClick={()=>{if(window.confirm('Вернуть исходный справочник? Для добавленной вручную точки это уберёт её из поиска.'))void submit(true);}}>Вернуть исходную версию</button>}
        <p role="status" aria-live="polite">{message}</p>
      </div>
      <aside>
        <h2>{admin?'Очередь предложений':'Мои предложения на проверке'}</h2>
        <button type="button" disabled={busy || loading} onClick={()=>void loadQueue()}>Обновить</button>
        {loading?<p>Загружаем…</p>:queue.length===0?<p>Предложений на проверке нет.</p>:queue.map(item=><article key={item.id}>
          <b>{item.name}</b><p>{KAZAKHSTAN_REGIONS.find(r=>r.code===item.region_code)?.name}</p><p>{item.reason}</p><small>{item.latitude}, {item.longitude}</small>
          <button type="button" onClick={()=>{setRegion(KAZAKHSTAN_REGIONS.find(r=>r.code===item.region_code)!.name);pick({id:item.settlement_id,name:item.name,latitude:item.latitude,longitude:item.longitude,aliases:JSON.parse(item.aliases),district:'',revision:item.expected_revision});setReason(item.reason);}}>Посмотреть на карте</button>
          {admin && <><button type="button" disabled={busy} onClick={()=>{if(window.confirm(`Опубликовать исправление «${item.name}»?`))void decide(item,'approve');}}>Одобрить</button><button type="button" disabled={busy} onClick={()=>void decide(item,'reject')}>Отклонить</button></>}
        </article>)}
        <h2>История выбранного пункта</h2>
        {!history.length && <p>Выберите населённый пункт. Если правок ещё не было, используется GeoNames.</p>}
        {history.map(item=><article key={item.id}><b>{item.name}</b><p>{item.status==='approved'?'Опубликовано':item.status==='rejected'?'Отклонено':'На проверке'} · {item.reason}</p>
          {admin && item.status==='approved' && <button type="button" disabled={busy} onClick={()=>{if(window.confirm('Восстановить эту версию? Действие будет записано в историю.'))void submit(false,item);}}>Восстановить версию</button>}
        </article>)}
      </aside>
    </section>
  </main>;
}
