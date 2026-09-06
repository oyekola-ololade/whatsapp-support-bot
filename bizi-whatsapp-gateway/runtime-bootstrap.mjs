import fs from 'node:fs';

const serverPath = new URL('./server.mjs', import.meta.url);
let source = fs.readFileSync(serverPath, 'utf8');

const dryGateSource = '  const dry=GLOBAL_DRY_RUN||forceDryRun||n.dry_run;';
const dryGateReplacement = `  const outboundNumber=String(n.remote_jid||'').split('@')[0].replace(/\\D/g,'');
  const allowlist=String(process.env.OUTBOUND_TEST_ALLOWLIST||'').split(',').map(x=>x.replace(/\\D/g,'')).filter(Boolean);
  const testAllowed=allowlist.includes(outboundNumber);
  const dry=forceDryRun||n.dry_run||!testAllowed;
  console.log('OUTBOUND_POLICY',JSON.stringify({outbound_number:outboundNumber,test_allowed:testAllowed,dry,send_requested:proc.data.send===true}));`;

if (!source.includes(dryGateSource)) {
  throw new Error('outbound dry-run gate source not found');
}
source = source.replace(dryGateSource, dryGateReplacement);

const liveSelfTest = String(process.env.RUN_SELF_TEST || 'false') === 'true';
const testNumber = String(process.env.OUTBOUND_TEST_ALLOWLIST || '')
  .split(',')[0]
  ?.replace(/\D/g, '') || '';

if (liveSelfTest && testNumber) {
  const originalTestNumber = '2348000000999@s.whatsapp.net';
  if (!source.includes(originalTestNumber)) {
    throw new Error('self-test number source not found');
  }
  source = source.replace(originalTestNumber, `${testNumber}@s.whatsapp.net`);

  if (!source.includes('dry_run:true')) {
    throw new Error('self-test dry_run source not found');
  }
  source = source.replace('dry_run:true', 'dry_run:false');

  if (!source.includes('forceDryRun:true')) {
    throw new Error('self-test forceDryRun source not found');
  }
  source = source.replaceAll('forceDryRun:true', 'forceDryRun:false');

  if (source.includes('error:a?.error||null,')) {
    source = source.replace(
      'error:a?.error||null,',
      'error:a?.error||null,\n    send_status:a?.send_status||null,'
    );
  }
}

fs.writeFileSync(serverPath, source);
console.log('RUNTIME_GATE_PATCH_APPLIED', JSON.stringify({
  global_dry_run: String(process.env.GLOBAL_DRY_RUN || 'true') !== 'false',
  allowlist_count: String(process.env.OUTBOUND_TEST_ALLOWLIST || '').split(',').map(x=>x.trim()).filter(Boolean).length,
  live_self_test: liveSelfTest && Boolean(testNumber)
}));

await import('./bootstrap.mjs');
