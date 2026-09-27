import fs from 'node:fs';

const serverPath=new URL('./server.mjs',import.meta.url);
let source=fs.readFileSync(serverPath,'utf8');

function replaceLine(prefix,replacement){const lines=source.split('\n');const i=lines.findIndex(x=>x.startsWith(prefix));if(i>=0){lines[i]=replacement;source=lines.join('\n');return true}return false}
function replaceIf(find,repl){if(source.includes(find)){source=source.replace(find,repl);return true}return false}

replaceLine('const CORE=','const CORE=String(process.env.BIZI_CORE_URL||\'\').replace(/\\\/$/,\'\');');
replaceLine('const INSTANCE_NAME=','const INSTANCE_NAME=String(process.env.INSTANCE_NAME||\'\').trim();');
replaceLine('const DEFAULT_COUNTRY_CODE=','const DEFAULT_COUNTRY_CODE=String(process.env.DEFAULT_COUNTRY_CODE||\'\').replace(/\\D/g,\'\');');

const coreKey="const CORE_KEY=String(process.env.BIZI_CORE_KEY||'');";
if(!source.includes('const GROQ_KEY='))replaceIf(coreKey,coreKey+"\nconst GROQ_KEY=String(process.env.GROQ_API_KEY||'');");
replaceIf("    headers:{'content-type':'application/json','x-bizi-core-key':CORE_KEY},","    headers:{'content-type':'application/json','x-bizi-core-key':CORE_KEY,...(GROQ_KEY?{'x-groq-key':GROQ_KEY}:{})},");
replaceIf("    message:clean(msg?.conversation??msg?.extendedTextMessage?.text??msg?.imageMessage?.caption??msg?.videoMessage?.caption??d?.text),","    message:clean(msg?.conversation??msg?.extendedTextMessage?.text??msg?.buttonsResponseMessage?.selectedDisplayText??msg?.listResponseMessage?.title??msg?.templateButtonReplyMessage?.selectedDisplayText??msg?.interactiveResponseMessage?.body?.text??msg?.imageMessage?.caption??msg?.videoMessage?.caption??d?.text),");

if(!source.includes("const outboundNumber=String(n.remote_jid||'')"))replaceIf(
  '  const dry=GLOBAL_DRY_RUN||forceDryRun||n.dry_run;',
  `  const outboundNumber=String(n.remote_jid||'').split('@')[0].replace(/\\D/g,'');
  const allowlist=String(process.env.OUTBOUND_TEST_ALLOWLIST||'').split(',').map(x=>x.replace(/\\D/g,'')).filter(Boolean);
  const testAllowed=allowlist.length===0||allowlist.includes(outboundNumber);
  const dry=GLOBAL_DRY_RUN||forceDryRun||n.dry_run||!testAllowed;
  console.log('OUTBOUND_POLICY',JSON.stringify({test_allowed:testAllowed,dry,send_requested:proc.data.send===true}));`
);
if(!source.includes("error:'pre_send_blocked'"))replaceIf(
  '  if(proc.data.send===true&&!dry){',
  `  if(proc.data.send===true&&!dry){
    const pre=await core('bizi-core-whatsapp',{action:'pre_send_check',client_key:proc.data.client_key,channel_id:proc.data.channel_id,enquiry_id:proc.data.enquiry_id,remote_jid:n.remote_jid});
    if(!pre.ok||pre.data?.allowed!==true){
      return {accepted:true,processed:true,sent:false,error:'pre_send_blocked',pre_send:pre.data||null,result:proc.data};
    }`
);

source=source.replaceAll("instance:instanceName||'favfare-selftest'","instance:instanceName||'bizi-selftest'");
source=source.replaceAll("return redirect(res,'/link-whatsapp/success');","return redirect(res,'/link-whatsapp/success?token='+encodeURIComponent(LINK_ACCESS_TOKEN));");
source=source.replaceAll("window.location.replace('/link-whatsapp/success');","window.location.replace('/link-whatsapp/success?token='+encodeURIComponent(token));");
if(!source.includes("if(!authorized(u))return j(res,404,{ok:false,error:'not_found'});\n      const state=await connectionState();"))replaceIf(
  "    if(req.method==='GET'&&u.pathname==='/link-whatsapp/success'){\n      const state=await connectionState();",
  "    if(req.method==='GET'&&u.pathname==='/link-whatsapp/success'){\n      if(!authorized(u))return j(res,404,{ok:false,error:'not_found'});\n      const state=await connectionState();"
);
source=source.replace("        instance_name:instanceName||null,\n",'');
source=source.replace("        instance_id:instanceId||null,\n",'');
replaceIf("    return j(res,500,{ok:false,error:'internal_error'});","    return j(res,e?.message==='body_too_large'?413:500,{ok:false,error:e?.message==='body_too_large'?'body_too_large':'internal_error'});");

if(!String(process.env.BIZI_CORE_URL||'').trim())throw new Error('BIZI_CORE_URL required');
if(!String(process.env.BIZI_CORE_KEY||'').trim())throw new Error('BIZI_CORE_KEY required');
if(!String(process.env.INSTANCE_NAME||'').trim())throw new Error('INSTANCE_NAME required');

fs.writeFileSync(serverPath,source);
console.log('RUNTIME_GATE_PATCH_APPLIED',JSON.stringify({
  global_dry_run:String(process.env.GLOBAL_DRY_RUN||'true')!=='false',
  allowlist_count:String(process.env.OUTBOUND_TEST_ALLOWLIST||'').split(',').map(x=>x.trim()).filter(Boolean).length,
  interactive_inbound_parser:true,
  pre_send_gate:true,
  link_success_protected:true,
  explicit_runtime_config:true,
  ai_key_configured:Boolean(String(process.env.GROQ_API_KEY||'').trim())
}));

await import('./bootstrap.mjs');
