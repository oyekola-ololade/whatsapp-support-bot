import './server.mjs';

const EVO=String(process.env.EVOLUTION_API_URL||'').replace(/\/$/,'');
const EVO_KEY=String(process.env.EVOLUTION_API_KEY||'');
const INSTANCE_NAME=String(process.env.INSTANCE_NAME||'favfare-primary').trim();
const WEBHOOK_URL=String(process.env.WEBHOOK_URL||'').trim();
const HOOK_SECRET=String(process.env.WEBHOOK_SHARED_SECRET||'');
const REQUIRED_EVENTS=['MESSAGES_UPSERT'];

const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const parse=async(r)=>{const t=await r.text();try{return t?JSON.parse(t):null}catch{return t}};

async function ensureWebhook(){
  if(!EVO||!EVO_KEY||!INSTANCE_NAME||!WEBHOOK_URL){
    console.log('WEBHOOK_WATCHDOG_SKIPPED missing_config');
    return;
  }
  try{
    const headers={apikey:EVO_KEY,'content-type':'application/json'};
    const found=await fetch(`${EVO}/webhook/find/${encodeURIComponent(INSTANCE_NAME)}`,{headers:{apikey:EVO_KEY}});
    const current=await parse(found);
    const currentEvents=Array.isArray(current?.events)?current.events:[];
    const currentHeaders=current?.headers&&typeof current.headers==='object'?current.headers:{};
    const healthy=found.ok&&current?.url===WEBHOOK_URL&&REQUIRED_EVENTS.every(e=>currentEvents.includes(e))&&(!HOOK_SECRET||currentHeaders['x-bizi-webhook-secret']===HOOK_SECRET);
    if(healthy){
      console.log('WEBHOOK_WATCHDOG_OK',INSTANCE_NAME);
      return;
    }
    const body={
      enabled:true,
      url:WEBHOOK_URL,
      events:REQUIRED_EVENTS,
      headers:HOOK_SECRET?{'x-bizi-webhook-secret':HOOK_SECRET}:{},
      byEvents:false,
      base64:false
    };
    const set=await fetch(`${EVO}/webhook/set/${encodeURIComponent(INSTANCE_NAME)}`,{method:'POST',headers,body:JSON.stringify(body)});
    const result=await parse(set);
    if(set.ok) console.log('WEBHOOK_WATCHDOG_APPLIED',INSTANCE_NAME,set.status);
    else console.log('WEBHOOK_WATCHDOG_FAILED',INSTANCE_NAME,set.status,typeof result==='string'?result.slice(0,300):JSON.stringify(result).slice(0,300));
  }catch(e){
    console.log('WEBHOOK_WATCHDOG_ERROR',e?.message||'unknown');
  }
}

await sleep(12000);
await ensureWebhook();
setInterval(ensureWebhook,60000);
