const base=String(process.env.EVOLUTION_API_URL||'').replace(/\/$/,'');
const key=String(process.env.EVOLUTION_API_KEY||'');
function redact(s=''){return String(s).replace(/(apikey|token|authorization)\s*[:=]\s*[^,}\s]+/gi,'$1:[REDACTED]').slice(0,3000)}
(async()=>{
  const r=await fetch(base+'/instance/fetchInstances',{headers:{apikey:key}});
  const t=await r.text();
  if(r.ok){let d;try{d=JSON.parse(t)}catch{};const a=Array.isArray(d)?d:(Array.isArray(d?.instances)?d.instances:[]);console.log('EVOLUTION_FETCH_OK status='+r.status+' count='+a.length)}
  else console.log('EVOLUTION_FETCH_FAIL status='+r.status+' body='+redact(t));
})().catch(e=>{console.error('EVOLUTION_DIAG_ERROR '+e.message);process.exitCode=1});
