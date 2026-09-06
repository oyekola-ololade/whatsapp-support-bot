import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from 'npm:@supabase/server@1.5.3'

const EXPECTED_KEY_HASH='9a282475f5afaa3ec5edacea466dbca831eed5f3500a7e5890b87fb0127edede'
async function sha256Hex(v:string){const b=new TextEncoder().encode(v);const d=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('')}
function json(body:unknown,status=200){return Response.json(body,{status})}
const clean=(v:any)=>String(v??'').trim()
const clientOf=(b:any)=>clean(b?.client_key)||'favfare'
const demoOf=(b:any)=>b?.is_demo===false?false:true
function normTime(v:string){const m=String(v??'').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);if(!m)return null;const h=+m[1],mi=+m[2],s=+(m[3]??0);if(h>23||mi>59||s>59)return null;return `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function mins(v:string){const [h,m]=v.slice(0,5).split(':').map(Number);return h*60+m}
function asTime(n:number){return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}:00`}
function overlaps(a:number,b:number,c:number,d:number){return a<d&&b>c}
function validEmail(v:any){const e=clean(v).toLowerCase();if(!e)return null;return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)?e:false}
function validPhone(v:any){const raw=clean(v);const p=raw.replace(/[\s()\-.]/g,'');return /^\+?\d{7,15}$/.test(p)?p:null}

async function client(ctx:any,clientKey:string){const {data,error}=await ctx.supabaseAdmin.from('bizi_clients').select('*').eq('client_key',clientKey).eq('active',true).maybeSingle();if(error)throw new Error('client_lookup_failed');return data}
async function activity(ctx:any,clientKey:string,id:string,type:string,staffId:string,metadata:any={}){await ctx.supabaseAdmin.from('activities').insert({client_key:clientKey,enquiry_id:id,event_type:type,channel:'crm',actor_type:'staff',staff_id:staffId,metadata})}
async function staff(ctx:any,clientKey:string,id?:string){let q=ctx.supabaseAdmin.from('staff_profiles').select('id,display_name,role,active').eq('client_key',clientKey).eq('active',true);if(clean(id))q=q.eq('id',clean(id));else q=q.order('created_at',{ascending:true}).limit(1);const {data}=await q.maybeSingle();return data}
async function enquiry(ctx:any,clientKey:string,id:string,isDemo:boolean){const {data,error}=await ctx.supabaseAdmin.from('enquiries').select('*,contact:contacts(id,full_name,phone,whatsapp_id,email,last_contact_at),service:services(id,name,slug,price_display)').eq('client_key',clientKey).eq('id',id).eq('is_demo',isDemo).maybeSingle();if(error)throw error;return data}

async function slot(ctx:any,clientKey:string,date:string,time:string,isDemo:boolean,exclude?:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return{ok:false,error:'invalid_date'};const t=normTime(time);if(!t)return{ok:false,error:'invalid_time'}
  const dow=new Date(`${date}T12:00:00Z`).getUTCDay();const {data:r}=await ctx.supabaseAdmin.from('availability_rules').select('*').eq('client_key',clientKey).eq('day_of_week',dow).maybeSingle();if(!r||!r.is_open||!r.open_time||!r.close_time)return{ok:false,error:'outside_booking_hours'}
  const sm=Number(r.slot_minutes??30),start=mins(t),end=start+sm,open=mins(r.open_time),close=mins(r.close_time);if(start<open||end>close||((start-open)%sm!==0))return{ok:false,error:'outside_booking_hours'}
  const [{data:blocks},{data:appts}]=await Promise.all([
    ctx.supabaseAdmin.from('blocked_dates').select('start_time,end_time').eq('client_key',clientKey).eq('blocked_date',date).eq('active',true),
    ctx.supabaseAdmin.from('appointments').select('enquiry_id,start_time,end_time').eq('client_key',clientKey).eq('appointment_date',date).eq('is_demo',isDemo).in('status',['held','confirmed'])
  ])
  if((blocks??[]).some((b:any)=>!b.start_time||!b.end_time||overlaps(start,end,mins(b.start_time),mins(b.end_time))))return{ok:false,error:'slot_blocked'}
  if((appts??[]).some((a:any)=>a.enquiry_id!==exclude&&overlaps(start,end,mins(a.start_time),mins(a.end_time))))return{ok:false,error:'slot_unavailable'}
  return{ok:true,start_time:t,end_time:asTime(end)}
}

async function overview(ctx:any,clientKey:string,isDemo:boolean){
  const [{data:e,error:ee},{data:a,error:ae}]=await Promise.all([
    ctx.supabaseAdmin.from('enquiries').select('id,status,booking_status,attention_status,follow_up_due_at').eq('client_key',clientKey).eq('is_demo',isDemo),
    ctx.supabaseAdmin.from('appointments').select('id,status').eq('client_key',clientKey).eq('is_demo',isDemo)
  ]);if(ee||ae)return json({ok:false,error:'overview_failed'},500);const now=new Date();return json({ok:true,client_key:clientKey,metrics:{total_enquiries:(e??[]).length,new_or_open:(e??[]).filter((x:any)=>['new','open'].includes(x.status)).length,needs_human:(e??[]).filter((x:any)=>['needs_human','human_active'].includes(x.attention_status)).length,booking_requests:(e??[]).filter((x:any)=>['requested','proposed'].includes(x.booking_status)).length,confirmed_bookings:(e??[]).filter((x:any)=>x.booking_status==='confirmed').length,followups_due:(e??[]).filter((x:any)=>x.follow_up_due_at&&new Date(x.follow_up_due_at)<=now&&x.status!=='closed').length,active_appointments:(a??[]).filter((x:any)=>['held','confirmed'].includes(x.status)).length}})}

async function listEnquiries(body:any,ctx:any,clientKey:string,isDemo:boolean){let q=ctx.supabaseAdmin.from('enquiries').select('id,source,status,booking_status,preferred_date,preferred_time_window,attention_status,automation_paused,follow_up_due_at,next_action,conversation_summary,staff_note,created_at,updated_at,contact:contacts(id,full_name,phone,whatsapp_id,email,last_contact_at),service:services(id,name,slug,price_display)').eq('client_key',clientKey).eq('is_demo',isDemo).order('updated_at',{ascending:false}).limit(Math.min(Math.max(Number(body?.limit??50),1),100));if(body?.status)q=q.eq('status',clean(body.status));const {data,error}=await q;return error?json({ok:false,error:'list_enquiries_failed'},500):json({ok:true,client_key:clientKey,enquiries:data??[]})}

async function detail(body:any,ctx:any,clientKey:string,isDemo:boolean){const id=clean(body?.enquiry_id);if(!id)return json({ok:false,error:'enquiry_id_required'},400);const e=await enquiry(ctx,clientKey,id,isDemo);if(!e)return json({ok:false,error:'enquiry_not_found'},404);const [{data:a},{data:acts},{data:related}]=await Promise.all([
  ctx.supabaseAdmin.from('appointments').select('*').eq('client_key',clientKey).eq('enquiry_id',id).eq('is_demo',isDemo).order('created_at',{ascending:false}),
  ctx.supabaseAdmin.from('activities').select('*').eq('client_key',clientKey).eq('enquiry_id',id).order('created_at',{ascending:false}).limit(100),
  ctx.supabaseAdmin.from('enquiries').select('id,status,booking_status,updated_at,service:services(name,price_display)').eq('client_key',clientKey).eq('contact_id',e.contact_id).eq('is_demo',isDemo).order('updated_at',{ascending:false})
]);return json({ok:true,client_key:clientKey,enquiry:e,appointments:a??[],activities:acts??[],related_enquiries:related??[]})}

async function updateContact(body:any,ctx:any,clientKey:string,isDemo:boolean){const contactId=clean(body?.contact_id),enquiryId=clean(body?.enquiry_id);if(!contactId)return json({ok:false,error:'contact_id_required'},400);const st=await staff(ctx,clientKey,body?.staff_id);if(!st)return json({ok:false,error:'staff_not_authorized'},403);const fullName=clean(body?.full_name);if(fullName.length<2)return json({ok:false,error:'full_name_required'},400);const phone=validPhone(body?.phone);if(!phone)return json({ok:false,error:'valid_phone_required'},400);const emailCheck=validEmail(body?.email);if(emailCheck===false)return json({ok:false,error:'valid_email_required'},400);const {data:before}=await ctx.supabaseAdmin.from('contacts').select('id,full_name,phone,email,whatsapp_id').eq('client_key',clientKey).eq('id',contactId).maybeSingle();if(!before)return json({ok:false,error:'contact_not_found'},404);const {data,error}=await ctx.supabaseAdmin.from('contacts').update({full_name:fullName,phone,email:emailCheck||null}).eq('client_key',clientKey).eq('id',contactId).select('id,full_name,phone,email,whatsapp_id,last_contact_at').single();if(error)return json({ok:false,error:'contact_update_failed'},500);if(enquiryId){const e=await enquiry(ctx,clientKey,enquiryId,isDemo);if(e)await activity(ctx,clientKey,enquiryId,'patient_details_updated',st.id,{before:{full_name:before.full_name,phone:before.phone,email:before.email},after:{full_name:data.full_name,phone:data.phone,email:data.email}})}return json({ok:true,client_key:clientKey,contact:data,staff:{id:st.id,display_name:st.display_name}})}

async function listAppointments(body:any,ctx:any,clientKey:string,isDemo:boolean){let q=ctx.supabaseAdmin.from('appointments').select('id,enquiry_id,appointment_date,start_time,end_time,status,source,created_at,updated_at,contact:contacts(id,full_name,phone,whatsapp_id),service:services(id,name,slug,price_display)').eq('client_key',clientKey).eq('is_demo',isDemo).order('appointment_date',{ascending:true}).order('start_time',{ascending:true}).limit(Math.min(Math.max(Number(body?.limit??100),1),200));if(body?.status)q=q.eq('status',clean(body.status));const {data,error}=await q;return error?json({ok:false,error:'list_appointments_failed'},500):json({ok:true,client_key:clientKey,appointments:data??[]})}

async function catalogue(ctx:any,clientKey:string){const [s,f,c,r,b]=await Promise.all([
  ctx.supabaseAdmin.from('services').select('*').eq('client_key',clientKey).eq('active',true).order('name'),
  ctx.supabaseAdmin.from('faq_items').select('*').eq('client_key',clientKey).order('topic'),
  ctx.supabaseAdmin.from('clinic_settings').select('*').eq('client_key',clientKey).order('key'),
  ctx.supabaseAdmin.from('availability_rules').select('*').eq('client_key',clientKey).order('day_of_week'),
  ctx.supabaseAdmin.from('blocked_dates').select('*').eq('client_key',clientKey).eq('active',true).order('blocked_date')
]);if(s.error||f.error||c.error||r.error||b.error)return json({ok:false,error:'catalogue_lookup_failed'},500);return json({ok:true,client_key:clientKey,services:s.data??[],faq_items:f.data??[],clinic_settings:c.data??[],availability_rules:r.data??[],blocked_dates:b.data??[]})}

async function staffAction(body:any,ctx:any,clientKey:string,isDemo:boolean){const id=clean(body?.enquiry_id),type=clean(body?.action_type);if(!id||!type)return json({ok:false,error:'action_and_enquiry_required'},400);const st=await staff(ctx,clientKey,body?.staff_id);if(!st)return json({ok:false,error:'staff_not_authorized'},403);const e=await enquiry(ctx,clientKey,id,isDemo);if(!e)return json({ok:false,error:'enquiry_not_found'},404);const now=new Date().toISOString()
  if(type==='set_state'){const next=clean(body?.state),allowed=['new','open','contacted','booked','closed'];if(!allowed.includes(next))return json({ok:false,error:'invalid_state'},400);const patch:any={status:next,updated_at:now,next_action:clean(body?.note)||(`Client state changed to ${next}`)};if(next==='closed'){patch.attention_status='resolved';patch.automation_paused=false;patch.follow_up_due_at=null}if(next==='booked')patch.booking_status='confirmed';const {error}=await ctx.supabaseAdmin.from('enquiries').update(patch).eq('client_key',clientKey).eq('id',id).eq('is_demo',isDemo);if(error)return json({ok:false,error:'set_state_failed'},500);await activity(ctx,clientKey,id,'client_state_changed',st.id,{state:next,note:body?.note??null})}
  else if(type==='mark_contacted'){await ctx.supabaseAdmin.from('enquiries').update({status:['booked','closed'].includes(e.status)?e.status:'contacted',next_action:'Continue follow-up or booking conversation',updated_at:now}).eq('client_key',clientKey).eq('id',id);await activity(ctx,clientKey,id,'staff_marked_contacted',st.id)}
  else if(type==='take_over'){await ctx.supabaseAdmin.from('enquiries').update({attention_status:'human_active',automation_paused:true,next_action:'Staff handling conversation',assigned_staff_id:st.id,updated_at:now}).eq('client_key',clientKey).eq('id',id);await activity(ctx,clientKey,id,'human_takeover_started',st.id)}
  else if(type==='return_to_assistant'){await ctx.supabaseAdmin.from('enquiries').update({attention_status:'automated',automation_paused:false,next_action:'Assistant may continue conversation',assigned_staff_id:null,updated_at:now}).eq('client_key',clientKey).eq('id',id);await activity(ctx,clientKey,id,'returned_to_assistant',st.id)}
  else if(type==='set_follow_up'){const due=new Date(String(body?.follow_up_due_at??''));if(Number.isNaN(due.getTime()))return json({ok:false,error:'valid_follow_up_due_at_required'},400);await ctx.supabaseAdmin.from('enquiries').update({follow_up_due_at:due.toISOString(),next_action:clean(body?.note)||'Follow up with patient',updated_at:now}).eq('client_key',clientKey).eq('id',id);await activity(ctx,clientKey,id,'follow_up_scheduled',st.id,{follow_up_due_at:due.toISOString()})}
  else if(type==='close'){await ctx.supabaseAdmin.from('enquiries').update({status:'closed',attention_status:'resolved',automation_paused:false,follow_up_due_at:null,next_action:'Closed by staff',staff_note:clean(body?.note)||'Closed by staff',updated_at:now}).eq('client_key',clientKey).eq('id',id);await ctx.supabaseAdmin.from('appointments').update({status:'cancelled',updated_at:now}).eq('client_key',clientKey).eq('enquiry_id',id).eq('is_demo',isDemo).in('status',['held','confirmed']);await activity(ctx,clientKey,id,'enquiry_closed',st.id,{note:body?.note??null})}
  else if(type==='confirm_booking'||type==='approve_request'){let appt:any=null;const aid=clean(body?.appointment_id);if(aid){const {data}=await ctx.supabaseAdmin.from('appointments').select('*').eq('client_key',clientKey).eq('id',aid).eq('enquiry_id',id).eq('is_demo',isDemo).maybeSingle();appt=data}else{const {data}=await ctx.supabaseAdmin.from('appointments').select('*').eq('client_key',clientKey).eq('enquiry_id',id).eq('is_demo',isDemo).in('status',['held','confirmed']).order('created_at',{ascending:false}).limit(1).maybeSingle();appt=data}if(!appt)return json({ok:false,error:'appointment_not_found'},404);await ctx.supabaseAdmin.from('appointments').update({status:'confirmed',updated_at:now}).eq('client_key',clientKey).eq('id',appt.id);await ctx.supabaseAdmin.from('enquiries').update({status:'booked',booking_status:'confirmed',preferred_date:appt.appointment_date,preferred_time_window:String(appt.start_time).slice(0,5),next_action:'Appointment confirmed',updated_at:now}).eq('client_key',clientKey).eq('id',id);await activity(ctx,clientKey,id,'booking_confirmed',st.id,{appointment_id:appt.id})}
  else if(type==='propose_another_time'){const d=clean(body?.proposed_date),t=clean(body?.proposed_time),valid=await slot(ctx,clientKey,d,t,isDemo,id);if(!valid.ok)return json({ok:false,error:valid.error},409);await ctx.supabaseAdmin.from('appointments').update({status:'cancelled',updated_at:now}).eq('client_key',clientKey).eq('enquiry_id',id).eq('is_demo',isDemo).in('status',['held','confirmed']);const {data:appt,error}=await ctx.supabaseAdmin.from('appointments').insert({client_key:clientKey,enquiry_id:id,contact_id:e.contact_id,service_id:e.service_id,appointment_date:d,start_time:valid.start_time,end_time:valid.end_time,status:'held',source:'manual',is_demo:isDemo,updated_at:now}).select('*').single();if(error)return json({ok:false,error:'propose_appointment_failed'},500);await ctx.supabaseAdmin.from('enquiries').update({booking_status:'proposed',preferred_date:d,preferred_time_window:String(valid.start_time).slice(0,5),next_action:'Patient to accept proposed appointment time',updated_at:now}).eq('client_key',clientKey).eq('id',id);await activity(ctx,clientKey,id,'staff_proposed_time',st.id,{appointment_id:appt.id,proposed_date:d,proposed_time:valid.start_time})}
  else return json({ok:false,error:'unsupported_staff_action'},400)
  const updated=await enquiry(ctx,clientKey,id,isDemo);const {data:appointments}=await ctx.supabaseAdmin.from('appointments').select('*').eq('client_key',clientKey).eq('enquiry_id',id).eq('is_demo',isDemo).order('created_at',{ascending:false});return json({ok:true,client_key:clientKey,action_type:type,staff:{id:st.id,display_name:st.display_name},enquiry:updated,appointments:appointments??[]})
}

export default{fetch:withSupabase({auth:'none'},async(req,ctx)=>{
  if(req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405)
  const key=req.headers.get('x-bizi-core-key')??req.headers.get('x-favfare-demo-key')??'';if(!key||(await sha256Hex(key))!==EXPECTED_KEY_HASH)return json({ok:false,error:'unauthorized'},401)
  let body:any;try{body=await req.json()}catch{return json({ok:false,error:'invalid_json'},400)}
  const clientKey=clientOf(body),isDemo=demoOf(body),cfg=await client(ctx,clientKey);if(!cfg)return json({ok:false,error:'client_not_found'},404)
  const action=clean(body?.action)
  try{
    if(action==='health')return json({ok:true,service:'bizi-core-crm',version:1,client_key:clientKey})
    if(action==='client_config')return json({ok:true,client_key:clientKey,client:{client_key:cfg.client_key,display_name:cfg.display_name,vertical:cfg.vertical,timezone:cfg.timezone,locale:cfg.locale,currency:cfg.currency,branding:cfg.branding,assistant_config:cfg.assistant_config,handoff_config:cfg.handoff_config}})
    if(action==='overview')return overview(ctx,clientKey,isDemo)
    if(action==='list_enquiries')return listEnquiries(body,ctx,clientKey,isDemo)
    if(action==='enquiry_detail')return detail(body,ctx,clientKey,isDemo)
    if(action==='update_contact')return updateContact(body,ctx,clientKey,isDemo)
    if(action==='list_appointments')return listAppointments(body,ctx,clientKey,isDemo)
    if(action==='catalogue')return catalogue(ctx,clientKey)
    if(action==='staff_action')return staffAction(body,ctx,clientKey,isDemo)
    return json({ok:false,error:'unsupported_action'},400)
  }catch(e){console.error(e);return json({ok:false,error:'internal_error'},500)}
})}
