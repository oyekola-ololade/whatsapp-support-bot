import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = Number(process.env.PORT || 3000);
const BASE = process.env.DEMO_URL || 'https://bizi-dentist-demo-production.up.railway.app/';
const OUT = '/tmp/bizi-launch-assets';
const files = [
  '01-home-care-packages.png',
  '02-care3-personalisation.png',
  '03-patient-experience.png',
  '04-care3-unified-intake.png',
  '05-human-takeover.png',
  '06-care3-website.png',
  '07-care3-website-form.png',
  '08-website-enquiry-crm.png'
];
let running = false;
let lastRun = null;
let lastError = null;

const json = (res, status, body) => {
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  res.end(JSON.stringify(body));
};

async function shot(page, name, fullPage = true) {
  const p = path.join(OUT, name);
  await page.screenshot({path:p, fullPage});
  return p;
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function captureAll() {
  if (running) return {ok:false,error:'capture_already_running'};
  running = true; lastError = null;
  await fs.mkdir(OUT,{recursive:true});
  for (const f of files) await fs.rm(path.join(OUT,f),{force:true});
  let browser;
  try {
    browser = await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    const ctx = await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    const page = await ctx.newPage();
    page.setDefaultTimeout(25000);

    await page.goto(BASE,{waitUntil:'networkidle'});
    await page.locator('[data-care-card="1"]').waitFor();
    await shot(page,'01-home-care-packages.png',true);

    await page.locator('[data-pick-level="3"]').click();
    await page.waitForURL(/step=2&care=3/);
    await page.locator('#clinicName').fill('Bizi Green Dental');
    await page.locator('#location').fill('Lagos, Nigeria');
    await page.locator('#serviceName').fill('Dental Cleaning');
    await page.locator('#servicePrice').fill('₦25,000');
    await page.locator('#brandColor').evaluate(el=>{el.value='#18A36B';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForTimeout(300);
    await shot(page,'02-care3-personalisation.png',true);

    await page.locator('#buildBtn').click();
    await page.locator('#experience:not(.hidden)').waitFor();
    await page.waitForURL(/demo=/);
    await page.waitForTimeout(900);
    await shot(page,'03-patient-experience.png',true);

    await page.locator('[data-view="staff"]').click();
    await page.locator('#staffSurface .clinic-crm').waitFor();
    await page.waitForTimeout(600);
    await shot(page,'04-care3-unified-intake.png',true);

    await page.locator('[data-crm="enquiries"]').click();
    await page.locator('.data-row[data-enquiry]').first().waitFor();
    const rows = page.locator('.data-row[data-enquiry]');
    let target = rows.first();
    const count = await rows.count();
    for (let i=0;i<count;i++) {
      const txt = (await rows.nth(i).innerText()).toLowerCase();
      if (!txt.includes('website')) { target = rows.nth(i); break; }
    }
    await target.click();
    await page.locator('#takeoverAction').waitFor();
    await page.locator('#takeoverAction').click();
    await page.locator('.staff-chat').waitFor();
    await page.waitForTimeout(500);
    await shot(page,'05-human-takeover.png',true);

    await page.locator('[data-view="website"]').click();
    await page.locator('.fake-site-v3').waitFor();
    await page.waitForTimeout(500);
    await shot(page,'06-care3-website.png',true);

    const evidenceToken = Date.now().toString().slice(-8);
    const evidenceName = `Launch Demo Patient ${evidenceToken}`;
    const evidenceEmail = `launch.demo.${evidenceToken}@example.com`;
    const evidencePhoneInput = '08030000000';
    const evidencePhone = '+2348030000000';

    const form = page.locator('#webForm');
    await form.scrollIntoViewIfNeeded();
    await page.locator('#webName').fill(evidenceName);
    await page.locator('#webEmail').fill(evidenceEmail);
    await page.locator('#webPhone').fill(evidencePhoneInput);
    await page.locator('#webDate').fill(tomorrowISO());
    await page.waitForFunction(()=>{const s=document.querySelector('#webTime');return s && !s.disabled && [...s.options].some(o=>o.value);});
    const option = await page.locator('#webTime option').evaluateAll(opts=>opts.map(o=>o.value).find(Boolean));
    await page.locator('#webTime').selectOption(option);
    await page.locator('#webMessage').fill('I would like to confirm the appointment details.');

    // The launch evidence must show a real successful submission, not merely a filled form.
    await form.locator('button').click();
    await page.locator('#webFlow.show').waitFor();
    await page.waitForTimeout(500);
    await page.locator('#webFlow').screenshot({path:path.join(OUT,'07-care3-website-form.png')});

    await page.locator('#flowOpenCrm').click();
    await page.locator('#staffSurface .clinic-crm').waitFor();
    await page.locator('[data-crm="enquiries"]').click();
    await page.locator('.data-row[data-enquiry]').first().waitFor();
    const afterRows = page.locator('.data-row[data-enquiry]');
    const afterCount = await afterRows.count();
    let websiteRow = null;
    for (let i=0;i<afterCount;i++) {
      const txt = (await afterRows.nth(i).innerText()).toLowerCase();
      if (txt.includes(evidenceName.toLowerCase())) { websiteRow = afterRows.nth(i); break; }
    }
    if (!websiteRow) throw new Error(`submitted_website_enquiry_not_found:${evidenceName}`);

    await websiteRow.click();
    await page.locator('#detail').waitFor();
    await page.locator('#takeoverAction').waitFor();
    await page.waitForTimeout(300);

    const detailText = (await page.locator('#detail').innerText()).toLowerCase();
    const requiredEvidence = [evidenceName.toLowerCase(), evidenceEmail.toLowerCase(), evidencePhone.toLowerCase(), 'website'];
    for (const expected of requiredEvidence) {
      if (!detailText.includes(expected)) throw new Error(`crm_evidence_missing:${expected}`);
    }
    const actionText = (await page.locator('#takeoverAction').innerText()).trim().toLowerCase();
    if (!actionText.includes('contact patient')) throw new Error(`crm_action_mismatch:${actionText}`);

    await shot(page,'08-website-enquiry-crm.png',true);

    lastRun = new Date().toISOString();
    return {
      ok:true,
      lastRun,
      assets:files.map(f=>`/assets/${f}`),
      finalUrl:page.url(),
      websiteEvidence:{name:evidenceName,email:evidenceEmail,phone:evidencePhone,source:'website',action:'Contact patient'}
    };
  } catch (e) {
    lastError = String(e?.stack || e?.message || e);
    return {ok:false,error:lastError};
  } finally {
    running = false;
    if (browser) await browser.close().catch(()=>{});
  }
}

const server = http.createServer(async (req,res)=>{
  try {
    const u = new URL(req.url || '/','http://localhost');
    if (u.pathname === '/health') return json(res,200,{ok:true,service:'bizi-demo-screenshot-runner',running,lastRun,lastError});
    if (u.pathname === '/capture') {
      const out = await captureAll();
      return json(res,out.ok?200:500,out);
    }
    if (u.pathname === '/manifest') return json(res,200,{ok:true,lastRun,lastError,assets:files.map(f=>`/assets/${f}`)});
    if (u.pathname.startsWith('/assets/')) {
      const name = path.basename(u.pathname);
      if (!files.includes(name)) return json(res,404,{ok:false,error:'not_found'});
      const p = path.join(OUT,name);
      const data = await fs.readFile(p);
      res.writeHead(200,{'content-type':'image/png','cache-control':'public, max-age=300'});
      return res.end(data);
    }
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(`<h1>Bizi demo screenshot runner</h1><p><a href="/capture">Run capture</a></p><p><a href="/manifest">Manifest</a></p>`);
  } catch (e) { json(res,500,{ok:false,error:String(e?.message||e)}); }
});
server.listen(PORT,'0.0.0.0',()=>{
  console.log('BIZI_SCREENSHOT_RUNNER_READY',PORT);
  setTimeout(async()=>{
    const out=await captureAll();
    if(out.ok) console.log(`BIZI_AUTO_CAPTURE_COMPLETE|${out.lastRun}|${out.assets.length}|${out.websiteEvidence?.name||''}`);
    else console.error(`BIZI_AUTO_CAPTURE_FAILED|${String(out.error||'unknown')}`);
  },1500);
});
