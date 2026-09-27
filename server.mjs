import http from 'node:http';
import pg from 'pg';

const {Client}=pg;
const PORT=Number(process.env.PORT||3000);
const EVO=String(process.env.EVOLUTION_API_URL||'').replace(/\/$/,'');
const EVO_KEY=String(process.env.EVOLUTION_API_KEY||'');
const EVO_DB=String(process.env.EVOLUTION_DATABASE_URL||'');
const CORE=String(process.env.BIZI_CORE_URL||'https://shftukueyostzbyqxmqw.supabase.co/functions/v1').replace(/\/$/,'');
const CORE_KEY=String(process.env.BIZI_CORE_KEY||'');
const HOOK_SECRET=String(process.env.WEBHOOK_SHARED_SECRET||'');
const TARGET_INSTANCE_ID=String(process.env.EVOLUTION_INSTANCE_ID||'');
const WEBHOOK_URL=String(process.env.WEBHOOK_URL||'');
const AUTO_CONFIGURE=String(process.env.AUTO_CONFIGURE||'false')==='true';
const AUTO_CREATE_INSTANCE=String(process.env.AUTO_CREATE_INSTANCE||'false')==='true';
const INSTANCE_NAME=String(process.env.INSTANCE_NAME||'favfare-primary').trim();
const LINK_ACCESS_TOKEN=String(process.env.LINK_ACCESS_TOKEN||process.env.QR_ACCESS_TOKEN||'');
const DEFAULT_COUNTRY_CODE=String(process.env.DEFAULT_COUNTRY_CODE||'234').replace(/\D/g,'');
const RUN_SELF_TEST=String(process.env.RUN_SELF_TEST||'false')==='true';
const GLOBAL_DRY_RUN=String(process.env.GLOBAL_DRY_RUN||'true')!=='false';

let instanceName='';
let instanceId='';
let instanceToken='';
let lastQrBase64='';

const clean=v=>String(v??'').trim();
const qi=v=>'"'+String(v).replaceAll('"','""')+'"';
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const j=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-robots-tag':'noindex, nofollow'});res.end(JSON.stringify(body))};
const html=(res,status,body)=>{res.writeHead(status,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow','referrer-policy':'no-referrer'});res.end(body)};
const redirect=(res,location,status=303)=>{res.writeHead(status,{location,'cache-control':'no-store','x-robots-tag':'noindex, nofollow','referrer-policy':'no-referrer'});res.end()};

async function api(url,opts={}){
  const r=await fetch(url,opts);
  const t=await r.text();
  let d;
  try{d=t?JSON.parse(t):null}catch{d=t}
  return {ok:r.ok,status:r.status,data:d};
}

function capture(row,token=''){
  instanceName=clean(row?.instanceName??row?.name??row?.instance?.instanceName??row?.instance?.name);
  instanceId=clean(row?.instanceId??row?.id??row?.instance?.instanceId??row?.instance?.id);
  instanceToken=clean(token||row?.token||row?.hash?.apikey||row?.hash||row?.instance?.token||instanceToken);
  return row;
}

function normalize(body){
  const d=Array.isArray(body?.data)?body.data[0]??{}:body?.data??{};
  const k=d.key??{};
  const msg=d.message??{};
  const event=clean(body?.event??d?.event).toLowerCase();
  return {
    event,
    instance_name:clean(body?.instance??d?.instanceName??d?.instance),
    instance_id:clean(d?.instanceId??body?.instanceId??body?.instance_id),
    remote_jid:clean(k?.remoteJid??d?.remoteJid),
    from_me:Boolean(k?.fromMe??d?.fromMe),
    message_id:clean(k?.id??d?.id),
    push_name:clean(d?.pushName??body?.pushName),
    message:clean(msg?.conversation??msg?.extendedTextMessage?.text??msg?.imageMessage?.caption??msg?.videoMessage?.caption??d?.text),
    dry_run:body?.dry_run===true
  };
}

async function core(path,body){
  return api(`${CORE}/${path}`,{
    method:'POST',
    headers:{'content-type':'application/json','x-bizi-core-key':CORE_KEY},
    body:JSON.stringify(body)
  });
}

async function resolveFromDb(){
  if(!EVO_DB)return null;
  const db=new Client({connectionString:EVO_DB});
  try{
    await db.connect();
    const meta=await db.query(`select c.table_schema,c.table_name,json_agg(c.column_name order by c.ordinal_position) columns from information_schema.columns c where c.table_schema not in ('pg_catalog','information_schema') group by c.table_schema,c.table_name having bool_or(lower(c.column_name)='id') and bool_or(lower(c.column_name) in ('name','instancename')) and bool_or(lower(c.column_name)='token') order by case when lower(c.table_name) like '%instance%' then 0 else 1 end,c.table_schema,c.table_name`);
    console.log('INSTANCE_DB_CANDIDATES',meta.rows.map(x=>`${x.table_schema}.${x.table_name}`).join(',')||'none');
    for(const m of meta.rows){
      const cols=Array.isArray(m.columns)?m.columns.map(String):[];
      const idCol=cols.find(x=>x.toLowerCase()==='id');
      const nameCol=cols.find(x=>['name','instancename'].includes(x.toLowerCase()));
      const tokenCol=cols.find(x=>x.toLowerCase()==='token');
      const statusCol=cols.find(x=>['connectionstatus','status','state'].includes(x.toLowerCase()));
      if(!idCol||!nameCol||!tokenCol)continue;
      const base=`select ${qi(idCol)} id,${qi(nameCol)} name,${qi(tokenCol)} token from ${qi(m.table_schema)}.${qi(m.table_name)}`;
      let row=null;
      if(TARGET_INSTANCE_ID){
        const direct=await db.query(`${base} where ${qi(idCol)}::text=$1 or ${qi(nameCol)}::text=$1 limit 1`,[TARGET_INSTANCE_ID]);
        row=direct.rows?.[0]||null;
        if(!row){
          const searchable=cols.filter(c=>c.toLowerCase()!=='token').slice(0,40);
          const clauses=searchable.map(c=>`${qi(c)}::text=$1`).join(' or ');
          if(clauses){
            const any=await db.query(`${base} where ${clauses} limit 2`,[TARGET_INSTANCE_ID]);
            if(any.rows?.length===1){
              row=any.rows[0];
              console.log('INSTANCE_DB_FIELD_MATCH',`${m.table_schema}.${m.table_name}`);
            }
          }
        }
      }
      if(!row&&INSTANCE_NAME){
        const byName=await db.query(`${base} where ${qi(nameCol)}::text=$1 limit 1`,[INSTANCE_NAME]);
        row=byName.rows?.[0]||null;
      }
      if(!row&&statusCol){
        const active=await db.query(`${base} where lower(coalesce(${qi(statusCol)}::text,'')) in ('open','connected','online','ready') limit 2`);
        if(active.rows?.length===1){
          row=active.rows[0];
          console.log('INSTANCE_DB_ACTIVE_FALLBACK',`${m.table_schema}.${m.table_name}`);
        }
      }
      if(!row){
        const single=await db.query(`${base} limit 2`);
        if(single.rows?.length===1){
          row=single.rows[0];
          console.log('INSTANCE_DB_SINGLETON_FALLBACK',`${m.table_schema}.${m.table_name}`);
        }
      }
      if(row){
        capture(row,row.token);
        console.log('INSTANCE_DB_RESOLVED',Boolean(instanceName),Boolean(instanceToken),`${m.table_schema}.${m.table_name}`);
        return row;
      }
    }
    console.log('INSTANCE_DB_NOT_FOUND');
    return null;
  }catch(e){
    console.log('INSTANCE_DB_LOOKUP_FAILED',e?.code||e?.message||'unknown');
    return null;
  }finally{
    await db.end().catch(()=>{});
  }
}

async function resolveInstance(){
  if(EVO&&EVO_KEY){
    const r=await api(`${EVO}/instance/fetchInstances`,{headers:{apikey:EVO_KEY}});
    if(r.ok){
      const list=Array.isArray(r.data)?r.data:(Array.isArray(r.data?.instances)?r.data.instances:[]);
      const row=list.find(x=>clean(x?.id??x?.instanceId??x?.instance?.instanceId)===TARGET_INSTANCE_ID)
        ||list.find(x=>clean(x?.name??x?.instanceName??x?.instance?.instanceName)===INSTANCE_NAME)
        ||list[0];
      if(row){
        capture(row);
        console.log('INSTANCE_API_RESOLVED',Boolean(instanceName),Boolean(instanceToken));
        if(instanceName)return row;
      }
    }else{
      console.log('INSTANCE_API_LOOKUP_FAILED',r.status);
    }
  }
  return resolveFromDb();
}

async function createInstance(){
  if(!AUTO_CREATE_INSTANCE||instanceName||!EVO||!EVO_KEY||!INSTANCE_NAME)return null;
  const webhook=WEBHOOK_URL?{
    url:WEBHOOK_URL,
    byEvents:false,
    base64:false,
    headers:{'x-bizi-webhook-secret':HOOK_SECRET},
    events:['MESSAGES_UPSERT','CONNECTION_UPDATE','QRCODE_UPDATED']
  }:undefined;
  const body={
    instanceName:INSTANCE_NAME,
    qrcode:true,
    integration:'WHATSAPP-BAILEYS',
    groupsIgnore:true,
    alwaysOnline:false,
    readMessages:false,
    readStatus:false,
    syncFullHistory:false,
    ...(webhook?{webhook}:{})
  };
  const r=await api(`${EVO}/instance/create`,{
    method:'POST',
    headers:{apikey:EVO_KEY,'content-type':'application/json'},
    body:JSON.stringify(body)
  });
  console.log('INSTANCE_CREATE_ATTEMPT',r.status);
  if(!r.ok){
    console.log('INSTANCE_CREATE_FAILED',r.status);
    return null;
  }
  capture(r.data?.instance??r.data,r.data?.hash?.apikey??r.data?.hash);
  lastQrBase64=clean(r.data?.qrcode?.base64??r.data?.base64);
  console.log('INSTANCE_CREATED',instanceName||'unknown',instanceId||'unknown',Boolean(instanceToken),Boolean(lastQrBase64));
  return r.data;
}

const authKey=()=>instanceToken||EVO_KEY;

async function configureWebhook(){
  if(!AUTO_CONFIGURE||!WEBHOOK_URL||!instanceName||!authKey())return;
  const body={
    enabled:true,
    url:WEBHOOK_URL,
    byEvents:false,
    base64:false,
    events:['MESSAGES_UPSERT'],
    headers:{'x-bizi-webhook-secret':HOOK_SECRET}
  };
  const r=await api(`${EVO}/webhook/set/${encodeURIComponent(instanceName)}`,{
    method:'POST',
    headers:{apikey:authKey(),'content-type':'application/json'},
    body:JSON.stringify(body)
  });
  console.log('WEBHOOK_CONFIG_ATTEMPT',r.status);
  if(r.ok)console.log('WEBHOOK_CONFIGURED',instanceName);
  else console.log('WEBHOOK_CONFIG_FAILED',r.status);
}

async function connectionState(){
  if(!instanceName||!authKey())return {ok:false,status:409,data:{error:'instance_not_ready'}};
  return api(`${EVO}/instance/connectionState/${encodeURIComponent(instanceName)}`,{headers:{apikey:authKey()}});
}

function normalizePhone(input){
  let digits=String(input??'').replace(/\D/g,'');
  if(digits.startsWith('00'))digits=digits.slice(2);
  if(digits.startsWith('0')&&DEFAULT_COUNTRY_CODE)digits=DEFAULT_COUNTRY_CODE+digits.slice(1);
  if(!/^[1-9]\d{7,14}$/.test(digits))return '';
  return digits;
}

function extractPairingCode(data){
  return clean(
    data?.pairingCode
    ??data?.pairing_code
    ??data?.code
    ??data?.qrcode?.pairingCode
    ??data?.qrcode?.pairing_code
    ??data?.qrcode?.code
  );
}

async function connectPairing(phone){
  if(!instanceName||!authKey())return {ok:false,status:409,data:{error:'instance_not_ready'}};
  const number=normalizePhone(phone);
  if(!number)return {ok:false,status:400,data:{error:'invalid_phone'}};
  const r=await api(`${EVO}/instance/connect/${encodeURIComponent(instanceName)}?number=${encodeURIComponent(number)}`,{
    headers:{apikey:authKey()}
  });
  return {...r,number,pairingCode:extractPairingCode(r.data)};
}

async function connectQr(){
  if(!instanceName||!authKey())return {ok:false,status:409,data:{error:'instance_not_ready'}};
  const r=await api(`${EVO}/instance/connect/${encodeURIComponent(instanceName)}`,{headers:{apikey:authKey()}});
  if(r.ok)lastQrBase64=clean(r.data?.base64??r.data?.qrcode?.base64??lastQrBase64);
  return r;
}

async function processEvent(body,{forceDryRun=false}={}){
  const n=normalize(body);
  const isMsg=['messages.upsert','messages_upsert','messages-upsert'].includes(n.event);
  if(!isMsg||n.from_me||n.remote_jid.endsWith('@g.us')||n.remote_jid==='status@broadcast'||!n.message){
    return {accepted:false,reason:'ignored_event'};
  }
  const iid=n.instance_id||instanceId||TARGET_INSTANCE_ID;
  if(!iid)return {accepted:false,reason:'instance_id_missing'};
  const route=await core('bizi-core-router',{
    action:'resolve_channel',
    provider:'evolution_api',
    external_instance_id:iid
  });
  if(!route.ok||!route.data?.ok){
    return {accepted:false,reason:'channel_not_found',route_status:route.status,instance_id:iid};
  }
  const ch=route.data.channel;
  const proc=await core('bizi-core-whatsapp',{
    action:'process_inbound',
    client_key:route.data.client_key,
    channel_id:ch.id,
    remote_jid:n.remote_jid,
    message:n.message,
    message_id:n.message_id,
    push_name:n.push_name,
    instance_name:n.instance_name||instanceName,
    is_demo:ch?.config?.is_demo===true
  });
  if(!proc.ok||!proc.data?.ok){
    return {accepted:true,processed:false,error:proc.data?.error||'core_failed',status:proc.status};
  }
  const dry=GLOBAL_DRY_RUN||forceDryRun||n.dry_run;
  if(proc.data.send===true&&!dry){
    const name=n.instance_name||instanceName;
    const key=authKey();
    if(!name)return {accepted:true,processed:true,sent:false,error:'instance_name_missing',result:proc.data};
    if(!key)return {accepted:true,processed:true,sent:false,error:'evolution_auth_missing',result:proc.data};
    const number=n.remote_jid.replace(/@s\.whatsapp\.net$/,'');
    const send=await api(`${EVO}/message/sendText/${encodeURIComponent(name)}`,{
      method:'POST',
      headers:{apikey:key,'content-type':'application/json'},
      body:JSON.stringify({number,text:proc.data.reply})
    });
    if(!send.ok){
      return {accepted:true,processed:true,sent:false,error:'evolution_send_failed',send_status:send.status,result:proc.data};
    }
    const outId=clean(send.data?.key?.id??send.data?.data?.key?.id??send.data?.message?.key?.id)||`out-${n.message_id}-${Date.now()}`;
    await core('bizi-core-whatsapp',{
      action:'record_outbound',
      client_key:proc.data.client_key,
      channel_id:proc.data.channel_id,
      outbound_message_id:outId,
      remote_jid:n.remote_jid,
      reply:proc.data.reply,
      source_inbound_id:proc.data.source_inbound_id
    });
    return {accepted:true,processed:true,sent:true,result:proc.data};
  }
  return {accepted:true,processed:true,sent:false,dry_run:dry,result:proc.data};
}

async function selfTest(){
  if(!RUN_SELF_TEST)return;
  const id=`bizi-selftest-${Date.now()}`;
  const routeId=TARGET_INSTANCE_ID||instanceId;
  const body={
    event:'messages.upsert',
    instance:instanceName||'favfare-selftest',
    dry_run:true,
    data:{
      instanceId:routeId,
      key:{remoteJid:'2348000000999@s.whatsapp.net',fromMe:false,id},
      pushName:'Bizi Gateway Self Test',
      message:{conversation:'hello'}
    }
  };
  const a=await processEvent(body,{forceDryRun:true});
  const b=await processEvent(body,{forceDryRun:true});
  console.log('SELF_TEST_RESULT',JSON.stringify({
    ok:a?.accepted===true&&a?.processed===true,
    sent:a?.sent,
    dry_run:a?.dry_run,
    error:a?.error||null,
    dedupe:b?.result?.duplicate===true||b?.duplicate===true,
    message_id:id
  }));
}

const shell=(title,content,extra='')=>`<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box}
body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0b0d10;color:#f6f8fb;min-height:100vh;display:grid;place-items:center;margin:0;padding:20px}
.card{width:min(100%,480px);background:#13171d;border:1px solid #252c35;border-radius:22px;padding:28px;box-shadow:0 24px 70px rgba(0,0,0,.35)}
.brand{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#72d8b2;font-weight:750}
h1{font-size:28px;line-height:1.15;margin:10px 0 10px}
p{color:#b8c0cc;line-height:1.55;margin:8px 0 18px}
label{display:block;font-size:13px;color:#dce2ea;margin:18px 0 7px}
input{width:100%;height:52px;border-radius:12px;border:1px solid #343c47;background:#0e1217;color:#fff;padding:0 15px;font-size:17px;outline:none}
input:focus{border-color:#72d8b2}
button,.button{width:100%;display:flex;align-items:center;justify-content:center;height:52px;border:0;border-radius:12px;background:#f3f6f8;color:#0b0d10;font-size:15px;font-weight:750;cursor:pointer;text-decoration:none;margin-top:14px}
.secondary{background:transparent;color:#dfe6ee;border:1px solid #343c47}
.hint{font-size:12px;color:#818b98;margin-top:9px}
.code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:34px;letter-spacing:.12em;text-align:center;background:#0b0e12;border:1px solid #343c47;border-radius:16px;padding:20px 10px;margin:20px 0;user-select:all}
.steps{margin:18px 0;padding-left:22px;color:#d7dde5;line-height:1.8}
.status{display:flex;gap:9px;align-items:center;border-radius:12px;padding:12px 14px;background:#0e1217;color:#aeb8c5;font-size:13px;margin-top:18px}
.dot{width:8px;height:8px;border-radius:999px;background:#d6a64c}
.ok .dot{background:#67d5a7}.ok{color:#9ee8c8}
.error{color:#ffb6b6;background:#291516;border:1px solid #5a292c;border-radius:12px;padding:12px 14px;margin:14px 0}
small{color:#7e8996}
</style>
</head>
<body><main class="card"><div class="brand">Bizi Systems</div>${content}</main>${extra}</body>
</html>`;

function linkStartHtml(token,error=''){
  const safeToken=encodeURIComponent(token);
  return shell('Connect WhatsApp',`
    <h1>Connect WhatsApp</h1>
    <p>Enter the WhatsApp number you want Bizi to connect. We’ll generate a pairing code so you can link it directly from the phone. No QR scan needed.</p>
    ${error?`<div class="error">${escapeHtml(error)}</div>`:''}
    <form method="post" action="/link-whatsapp/pair?token=${safeToken}">
      <label for="phone">WhatsApp phone number</label>
      <input id="phone" name="phone" inputmode="tel" autocomplete="tel" placeholder="+234 801 234 5678" required>
      <div class="hint">Use the full international number. Nigerian 0-prefix numbers are converted to +234 automatically.</div>
      <button type="submit">Generate pairing code</button>
    </form>
    <a class="button secondary" href="/link-whatsapp/qr?token=${safeToken}">Use QR instead</a>
  `);
}

function pairingHtml(token,phone,code){
  const safeToken=encodeURIComponent(token);
  const compact=String(code).replace(/\s/g,'');
  const pretty=compact.replace(/(.{4})/g,'$1 ').trim();
  const jsToken=JSON.stringify(token);
  return shell('WhatsApp pairing code',`
    <h1>Enter this code in WhatsApp</h1>
    <p>Pairing requested for <strong>+${escapeHtml(phone)}</strong>.</p>
    <div class="code" id="pairing-code">${escapeHtml(pretty)}</div>
    <button type="button" id="copy">Copy code</button>
    <ol class="steps">
      <li>Open WhatsApp on that phone.</li>
      <li>Open <strong>Linked devices</strong>.</li>
      <li>Tap <strong>Link a device</strong>.</li>
      <li>Choose <strong>Link with phone number instead</strong>.</li>
      <li>Enter the code above.</li>
    </ol>
    <div class="status" id="status"><span class="dot"></span><span>Waiting for WhatsApp to connect…</span></div>
    <a class="button secondary" href="/link-whatsapp?token=${safeToken}">Use another number</a>
  `,`<script>
  const token=${jsToken};
  const compact=${JSON.stringify(compact)};
  document.getElementById('copy').onclick=async()=>{try{await navigator.clipboard.writeText(compact);document.getElementById('copy').textContent='Copied'}catch{}};
  async function poll(){
    try{
      const r=await fetch('/link-whatsapp/status?token='+encodeURIComponent(token),{cache:'no-store'});
      const d=await r.json();
      if(d.connected){
        window.location.replace('/link-whatsapp/success');
        return;
      }
    }catch{}
    setTimeout(poll,3000);
  }
  poll();
  </script>`);
}

function connectedHtml(){
  return shell('WhatsApp connected successfully',`
    <h1>WhatsApp connected successfully</h1>
    <p>The WhatsApp session is linked to <strong>${escapeHtml(instanceName||INSTANCE_NAME)}</strong>. Bizi has detected the connection and the channel is ready for the controlled integration test.</p>
    <div class="status ok"><span class="dot"></span><span>Connection active</span></div>
    <p><small>Outbound automation is still locked in dry-run until the integration test is approved.</small></p>
  `);
}

function connectionPendingHtml(){
  return shell('WhatsApp connection pending',`
    <h1>Connection not active yet</h1>
    <p>WhatsApp has not completed the device-link handshake. Return to the secure linking page and generate a fresh code if needed.</p>
    <div class="status"><span class="dot"></span><span>Waiting for connection</span></div>
  `);
}

function qrHtml(base64,token){
  const src=base64.startsWith('data:image')?base64:`data:image/png;base64,${base64}`;
  return shell('QR fallback',`
    <h1>QR fallback</h1>
    <p>Use this only if pairing by phone number is unavailable.</p>
    <img style="display:block;background:#fff;padding:16px;border-radius:18px;width:min(78vw,320px);margin:20px auto" src="${src}" alt="WhatsApp QR code">
    <a class="button secondary" href="/link-whatsapp?token=${encodeURIComponent(token)}">Back to pairing code</a>
  `);
}

function authorized(u){
  return Boolean(LINK_ACCESS_TOKEN)&&u.searchParams.get('token')===LINK_ACCESS_TOKEN;
}

async function readBody(req,max=8192){
  let raw='';
  for await(const c of req){
    raw+=c;
    if(raw.length>max)throw new Error('body_too_large');
  }
  return raw;
}

const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);

    if(req.method==='GET'&&u.pathname==='/health'){
      const state=await connectionState().catch(()=>null);
      const connection=clean(state?.data?.instance?.state??state?.data?.state);
      return j(res,200,{
        ok:true,
        service:'bizi-whatsapp-gateway',
        instance_resolved:Boolean(instanceName),
        instance_name:instanceName||null,
        instance_id:instanceId||null,
        auth_resolved:Boolean(authKey()),
        connection_state:connection||null,
        global_dry_run:GLOBAL_DRY_RUN
      });
    }

    if(req.method==='GET'&&u.pathname==='/link-whatsapp/success'){
      const state=await connectionState();
      const connection=clean(state?.data?.instance?.state??state?.data?.state).toLowerCase();
      if(connection==='open')return html(res,200,connectedHtml());
      return html(res,409,connectionPendingHtml());
    }

    if(u.pathname.startsWith('/link-whatsapp')){
      if(!authorized(u))return j(res,404,{ok:false,error:'not_found'});

      if(req.method==='GET'&&u.pathname==='/link-whatsapp'){
        const state=await connectionState();
        const connection=clean(state?.data?.instance?.state??state?.data?.state).toLowerCase();
        if(connection==='open')return redirect(res,'/link-whatsapp/success');
        return html(res,200,linkStartHtml(LINK_ACCESS_TOKEN));
      }

      if(req.method==='POST'&&u.pathname==='/link-whatsapp/pair'){
        const raw=await readBody(req);
        const contentType=String(req.headers['content-type']||'');
        let phone='';
        if(contentType.includes('application/json')){
          try{phone=JSON.parse(raw||'{}')?.phone||''}catch{}
        }else{
          phone=new URLSearchParams(raw).get('phone')||'';
        }
        const normalized=normalizePhone(phone);
        if(!normalized)return html(res,400,linkStartHtml(LINK_ACCESS_TOKEN,'Enter a valid WhatsApp number in international format.'));
        const stateBefore=await connectionState();
        const before=clean(stateBefore?.data?.instance?.state??stateBefore?.data?.state).toLowerCase();
        if(before==='open')return redirect(res,'/link-whatsapp/success');
        const pair=await connectPairing(normalized);
        console.log('PAIRING_CODE_ATTEMPT',pair.status,Boolean(pair.pairingCode));
        if(!pair.ok){
          return html(res,pair.status||502,linkStartHtml(LINK_ACCESS_TOKEN,`Could not generate a pairing code (Evolution ${pair.status||'error'}).`));
        }
        if(!pair.pairingCode){
          const after=clean(pair.data?.instance?.state??pair.data?.instance?.status??pair.data?.state??pair.data?.status).toLowerCase();
          if(after==='open')return redirect(res,'/link-whatsapp/success');
          return html(res,502,linkStartHtml(LINK_ACCESS_TOKEN,'Evolution did not return a pairing code. Try again once, or use the QR fallback.'));
        }
        return html(res,200,pairingHtml(LINK_ACCESS_TOKEN,normalized,pair.pairingCode));
      }

      if(req.method==='GET'&&u.pathname==='/link-whatsapp/status'){
        const state=await connectionState();
        const connection=clean(state?.data?.instance?.state??state?.data?.state).toLowerCase();
        return j(res,state.ok?200:state.status||502,{
          ok:state.ok,
          connected:connection==='open',
          state:connection||null
        });
      }

      if(req.method==='GET'&&u.pathname==='/link-whatsapp/qr'){
        const qr=await connectQr();
        if(!qr.ok)return html(res,qr.status||502,linkStartHtml(LINK_ACCESS_TOKEN,`QR fallback unavailable (Evolution ${qr.status||'error'}).`));
        if(!lastQrBase64)return html(res,409,linkStartHtml(LINK_ACCESS_TOKEN,'Evolution did not return a QR code.'));
        return html(res,200,qrHtml(lastQrBase64,LINK_ACCESS_TOKEN));
      }

      return j(res,404,{ok:false,error:'not_found'});
    }

    if(req.method!=='POST'||u.pathname!=='/webhook/evolution'){
      return j(res,404,{ok:false,error:'not_found'});
    }
    if(HOOK_SECRET&&req.headers['x-bizi-webhook-secret']!==HOOK_SECRET){
      return j(res,401,{ok:false,error:'unauthorized'});
    }
    const raw=await readBody(req,1048576);
    let body;
    try{body=JSON.parse(raw||'{}')}catch{return j(res,400,{ok:false,error:'invalid_json'})}
    const result=await processEvent(body);
    return j(res,200,{ok:true,...result});
  }catch(e){
    console.error('REQUEST_ERROR',e?.message);
    return j(res,500,{ok:false,error:'internal_error'});
  }
});

server.listen(PORT,'0.0.0.0',async()=>{
  console.log('GATEWAY_READY',PORT,'GLOBAL_DRY_RUN',GLOBAL_DRY_RUN,'LINK_MODE pairing-code');
  await resolveInstance();
  if(!instanceName)await createInstance();
  await selfTest();
  await configureWebhook();
});