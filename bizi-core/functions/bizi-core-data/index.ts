import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from 'npm:@supabase/server@1.5.3'

const EXPECTED_KEY_HASH='9a282475f5afaa3ec5edacea466dbca831eed5f3500a7e5890b87fb0127edede'
async function sha256Hex(v:string){const b=new TextEncoder().encode(v);const d=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('')}
function json(body:unknown,status=200){return Response.json(body,{status})}
function normTime(v:string){const m=String(v??'').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);if(!m)return null;const h=+m[1],n=+m[2],s=+(m[3]??0);if(h>23||n>59||s>59)return null;return `${String(h).padStart(2,'0')}:${String(n).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
const mins=(v:string)=>{const [h,m]=v.slice(0,5).split(':').map(Number);return h*60+m}
const tstr=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}:00`
const overlap=(a:number,b:number,c:number,d:number)=>a<d&&b>c
const isoDate=(d:Date)=>d.toISOString().slice(0,10)
const addDays=(s:string,n:number)=>{const d=new Date(`${s}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return isoDate(d)}
const validEmail=(v:any)=>{const e=String(v??'').trim().toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)?e:null}
const clean=(v:any)=>String(v??'').trim()
const keyOf=(body:any)=>clean(body?.client_key)||'favfare'
const demoOf=(body:any)=>body?.is_demo===false?false:true

async function loadClient(ctx:any,clientKey:string){const {data,error}=await ctx.supabaseAdmin.from('bizi_clients').select('*').eq('client_key',clientKey).eq('active',true).maybeSingle();if(error)throw new Error('client_lookup_failed');return data}

async function patchSession(ctx:any,clientKey:string,sessionId:string,patch:any,isDemo=true){
  if(!sessionId)return
  const now=new Date().toISOString(),cleanPatch:any={...patch,updated_at:now}
  const u=await ctx.supabaseAdmin.from('conversation_sessions').update(cleanPatch).eq('client_key',clientKey).eq('session_id',sessionId).select('session_id').maybeSingle()
  if(!u.data){await ctx.supabaseAdmin.from('conversation_sessions').insert({client_key:clientKey,session_id:sessionId,history:[],is_demo:isDemo,...cleanPatch})}
}

async function catalogue(ctx:any,clientKey:string){
  const {data,error}=await ctx.supabaseAdmin.from('services').select('id,name,slug,price_display,public_description,service_sales_metadata(intent_tags,display_group,popular,display_order)').eq('client_key',clientKey).eq('active',true).eq('demo_seed_status','approved').order('name')
  if(error)return json({ok:false,error:'catalogue_lookup_failed'},500)
  const services=(data??[]).map((s:any)=>({id:s.id,name:s.name,slug:s.slug,price_display:s.price_display,public_description:s.public_description||'',intent_tags:s.service_sales_metadata?.intent_tags??[],display_group:s.service_sales_metadata?.display_group??'Other',popular:Boolean(s.service_sales_metadata?.popular),display_order:Number(s.service_sales_metadata?.display_order??100)})).sort((a:any,b:any)=>a.display_order-b.display_order||a.name.localeCompare(b.name))
  return json({ok:true,client_key:clientKey,services})
}

async function availabilityWindow(body:any,ctx:any,clientKey:string,isDemo:boolean){
  const today=isoDate(new Date()),start=/^\d{4}-\d{2}-\d{2}$/.test(String(body?.start_date??''))?String(body.start_date):today,days=Math.min(Math.max(Number(body?.days??14),1),31),end=addDays(start,days-1)
  const [rulesQ,blocksQ,apptsQ]=await Promise.all([
    ctx.supabaseAdmin.from('availability_rules').select('*').eq('client_key',clientKey).order('day_of_week'),
    ctx.supabaseAdmin.from('blocked_dates').select('blocked_date,start_time,end_time,active').eq('client_key',clientKey).gte('blocked_date',start).lte('blocked_date',end).eq('active',true),
    ctx.supabaseAdmin.from('appointments').select('appointment_date,start_time,end_time,status').eq('client_key',clientKey).gte('appointment_date',start).lte('appointment_date',end).eq('is_demo',isDemo).in('status',['held','confirmed'])
  ])
  if(rulesQ.error||blocksQ.error||apptsQ.error)return json({ok:false,error:'availability_window_lookup_failed'},500)
  const rules=new Map((rulesQ.data??[]).map((r:any)=>[Number(r.day_of_week),r])),dates=[] as any[]
  for(let i=0;i<days;i++){
    const date=addDays(start,i),d=new Date(`${date}T12:00:00Z`),rule:any=rules.get(d.getUTCDay())
    if(!rule||!rule.is_open||!rule.open_time||!rule.close_time){dates.push({date,is_open:false,available_count:0,slots:[]});continue}
    const step=Number(rule.slot_minutes??30),open=mins(rule.open_time),close=mins(rule.close_time),blocks=(blocksQ.data??[]).filter((b:any)=>b.blocked_date===date),appts=(apptsQ.data??[]).filter((a:any)=>a.appointment_date===date),slots=[] as any[]
    for(let s=open;s+step<=close;s+=step){const e=s+step;const blocked=blocks.some((b:any)=>!b.start_time||!b.end_time||overlap(s,e,mins(b.start_time),mins(b.end_time)));const occupied=appts.some((a:any)=>overlap(s,e,mins(a.start_time),mins(a.end_time)));slots.push({time:tstr(s).slice(0,5),available:!blocked&&!occupied,reason:blocked?'blocked':occupied?'booked':null})}
    dates.push({date,is_open:true,open_time:rule.open_time,close_time:rule.close_time,slot_minutes:step,available_count:slots.filter((x:any)=>x.available).length,slots})
  }
  return json({ok:true,client_key:clientKey,start_date:start,end_date:end,days:dates,auto_confirm:true})
}

async function getAvailability(ctx:any,clientKey:string,date:string,isDemo:boolean){const r:any=await availabilityWindow({start_date:date,days:1},ctx,clientKey,isDemo);const body=await r.json();if(!r.ok||!body.ok)return body;const day=body.days?.[0];return {ok:true,client_key:clientKey,date,is_open:Boolean(day?.is_open),open_time:day?.open_time??null,close_time:day?.close_time??null,slot_minutes:day?.slot_minutes??30,slots:(day?.slots??[]).filter((x:any)=>x.available).map((x:any)=>`${x.time}:00`),all_slots:day?.slots??[],auto_confirm:true}}

async function quoteAndCapture(body:any,ctx:any,clientKey:string,isDemo:boolean){
  const slug=clean(body?.service_slug);if(!slug)return json({ok:false,error:'service_slug_required'},400)
  const {data:s,error}=await ctx.supabaseAdmin.from('services').select('id,name,slug,price_display,price_type,price_min_ngn,price_max_ngn,demo_seed_status,needs_clinic_confirmation').eq('client_key',clientKey).eq('slug',slug).eq('active',true).maybeSingle();if(error)return json({ok:false,error:'service_lookup_failed'},500);if(!s)return json({ok:false,error:'service_not_found'},404)
  const allowed=s.demo_seed_status==='approved'&&s.needs_clinic_confirmation===false&&Boolean(s.price_display);if(!allowed)return json({ok:true,client_key:clientKey,quote_allowed:false,service:{id:s.id,name:s.name,slug:s.slug}})
  const full=clean(body?.full_name)||'WhatsApp Patient',phone=clean(body?.phone)||null,wa=clean(body?.whatsapp_id)||null,msg=clean(body?.message),now=new Date().toISOString(),sessionId=clean(body?.session_id)
  let contact:any=null;if(wa){const q=await ctx.supabaseAdmin.from('contacts').select('*').eq('client_key',clientKey).eq('whatsapp_id',wa).maybeSingle();contact=q.data}else if(phone){const q=await ctx.supabaseAdmin.from('contacts').select('*').eq('client_key',clientKey).eq('phone',phone).order('created_at',{ascending:false}).limit(1).maybeSingle();contact=q.data}
  if(contact){const q=await ctx.supabaseAdmin.from('contacts').update({full_name:full,phone:phone??contact.phone,whatsapp_id:wa??contact.whatsapp_id,last_contact_at:now}).eq('client_key',clientKey).eq('id',contact.id).select('*').single();if(q.error)return json({ok:false,error:'contact_update_failed'},500);contact=q.data}else{const q=await ctx.supabaseAdmin.from('contacts').insert({client_key:clientKey,full_name:full,phone,whatsapp_id:wa,last_contact_at:now}).select('*').single();if(q.error)return json({ok:false,error:'contact_insert_failed'},500);contact=q.data}
  const ex=await ctx.supabaseAdmin.from('enquiries').select('*').eq('client_key',clientKey).eq('contact_id',contact.id).eq('service_id',s.id).eq('is_demo',isDemo).in('status',['new','open']).order('updated_at',{ascending:false}).limit(1).maybeSingle();let enquiry:any
  if(ex.data){const q=await ctx.supabaseAdmin.from('enquiries').update({status:'open',conversation_summary:msg?`Asked about ${s.name}: ${msg}`:`Asked about ${s.name}`,next_action:'Continue patient conversation',updated_at:now}).eq('client_key',clientKey).eq('id',ex.data.id).select('*').single();if(q.error)return json({ok:false,error:'enquiry_update_failed'},500);enquiry=q.data}else{const q=await ctx.supabaseAdmin.from('enquiries').insert({client_key:clientKey,contact_id:contact.id,source:'whatsapp',service_id:s.id,status:'open',booking_status:'none',attention_status:'automated',automation_paused:false,next_action:'Continue patient conversation',conversation_summary:msg?`Asked about ${s.name}: ${msg}`:`Asked about ${s.name}`,is_demo:isDemo,demo_scenario:'sales_assistant'}).select('*').single();if(q.error)return json({ok:false,error:'enquiry_insert_failed'},500);enquiry=q.data}
  await patchSession(ctx,clientKey,sessionId,{contact_id:contact.id,enquiry_id:enquiry.id,service_slug:s.slug,service_name:s.name},isDemo)
  await ctx.supabaseAdmin.from('activities').insert([{client_key:clientKey,enquiry_id:enquiry.id,event_type:'patient_message_received',channel:'whatsapp',actor_type:'patient',metadata:{message:msg}},{client_key:clientKey,enquiry_id:enquiry.id,event_type:'price_quote_retrieved',channel:'whatsapp',actor_type:'assistant',metadata:{service_slug:s.slug,price_display:s.price_display,source:'client_catalogue'}}])
  return json({ok:true,client_key:clientKey,quote_allowed:true,service:{id:s.id,name:s.name,slug:s.slug,price_display:s.price_display,price_type:s.price_type,price_min_ngn:s.price_min_ngn,price_max_ngn:s.price_max_ngn},contact_id:contact.id,enquiry_id:enquiry.id})
}

async function saveDetailsAndCalendar(body:any,ctx:any,clientKey:string,isDemo:boolean){
  const contactId=clean(body?.contact_id),sessionId=clean(body?.session_id),fullName=clean(body?.full_name),email=validEmail(body?.email)
  if(!contactId)return json({ok:false,error:'contact_id_required'},400);if(!fullName)return json({ok:false,error:'full_name_required'},400);if(!email)return json({ok:false,error:'valid_email_required'},400)
  const q=await ctx.supabaseAdmin.from('contacts').update({full_name:fullName,email,last_contact_at:new Date().toISOString()}).eq('client_key',clientKey).eq('id',contactId).select('id,full_name,phone,whatsapp_id,email').single();if(q.error)return json({ok:false,error:'contact_update_failed'},500)
  await patchSession(ctx,clientKey,sessionId,{full_name:fullName,email,contact_id:contactId},isDemo)
  const cal:any=await availabilityWindow({start_date:body?.start_date,days:body?.days??14},ctx,clientKey,isDemo);const calendar=await cal.json();if(!cal.ok||!calendar.ok)return json({ok:false,error:calendar.error||'availability_failed'},500)
  return json({ok:true,client_key:clientKey,contact:q.data,...calendar})
}

async function autoBook(body:any,ctx:any,clientKey:string,isDemo:boolean){
  const enquiryId=clean(body?.enquiry_id),date=clean(body?.preferred_date),time=normTime(clean(body?.preferred_time)),sessionId=clean(body?.session_id);if(!enquiryId)return json({ok:false,error:'enquiry_id_required'},400);if(!date)return json({ok:false,error:'preferred_date_required'},400);if(!time)return json({ok:false,error:'preferred_time_invalid'},400)
  const a:any=await getAvailability(ctx,clientKey,date,isDemo);if(!a.ok)return json({ok:false,error:a.error||'availability_failed'},400);if(!a.is_open)return json({ok:false,error:'outside_booking_hours',alternatives:[]},409);if(!a.slots.includes(time))return json({ok:false,error:'slot_unavailable',alternatives:a.slots.slice(0,8)},409)
  const q=await ctx.supabaseAdmin.from('enquiries').select('id,contact_id,service_id').eq('client_key',clientKey).eq('id',enquiryId).eq('is_demo',isDemo).maybeSingle();if(q.error)return json({ok:false,error:'enquiry_lookup_failed'},500);if(!q.data)return json({ok:false,error:'enquiry_not_found'},404)
  const end=tstr(mins(time)+Number(a.slot_minutes??30)),now=new Date().toISOString();await ctx.supabaseAdmin.from('appointments').update({status:'cancelled',updated_at:now}).eq('client_key',clientKey).eq('enquiry_id',enquiryId).eq('is_demo',isDemo).in('status',['held','confirmed'])
  const ins=await ctx.supabaseAdmin.from('appointments').insert({client_key:clientKey,enquiry_id:enquiryId,contact_id:q.data.contact_id,service_id:q.data.service_id,appointment_date:date,start_time:time,end_time:end,status:'confirmed',source:'whatsapp',is_demo:isDemo,updated_at:now}).select('*').single();if(ins.error){return json({ok:false,error:'appointment_insert_failed'},500)}
  const up=await ctx.supabaseAdmin.from('enquiries').update({status:'booked',booking_status:'confirmed',preferred_date:date,preferred_time_window:time.slice(0,5),next_action:'Appointment confirmed automatically',updated_at:now}).eq('client_key',clientKey).eq('id',enquiryId);if(up.error)return json({ok:false,error:'enquiry_booking_update_failed'},500)
  await patchSession(ctx,clientKey,sessionId,{selected_date:date,selected_time:time,enquiry_id:enquiryId},isDemo)
  const {data:settings}=await ctx.supabaseAdmin.from('clinic_settings').select('key,value').eq('client_key',clientKey).in('key',['whatsapp','email']);const owner:any={};for(const x of settings??[])owner[x.key]=x.value
  await ctx.supabaseAdmin.from('activities').insert([{client_key:clientKey,enquiry_id:enquiryId,event_type:'booking_auto_confirmed',channel:'system',actor_type:'system',metadata:{appointment_id:ins.data.id,date,start_time:time,end_time:end}},{client_key:clientKey,enquiry_id:enquiryId,event_type:'patient_confirmation_sent',channel:'whatsapp',actor_type:'assistant',metadata:{appointment_id:ins.data.id,date,start_time:time}},{client_key:clientKey,enquiry_id:enquiryId,event_type:'owner_alert_queued',channel:'system',actor_type:'system',metadata:{appointment_id:ins.data.id,owner_whatsapp:owner.whatsapp??null,owner_email:owner.email??null}}])
  return json({ok:true,client_key:clientKey,booking_status:'confirmed',appointment_status:'confirmed',appointment_id:ins.data.id,preferred_date:date,preferred_time:time,end_time:end,confirmation_required:false,owner_alert_queued:true,reply:`You're booked for ${date} at ${time.slice(0,5)}. Your appointment is confirmed.`})
}

export default{fetch:withSupabase({auth:'none'},async(req,ctx)=>{
  if(req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405)
  const key=req.headers.get('x-bizi-core-key')??req.headers.get('x-favfare-demo-key')??'';if(!key||(await sha256Hex(key))!==EXPECTED_KEY_HASH)return json({ok:false,error:'unauthorized'},401)
  let b:any;try{b=await req.json()}catch{return json({ok:false,error:'invalid_json'},400)}
  const clientKey=keyOf(b),isDemo=demoOf(b),client=await loadClient(ctx,clientKey);if(!client)return json({ok:false,error:'client_not_found'},404)
  const a=clean(b?.action)
  if(a==='health')return json({ok:true,service:'bizi-core-data',version:1,client_key:clientKey})
  if(a==='catalogue')return catalogue(ctx,clientKey)
  if(a==='availability_window')return availabilityWindow(b,ctx,clientKey,isDemo)
  if(a==='save_details_and_calendar')return saveDetailsAndCalendar(b,ctx,clientKey,isDemo)
  if(a==='availability_for_date'){const r:any=await getAvailability(ctx,clientKey,clean(b?.date),isDemo);return json(r,r.ok?200:400)}
  if(a==='quote_and_capture')return quoteAndCapture(b,ctx,clientKey,isDemo)
  if(a==='request_booking')return autoBook(b,ctx,clientKey,isDemo)
  return json({ok:false,error:'unsupported_action'},400)
})}
