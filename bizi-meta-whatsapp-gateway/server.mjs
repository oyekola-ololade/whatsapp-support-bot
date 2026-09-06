import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 3000);
const CORE = String(process.env.BIZI_CORE_URL || 'https://shftukueyostzbyqxmqw.supabase.co/functions/v1').replace(/\/$/, '');
const CORE_KEY = String(process.env.BIZI_CORE_KEY || '');
const META_TOKEN = String(process.env.META_ACCESS_TOKEN || '');
const META_PHONE_ID = String(process.env.META_PHONE_NUMBER_ID || '');
const META_WABA_ID = String(process.env.META_WABA_ID || '');
const META_VERIFY_TOKEN = String(process.env.META_VERIFY_TOKEN || 'bizi-meta-test-webhook-v1');
const META_APP_SECRET = String(process.env.META_APP_SECRET || '');
const META_REQUIRE_SIGNATURE = String(process.env.META_REQUIRE_SIGNATURE || 'false') === 'true';
const GRAPH_VERSION = String(process.env.META_GRAPH_VERSION || 'v26.0');
const TEST_RECIPIENT = String(process.env.META_TEST_RECIPIENT || '').replace(/\D/g, '');
const RUN_BUTTON_TEST = String(process.env.RUN_META_BUTTON_TEST || 'false') === 'true';

const clean = v => String(v ?? '').trim();
const digits = v => clean(v).replace(/\D/g, '');
const json = (res, status, body) => {
  res.writeHead(status, {'content-type':'application/json','cache-control':'no-store','x-robots-tag':'noindex, nofollow'});
  res.end(JSON.stringify(body));
};
const text = (res, status, body) => {
  res.writeHead(status, {'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'});
  res.end(String(body));
};

async function readBody(req){
  const chunks=[];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

function signatureOk(req, raw){
  if(!META_APP_SECRET) return !META_REQUIRE_SIGNATURE;
  const supplied=clean(req.headers['x-hub-signature-256']);
  if(!supplied.startsWith('sha256=')) return false;
  const expected='sha256='+crypto.createHmac('sha256',META_APP_SECRET).update(raw).digest('hex');
  try{return crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(expected))}catch{return false}
}

async function api(url, opts={}){
  const r=await fetch(url,opts);
  const body=await r.text();
  let data;
  try{data=body?JSON.parse(body):null}catch{data=body}
  return {ok:r.ok,status:r.status,data};
}

async function core(path, body, extraHeaders={}){
  return api(`${CORE}/${path}`,{
    method:'POST',
    headers:{'content-type':'application/json','x-bizi-core-key':CORE_KEY,...extraHeaders},
    body:JSON.stringify(body)
  });
}

async function subscribeWaba(){
  if(!META_TOKEN || !META_WABA_ID) return {ok:false,status:409,data:{error:'meta_waba_credentials_missing'}};
  return api(`https://graph.facebook.com/${encodeURIComponent(GRAPH_VERSION)}/${encodeURIComponent(META_WABA_ID)}/subscribed_apps`,{
    method:'POST',
    headers:{Authorization:`Bearer ${META_TOKEN}`,'content-type':'application/json'}
  });
}

function parseInbound(payload){
  const value=payload?.entry?.[0]?.changes?.[0]?.value;
  const meta=value?.metadata || {};
  const msg=value?.messages?.[0];
  if(!msg) return null;
  let message='';
  let interactive=null;
  if(msg.type==='text') message=clean(msg.text?.body);
  else if(msg.type==='button') message=clean(msg.button?.text || msg.button?.payload);
  else if(msg.type==='interactive'){
    const br=msg.interactive?.button_reply;
    const lr=msg.interactive?.list_reply;
    if(br){message=clean(br.title || br.id);interactive={type:'button_reply',id:clean(br.id),title:clean(br.title)}}
    else if(lr){message=clean(lr.title || lr.id);interactive={type:'list_reply',id:clean(lr.id),title:clean(lr.title),description:clean(lr.description)}}
  }
  if(!message) return null;
  return {
    phone_number_id:clean(meta.phone_number_id),
    display_phone_number:clean(meta.display_phone_number),
    remote:digits(msg.from),
    message_id:clean(msg.id),
    message,
    interactive,
    profile_name:clean(value?.contacts?.[0]?.profile?.name),
    raw_type:clean(msg.type)
  };
}

function optionId(choice,index){
  const base=clean(choice?.slug || choice?.value || choice?.date || choice?.time || choice?.label || `option_${index+1}`)
    .toLowerCase().replace(/[^a-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,200);
  return base || `option_${index+1}`;
}

async function sendMeta({to,textBody,choices=[]}){
  if(!META_TOKEN||!META_PHONE_ID) return {ok:false,status:409,data:{error:'meta_credentials_missing'}};
  const toDigits=digits(to);
  let body;
  const usable=Array.isArray(choices)?choices.filter(c=>clean(c?.label)).slice(0,10):[];
  if(usable.length>=1 && usable.length<=3){
    body={messaging_product:'whatsapp',recipient_type:'individual',to:toDigits,type:'interactive',interactive:{type:'button',body:{text:clean(textBody)||'Choose an option'},action:{buttons:usable.map((c,i)=>({type:'reply',reply:{id:optionId(c,i),title:clean(c.label).slice(0,20)}}))}}};
  }else if(usable.length>3){
    body={messaging_product:'whatsapp',recipient_type:'individual',to:toDigits,type:'interactive',interactive:{type:'list',body:{text:clean(textBody)||'Choose an option'},action:{button:'View options',sections:[{title:'Options',rows:usable.map((c,i)=>({id:optionId(c,i),title:clean(c.label).slice(0,24),description:clean(c.description).slice(0,72)}))}]}}};
  }else{
    body={messaging_product:'whatsapp',recipient_type:'individual',to:toDigits,type:'text',text:{preview_url:false,body:clean(textBody)}};
  }
  return api(`https://graph.facebook.com/${encodeURIComponent(GRAPH_VERSION)}/${encodeURIComponent(META_PHONE_ID)}/messages`,{
    method:'POST',
    headers:{Authorization:`Bearer ${META_TOKEN}`,'content-type':'application/json'},
    body:JSON.stringify(body)
  });
}

async function processMeta(payload){
  const n=parseInbound(payload);
  if(!n) return {accepted:false,reason:'no_supported_message'};
  const route=await core('bizi-core-router',{action:'resolve_channel',provider:'meta_cloud_api',external_instance_id:n.phone_number_id});
  if(!route.ok||!route.data?.ok) return {accepted:true,processed:false,reason:'channel_not_found',phone_number_id:n.phone_number_id};
  const ch=route.data.channel;
  const proc=await core('bizi-core-whatsapp',{
    action:'process_inbound',client_key:route.data.client_key,channel_id:ch.id,remote_jid:n.remote,message:n.message,message_id:n.message_id,push_name:n.profile_name,instance_name:n.phone_number_id,is_demo:ch?.config?.is_demo===true
  });
  if(!proc.ok||!proc.data?.ok) return {accepted:true,processed:false,error:proc.data?.error||'core_failed'};
  let sent=false,sendStatus=null,outId=null;
  if(proc.data.send===true && clean(proc.data.reply)){
    const s=await sendMeta({to:n.remote,textBody:proc.data.reply,choices:proc.data.choices||[]});
    sendStatus=s.status;
    if(s.ok){
      sent=true;
      outId=clean(s.data?.messages?.[0]?.id) || `meta-out-${Date.now()}`;
      await core('bizi-core-whatsapp',{action:'record_outbound',client_key:proc.data.client_key,channel_id:proc.data.channel_id,outbound_message_id:outId,remote_jid:n.remote,reply:proc.data.reply,source_inbound_id:proc.data.source_inbound_id||null});
    }
  }
  return {accepted:true,processed:true,sent,send_status:sendStatus,outbound_message_id:outId,result:proc.data,interactive:n.interactive};
}

const server=http.createServer(async (req,res)=>{
  try{
    const u=new URL(req.url,'http://localhost');
    if(req.method==='GET'&&u.pathname==='/health') return json(res,200,{ok:true,service:'bizi-meta-whatsapp-gateway',version:2,core_key_configured:Boolean(CORE_KEY),meta_token_configured:Boolean(META_TOKEN),phone_number_id_configured:Boolean(META_PHONE_ID),waba_id_configured:Boolean(META_WABA_ID),signature_required:META_REQUIRE_SIGNATURE});
    if(req.method==='GET'&&u.pathname==='/webhook/meta'){
      const mode=u.searchParams.get('hub.mode'),token=u.searchParams.get('hub.verify_token'),challenge=u.searchParams.get('hub.challenge');
      if(mode==='subscribe'&&token===META_VERIFY_TOKEN&&challenge) return text(res,200,challenge);
      return text(res,403,'Forbidden');
    }
    if(req.method==='POST'&&u.pathname==='/webhook/meta'){
      const raw=await readBody(req);
      if(!signatureOk(req,raw)) return text(res,401,'Invalid signature');
      let payload;try{payload=JSON.parse(raw.toString('utf8'))}catch{return json(res,400,{ok:false,error:'invalid_json'})}
      const result=await processMeta(payload);
      console.log('META_WEBHOOK_RESULT',JSON.stringify({accepted:result.accepted,processed:result.processed,sent:result.sent,send_status:result.send_status,reason:result.reason||null}));
      return json(res,200,{ok:true});
    }
    return json(res,404,{ok:false,error:'not_found'});
  }catch(e){console.error('META_GATEWAY_ERROR',e?.message||e);return json(res,500,{ok:false,error:'internal_error'})}
});

server.listen(PORT,()=>{
  console.log('BIZI_META_GATEWAY_READY',PORT,JSON.stringify({meta_token:Boolean(META_TOKEN),phone_id:Boolean(META_PHONE_ID),waba_id:Boolean(META_WABA_ID),signature_required:META_REQUIRE_SIGNATURE}));
  if(META_TOKEN && META_WABA_ID){
    setTimeout(async()=>{
      const r=await subscribeWaba();
      console.log('META_WABA_SUBSCRIBE_RESULT',JSON.stringify({ok:r.ok,status:r.status,success:r.data?.success===true,error:r.ok?null:r.data}));
    },2000);
  }
  if(RUN_BUTTON_TEST&&TEST_RECIPIENT){
    setTimeout(async()=>{
      const r=await sendMeta({to:TEST_RECIPIENT,textBody:'Favfare Cloud API button test',choices:[{label:'View services',value:'view_services'},{label:'Book appointment',value:'book_appointment'},{label:'Talk to staff',value:'talk_to_staff'}]});
      console.log('META_BUTTON_TEST_RESULT',JSON.stringify({ok:r.ok,status:r.status,message_id:clean(r.data?.messages?.[0]?.id)||null,error:r.ok?null:r.data}));
    },5000);
  }
});
