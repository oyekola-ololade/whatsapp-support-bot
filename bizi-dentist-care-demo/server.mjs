import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const CORE=String(process.env.BIZI_CORE_URL||'').replace(/\/$/,'');
const CORE_KEY=String(process.env.BIZI_CORE_KEY||'');
const RUN_SELF_TEST=String(process.env.RUN_DEMO_SELF_TEST||'false')==='true';
if(!CORE||!CORE_KEY){console.error('BIZI_DEMO_CONFIG_MISSING');process.exit(1)}

const files={'/':['index.html','text/html; charset=utf-8'],'/index.html':['index.html','text/html; charset=utf-8'],'/styles.css':['styles.css','text/css; charset=utf-8'],'/v2.css':['v2.css','text/css; charset=utf-8'],'/screenfit.css':['screenfit.css','text/css; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/live.js':['live.js','text/javascript; charset=utf-8'],'/v2.js':['v2.js','text/javascript; charset=utf-8']};
const security={'cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer','permissions-policy':'camera=(), microphone=(), geolocation=(), payment=()','content-security-policy':"default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; form-action 'self'"};
const send=(res,status,body,type='application/json; charset=utf-8')=>{res.writeHead(status,{'content-type':type,...security});res.end(type.startsWith('application/json')?JSON.stringify(body):body)};
async function readJson(req){let s='';for await(const c of req){s+=c;if(s.length>100000){const e=new Error('body_too_large');e.status=413;throw e}}try{return s?JSON.parse(s):{}}catch{const e=new Error('invalid_json');e.status=400;throw e}}
async function core(fn,body){const r=await fetch(`${CORE}/${fn}`,{method:'POST',headers:{'content-type':'application/json','x-bizi-core-key':CORE_KEY},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const text=await r.text();let data;try{data=text?JSON.parse(text):{}}catch{data={ok:false,error:'invalid_core_response'}}return {status:r.status,ok:r.ok,data}}
function demoIdentity(clientKey,salt=crypto.randomUUID()){const h=crypto.createHash('sha256').update(`${clientKey}:${salt}`).digest('hex'),tail=(BigInt(`0x${h.slice(0,12)}`)%10000000n).toString().padStart(7,'0'),digits=`234800${tail}`,remote=`${digits}@s.whatsapp.net`,sessionId=`wa-${remote.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,72)}`;return {remote,phone:`+${digits}`,sessionId}}
async function createPatientSession(config,salt){const clientKey=config?.client?.client_key,service=config?.services?.[0];if(!clientKey||!service?.slug)throw new Error('demo_config_incomplete');const id=demoIdentity(clientKey,salt),q=await core('bizi-core-data',{action:'quote_and_capture',client_key:clientKey,service_slug:service.slug,full_name:'Demo Patient',phone:id.phone,whatsapp_id:id.remote,session_id:id.sessionId,message:'Interactive clinic demo started',is_demo:true});if(!q.ok||q.data?.ok===false)throw new Error(q.data?.error||'demo_session_create_failed');return {demo_remote:id.remote,demo_session_id:id.sessionId,demo_enquiry_id:q.data.enquiry_id}}
async function loadConfigWithSession(clientKey){const cfg=await core('bizi-demo-generator',{action:'config',client_key:clientKey});if(!cfg.ok||cfg.data?.ok===false)return cfg;const session=await createPatientSession(cfg.data,crypto.randomUUID());return {ok:true,status:200,data:{...cfg.data,...session}}}

async function contextualServiceReply(clientKey,enquiryId,message,assistant){
  if(!enquiryId||assistant?.intent!=='browse'||/\bservices\b/i.test(message)||!/\b(service|price|cost|details|more about it)\b/i.test(message))return null;
  const d=await core('bizi-core-crm',{action:'enquiry_detail',client_key:clientKey,is_demo:true,enquiry_id:enquiryId});if(!d.ok||!d.data?.enquiry?.service?.slug)return null;
  const cfg=await core('bizi-demo-generator',{action:'config',client_key:clientKey});const svc=(cfg.data?.services||[]).find(x=>x.slug===d.data.enquiry.service.slug)||d.data.enquiry.service;
  const price=svc.price_display||'Price confirmed by the clinic',desc=svc.public_description||`${svc.name} is available at this clinic.`;
  return {ok:true,enquiry_id:enquiryId,handoff:false,suppressed:false,reply:`${svc.name}: ${desc} ${price==='Price confirmed by clinic'?'The clinic confirms the current price before booking.':`Current demo price: ${price}.`} If you want, I can help you book it.`,choices:[],menu_choices:[],intent:'service_detail'};
}

async function repairBooking(clientKey,enquiryId,message,assistant){
  const tm=String(message||'').match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/),date=assistant?.context?.selected_date;if(!tm||!date||!enquiryId||assistant?.booking_status==='confirmed')return null;
  if(!(assistant?.intent==='pick_time'||/slot is no longer available|pick another time/i.test(String(assistant?.reply||''))))return null;
  const time=`${String(Number(tm[1])).padStart(2,'0')}:${tm[2]}`,q=await core('bizi-demo-generator',{action:'confirm_booking',client_key:clientKey,enquiry_id:enquiryId,preferred_date:date,preferred_time:time});
  if(q.ok&&q.data?.ok!==false)return {ok:true,enquiry_id:enquiryId,handoff:false,suppressed:false,reply:`Done. Your appointment is confirmed for ${date} at ${time}.`,choices:[],menu_choices:[],intent:'booking_confirmed',booking_status:'confirmed',context:{...(assistant.context||{}),selected_date:date,selected_time:time}};
  if(q.status===409&&Array.isArray(q.data?.available_times))return {ok:true,enquiry_id:enquiryId,handoff:false,suppressed:false,reply:'That time has just become unavailable. Here are the times that are actually open now.',choices:[],menu_choices:q.data.available_times.slice(0,9).map(t=>({kind:'action',value:'time',time:t,label:t,description:''})),intent:'pick_time',context:{...(assistant.context||{}),selected_date:date,selected_time:null}};
  return null;
}

async function handleChat(body){
  const clientKey=String(body?.client_key||''),sessionId=String(body?.session_id||''),enquiryId=String(body?.enquiry_id||''),staffId=String(body?.staff_id||''),message=String(body?.message||'').trim().slice(0,12000);if(!clientKey.startsWith('demo-')||!sessionId||!message)return {status:400,data:{ok:false,error:'demo_chat_fields_required'}};
  if(/\b(human|person|staff|receptionist|talk to someone|speak to someone)\b/i.test(message)&&enquiryId&&staffId){const a=await core('bizi-core-crm',{action:'staff_action',client_key:clientKey,is_demo:true,enquiry_id:enquiryId,action_type:'take_over',staff_id:staffId});if(!a.ok||a.data?.ok===false)return a;return {status:200,data:{ok:true,enquiry_id:enquiryId,handoff:true,suppressed:false,reply:'Of course. I’ll hand this conversation to the clinic team now.',choices:[],menu_choices:[]}}}
  const r=await core('bizi-core-assistant',{action:'chat',client_key:clientKey,message,session_id:sessionId,is_demo:true,context:{}});if(!r.ok||r.data?.ok===false)return r;
  const effectiveEnquiry=r.data?.enquiry_id||enquiryId||null;
  const repaired=await repairBooking(clientKey,effectiveEnquiry,message,r.data);if(repaired)return {status:200,data:repaired};
  const contextual=await contextualServiceReply(clientKey,effectiveEnquiry,message,r.data);if(contextual)return {status:200,data:contextual};
  if(r.data?.handoff===true&&effectiveEnquiry&&staffId){const a=await core('bizi-core-crm',{action:'staff_action',client_key:clientKey,is_demo:true,enquiry_id:effectiveEnquiry,action_type:'take_over',staff_id:staffId});if(!a.ok||a.data?.ok===false)console.error('DEMO_HANDOFF_STATE_FAILED',a.status,a.data?.error||'unknown')}
  return {status:r.status,data:{...r.data,enquiry_id:effectiveEnquiry}}
}

async function api(req,res,u){
  const b=await readJson(req);let r;
  if(u.pathname==='/api/create'){const created=await core('bizi-demo-generator',{action:'create_demo',...b});if(!created.ok||created.data?.ok===false)r=created;else r=await loadConfigWithSession(created.data.client_key)}
  else if(u.pathname==='/api/config')r=await loadConfigWithSession(String(b.client_key||''));
  else if(u.pathname==='/api/new-session'){const cfg=await core('bizi-demo-generator',{action:'config',client_key:b.client_key});if(!cfg.ok||cfg.data?.ok===false)r=cfg;else{const session=await createPatientSession(cfg.data,crypto.randomUUID());r={status:200,data:{ok:true,...session}}}}
  else if(u.pathname==='/api/chat')r=await handleChat(b);
  else if(u.pathname==='/api/enquiries')r=await core('bizi-core-crm',{action:'list_enquiries',client_key:b.client_key,is_demo:true,limit:80});
  else if(u.pathname==='/api/detail')r=await core('bizi-core-crm',{action:'enquiry_detail',client_key:b.client_key,is_demo:true,enquiry_id:b.enquiry_id});
  else if(u.pathname==='/api/appointments')r=await core('bizi-core-crm',{action:'list_appointments',client_key:b.client_key,is_demo:true,limit:100});
  else if(u.pathname==='/api/action')r=await core('bizi-core-crm',{action:'staff_action',client_key:b.client_key,is_demo:true,enquiry_id:b.enquiry_id,action_type:b.action_type,staff_id:b.staff_id,follow_up_due_at:b.follow_up_due_at,note:b.note});
  else if(u.pathname==='/api/catalogue')r=await core('bizi-core-data',{action:'catalogue',client_key:b.client_key,is_demo:true});
  else if(u.pathname==='/api/availability')r=await core('bizi-demo-generator',{action:'available_times',client_key:b.client_key,date:b.date});
  else if(u.pathname==='/api/website')r=await core('bizi-demo-generator',{action:'website_enquiry',client_key:b.client_key,full_name:b.full_name,email:b.email,message:b.message,service_slug:b.service_slug});
  else if(u.pathname==='/api/request')r=await core('bizi-demo-generator',{action:'appointment_request',client_key:b.client_key,full_name:b.full_name,email:b.email,phone:b.phone,preferred_date:b.preferred_date,preferred_time:b.preferred_time,service_slug:b.service_slug});
  else return send(res,404,{ok:false,error:'not_found'});
  return send(res,r.status,r.data)
}

const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url||'/','http://localhost');if(req.method==='GET'&&u.pathname==='/health')return send(res,200,{ok:true,service:'bizi-dentist-live-demo',version:10,core_backed:true,booking_repair:true,guided_demo_ready:true,v2_assets:true,viewport_fit:true});if(u.pathname.startsWith('/api/')){if(req.method!=='POST')return send(res,405,{ok:false,error:'method_not_allowed'});return api(req,res,u)}if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{ok:false,error:'method_not_allowed'});const entry=files[u.pathname];if(!entry)return send(res,404,{ok:false,error:'not_found'});const [name,type]=entry,body=await fs.readFile(path.join(__dirname,name));res.writeHead(200,{'content-type':type,...security});if(req.method==='HEAD')return res.end();res.end(body)}catch(e){console.error('LIVE_DEMO_ERROR',e?.message||e);send(res,Number(e?.status)||500,{ok:false,error:e?.message||'internal_error'})}});
server.listen(PORT,'0.0.0.0',()=>console.log('BIZI_DENTIST_LIVE_DEMO_READY',PORT));

async function selfTest(){if(!RUN_SELF_TEST)return;try{const created=await core('bizi-demo-generator',{action:'create_demo',clinic_name:'Outcome Dental Test',location:'Demo City',brand_color:'#245f9d',featured_service:'Dental Cleaning',featured_price:'₦25,000',package_level:2});if(!created.ok||!created.data?.client_key)throw new Error(`create:${created.status}:${created.data?.error||'failed'}`);const cfg=await loadConfigWithSession(created.data.client_key),chat=await handleChat({client_key:created.data.client_key,session_id:cfg.data.demo_session_id,enquiry_id:cfg.data.demo_enquiry_id,staff_id:cfg.data.staff?.id,message:'How much is Dental Cleaning?'}),crm=await core('bizi-core-crm',{action:'list_enquiries',client_key:created.data.client_key,is_demo:true,limit:20});console.log('DEMO_SELF_TEST',JSON.stringify({created:true,session:Boolean(cfg.data.demo_session_id),chat_status:chat.status,chat_ok:chat.data?.ok===true,reply:Boolean(chat.data?.reply),crm_ok:crm.ok&&crm.data?.ok===true,enquiries:crm.data?.enquiries?.length||0,client_key:created.data.client_key}))}catch(e){console.error('DEMO_SELF_TEST_FAILED',e?.message||e)}}
setTimeout(selfTest,2500);
