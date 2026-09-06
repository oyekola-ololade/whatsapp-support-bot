import fs from 'node:fs';

const serverPath = new URL('./server.mjs', import.meta.url);
let source = fs.readFileSync(serverPath, 'utf8');

const coreKeySource = "const CORE_KEY=String(process.env.BIZI_CORE_KEY||'');";
const coreKeyReplacement = "const CORE_KEY=String(process.env.BIZI_CORE_KEY||'');\nconst GROQ_KEY=String(process.env.GROQ_API_KEY||'');";
if (!source.includes(coreKeySource)) throw new Error('core key source not found');
source = source.replace(coreKeySource, coreKeyReplacement);

const coreHeaderSource = "    headers:{'content-type':'application/json','x-bizi-core-key':CORE_KEY},";
const coreHeaderReplacement = "    headers:{'content-type':'application/json','x-bizi-core-key':CORE_KEY,...(GROQ_KEY?{'x-groq-key':GROQ_KEY}:{})},";
if (!source.includes(coreHeaderSource)) throw new Error('core header source not found');
source = source.replace(coreHeaderSource, coreHeaderReplacement);

const dryGateSource = '  const dry=GLOBAL_DRY_RUN||forceDryRun||n.dry_run;';
const dryGateReplacement = `  const outboundNumber=String(n.remote_jid||'').split('@')[0].replace(/\\D/g,'');
  const allowlist=String(process.env.OUTBOUND_TEST_ALLOWLIST||'').split(',').map(x=>x.replace(/\\D/g,'')).filter(Boolean);
  const testAllowed=allowlist.includes(outboundNumber);
  const dry=forceDryRun||n.dry_run||!testAllowed;
  console.log('OUTBOUND_POLICY',JSON.stringify({outbound_number:outboundNumber,test_allowed:testAllowed,dry,send_requested:proc.data.send===true}));`;

if (!source.includes(dryGateSource)) throw new Error('outbound dry-run gate source not found');
source = source.replace(dryGateSource, dryGateReplacement);

const plainMessageSource = "    message:clean(msg?.conversation??msg?.extendedTextMessage?.text??msg?.imageMessage?.caption??msg?.videoMessage?.caption??d?.text),";
const interactiveMessageReplacement = "    message:clean(msg?.conversation??msg?.extendedTextMessage?.text??msg?.buttonsResponseMessage?.selectedDisplayText??msg?.listResponseMessage?.title??msg?.templateButtonReplyMessage?.selectedDisplayText??msg?.interactiveResponseMessage?.body?.text??msg?.imageMessage?.caption??msg?.videoMessage?.caption??d?.text),";
if (!source.includes(plainMessageSource)) throw new Error('message normalizer source not found');
source = source.replace(plainMessageSource, interactiveMessageReplacement);

const liveSelfTest = String(process.env.RUN_SELF_TEST || 'false') === 'true';
const testNumber = String(process.env.OUTBOUND_TEST_ALLOWLIST || '').split(',')[0]?.replace(/\D/g, '') || '';

if (liveSelfTest && testNumber) {
  const originalTestNumber = '2348000000999@s.whatsapp.net';
  if (!source.includes(originalTestNumber)) throw new Error('self-test number source not found');
  source = source.replace(originalTestNumber, `${testNumber}@s.whatsapp.net`);
  if (!source.includes('dry_run:true')) throw new Error('self-test dry_run source not found');
  source = source.replace('dry_run:true', 'dry_run:false');
  if (!source.includes('forceDryRun:true')) throw new Error('self-test forceDryRun source not found');
  source = source.replaceAll('forceDryRun:true', 'forceDryRun:false');
  if (source.includes('error:a?.error||null,')) {
    source = source.replace('error:a?.error||null,','error:a?.error||null,\n    send_status:a?.send_status||null,');
  }
}

fs.writeFileSync(serverPath, source);
console.log('RUNTIME_GATE_PATCH_APPLIED', JSON.stringify({
  global_dry_run: String(process.env.GLOBAL_DRY_RUN || 'true') !== 'false',
  allowlist_count: String(process.env.OUTBOUND_TEST_ALLOWLIST || '').split(',').map(x=>x.trim()).filter(Boolean).length,
  live_self_test: liveSelfTest && Boolean(testNumber),
  interactive_inbound_parser: true,
  ai_key_configured: Boolean(String(process.env.GROQ_API_KEY || '').trim())
}));

await import('./bootstrap.mjs');

const interactiveMode = String(process.env.RUN_INTERACTIVE_TEST || '').toLowerCase();
if ((interactiveMode === 'buttons' || interactiveMode === 'list') && testNumber) {
  setTimeout(async () => {
    try {
      const evo = String(process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
      const key = String(process.env.EVOLUTION_API_KEY || '');
      const instance = String(process.env.INSTANCE_NAME || 'favfare-primary');
      let endpoint = '';
      let payload = null;
      if (interactiveMode === 'buttons') {
        endpoint = 'sendButtons';
        payload = {
          number: testNumber,
          title: 'Favfare assistant test',
          description: 'Choose one option below.',
          footer: 'Bizi Systems',
          buttons: [
            {type:'reply',displayText:'View services',id:'view_services'},
            {type:'reply',displayText:'Book appointment',id:'book_appointment'},
            {type:'reply',displayText:'Talk to staff',id:'talk_to_staff'}
          ]
        };
      } else {
        endpoint = 'sendList';
        payload = {
          number: testNumber,
          title: 'Favfare services',
          description: 'Choose a service to continue.',
          footerText: 'Bizi Systems',
          buttonText: 'View services',
          sections: [{
            title: 'Popular services',
            rows: [
              {title:'Dental cleaning',description:'Scaling and polishing',rowId:'dental_cleaning'},
              {title:'Favfare signature teeth whitening',description:'Whitening option',rowId:'favfare-signature-teeth-whitening'},
              {title:'Hollywood teeth whitening',description:'Premium whitening option',rowId:'hollywood-teeth-whitening'}
            ]
          }]
        };
      }
      const r = await fetch(`${evo}/message/${endpoint}/${encodeURIComponent(instance)}`, {
        method:'POST',
        headers:{apikey:key,'content-type':'application/json'},
        body:JSON.stringify(payload)
      });
      const body = await r.json().catch(async()=>({text:await r.text().catch(()=> '')}));
      console.log('INTERACTIVE_TEST_RESULT', JSON.stringify({
        mode: interactiveMode,
        status: r.status,
        ok: r.ok,
        message_id: body?.key?.id || body?.data?.key?.id || body?.message?.key?.id || null
      }));
    } catch (e) {
      console.log('INTERACTIVE_TEST_FAILED', interactiveMode, e?.message || 'unknown');
    }
  }, 8000);
}

if (String(process.env.RUN_ASSISTANT_SMOKE_TEST || 'false') === 'true') {
  setTimeout(async () => {
    try {
      const base = String(process.env.BIZI_CORE_URL || 'https://shftukueyostzbyqxmqw.supabase.co/functions/v1').replace(/\/$/, '');
      const groq = String(process.env.GROQ_API_KEY || '');
      const r = await fetch(`${base}/bizi-core-assistant`, {
        method: 'POST',
        headers: {'content-type':'application/json','x-bizi-core-key':String(process.env.BIZI_CORE_KEY || ''),...(groq?{'x-groq-key':groq}:{})},
        body: JSON.stringify({client_key:'favfare',action:'chat',message:'Hi, how much is teeth whitening?',is_demo:true})
      });
      const body = await r.json().catch(() => ({}));
      console.log('ASSISTANT_SMOKE_TEST', JSON.stringify({status:r.status,ok:body?.ok===true,provider:body?.provider||null,reply:body?.reply||null,choices:Array.isArray(body?.choices)?body.choices:[]}));
    } catch (e) {
      console.log('ASSISTANT_SMOKE_TEST_FAILED', e?.message || 'unknown');
    }
  }, 7000);
}
