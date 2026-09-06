import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from 'npm:@supabase/server@1.5.3'

const EXPECTED_KEY_HASH='9a282475f5afaa3ec5edacea466dbca831eed5f3500a7e5890b87fb0127edede'
async function sha256Hex(v:string){const b=new TextEncoder().encode(v);const d=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('')}
function json(body:unknown,status=200){return Response.json(body,{status})}
const clean=(v:any)=>String(v??'').trim().replace(/^,+\s*/,'')
const keyOf=(b:any)=>clean(b?.client_key)||'favfare'
const demoOf=(b:any)=>b?.is_demo===false?false:true
const mins=(v:string)=>{const [h,m]=String(v).slice(0,5).split(':').map(Number);return h*60+m}
const time=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`
const overlap=(a:number,b:number,c:number,d:number)=>a<d&&b>c
const iso=(d:Date)=>d.toISOString().slice(0,10)
const add=(s:string,n:number)=>{const d=new Date(`${s}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return iso(d)}
const validEmail=(v:any)=>{const e=clean(v).toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)?e:null}
const ngPhone=(v:any)=>{let p=clean(v).replace(/[\s()\-.]/g,'');if(/^0\d{10}$/.test(p))return '+234'+p.slice(1);if(/^234\d{10}$/.test(p))return '+'+p;if(/^\+234\d{10}$/.test(p))return p;return null}

async function calendar(ctx:any,clientKey:string,isDemo:boolean,days=14){
  const count=Math.max(1,Math.min(Number(days||14),31)),start=iso(new Date()),end=add(start,count-1)
  const [rq,bq,aq]=await Promise.all([
    ctx.supabaseAdmin.from('availability_rules').select('*').eq('client_key',clientKey).order('day_of_week'),
    ctx.supabaseAdmin.from('blocked_dates').select('blocked_date,start_time,end_time,active').eq('client_key',clientKey).gte('blocked_date',start).lte('blocked_date',end).eq('active',true),
    ctx.supabaseAdmin.from('appointments').select('appointment_date,start_time,end_time,status').eq('client_key',clientKey).gte('appointment_date',start).lte('appointment_date',end).eq('is_demo',isDemo).in('status',['held','confirmed'])
  ])
  if(rq.error||bq.error||aq.error)throw new Error('availability_lookup_failed')
  const rules=new Map((rq.data??[]).map((r:any)=>[Number(r.day_of_week),r]));const out:any[]=[]
  for(let i=0;i<count;i++){
    const date=add(start,i),dow=new Date(`${date}T12:00:00Z`).getUTCDay(),r:any=rules.get(dow)
    if(!r||!r.is_open||!r.open_time||!r.close_time){out.push({date,is_open:false,available_count:0,slots:[]});continue}
    const step=Number(r.slot_minutes??30),open=mins(r.open_time),close=mins(r.close_time),blocks=(bq.data??[]).filter((x:any)=>x.blocked_date===date),appts=(aq.data??[]).filter((x:any)=>x.appointment_date===date),slots:any[]=[]
    for(let s=open;s+step<=close;s+=step){const e=s+step;const blocked=blocks.some((x:any)=>!x.start_time||!x.end_time||overlap(s,e,mins(x.start_time),mins(x.end_time)));const booked=appts.some((x:any)=>overlap(s,e,mins(x.start_time),mins(x.end_time)));slots.push({time:time(s),available:!blocked&&!booked,reason:blocked?'blocked':booked?'booked':null})}
    out.push({date,is_open:true,available_count:slots.filter((x:any)=>x.available).length,slots})
  }
  return out
}

export default{fetch:withSupabase({auth:'none'},async(req,ctx)=>{
  if(req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405)
  const key=req.headers.get('x-bizi-core-key')??req.headers.get('x-favfare-demo-key')??'';if(!key||(await sha256Hex(key))!==EXPECTED_KEY_HASH)return json({ok:false,error:'unauthorized'},401)
  let b:any;try{b=await req.json()}catch{return json({ok:false,error:'invalid_json'},400)}
  const clientKey=keyOf(b),isDemo=demoOf(b)
  const cq=await ctx.supabaseAdmin.from('bizi_clients').select('client_key').eq('client_key',clientKey).eq('active',true).maybeSingle();if(cq.error)return json({ok:false,error:'client_lookup_failed'},500);if(!cq.data)return json({ok:false,error:'client_not_found'},404)
  const contactId=clean(b?.contact_id),sessionId=clean(b?.session_id),fullName=clean(b?.full_name),phone=ngPhone(b?.phone),email=validEmail(b?.email)
  if(!contactId)return json({ok:false,error:'contact_id_required'},400)
  if(fullName.length<2)return json({ok:false,error:'full_name_required'},400)
  if(!phone)return json({ok:false,error:'valid_nigerian_phone_required'},400)
  if(!email)return json({ok:false,error:'valid_email_required'},400)
  const q=await ctx.supabaseAdmin.from('contacts').update({full_name:fullName,phone,email,last_contact_at:new Date().toISOString()}).eq('client_key',clientKey).eq('id',contactId).select('id,full_name,phone,email,whatsapp_id').single()
  if(q.error)return json({ok:false,error:'contact_update_failed'},500)
  if(sessionId)await ctx.supabaseAdmin.from('conversation_sessions').update({full_name:fullName,phone,email,contact_id:contactId,updated_at:new Date().toISOString()}).eq('client_key',clientKey).eq('session_id',sessionId)
  try{return json({ok:true,client_key:clientKey,contact:q.data,days:await calendar(ctx,clientKey,isDemo,14)})}catch{return json({ok:false,error:'availability_lookup_failed'},500)}
})}
