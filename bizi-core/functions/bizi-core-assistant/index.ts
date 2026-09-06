import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from 'npm:@supabase/server@1.5.3'

const EXPECTED_KEY_HASH='9a282475f5afaa3ec5edacea466dbca831eed5f3500a7e5890b87fb0127edede'
async function sha256Hex(v:string){const b=new TextEncoder().encode(v);const d=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('')}
function json(body:unknown,status=200){return Response.json(body,{status})}
const clean=(v:any)=>String(v??'').trim()
const keyOf=(body:any)=>clean(body?.client_key)||'favfare'
const demoOf=(body:any)=>body?.is_demo===false?false:true

async function loadClient(ctx:any,clientKey:string){
  const {data,error}=await ctx.supabaseAdmin.from('bizi_clients').select('*').eq('client_key',clientKey).eq('active',true).maybeSingle()
  if(error)throw new Error('client_lookup_failed')
  return data
}

async function loadServices(ctx:any,clientKey:string){
  const {data,error}=await ctx.supabaseAdmin.from('services').select('id,name,slug,price_display,public_description,service_sales_metadata(intent_tags,display_group,popular,display_order)').eq('client_key',clientKey).eq('active',true).eq('demo_seed_status','approved').order('name')
  if(error)throw new Error('catalogue_lookup_failed')
  return (data??[]).map((s:any)=>({id:s.id,name:s.name,slug:s.slug,price_display:s.price_display,public_description:s.public_description||'',intent_tags:s.service_sales_metadata?.intent_tags??[],display_group:s.service_sales_metadata?.display_group??'Other',popular:Boolean(s.service_sales_metadata?.popular),display_order:Number(s.service_sales_metadata?.display_order??100)})).sort((a:any,b:any)=>a.display_order-b.display_order||a.name.localeCompare(b.name))
}

async function loadControl(ctx:any,clientKey:string,sessionId:string){
  if(!sessionId)return {session:null,enquiry:null,error:null}
  const sq=await ctx.supabaseAdmin.from('conversation_sessions').select('*').eq('client_key',clientKey).eq('session_id',sessionId).maybeSingle()
  if(sq.error)return {session:null,enquiry:null,error:'session_control_lookup_failed'}
  const session=sq.data
  if(!session?.enquiry_id)return {session,enquiry:null,error:null}
  const eq=await ctx.supabaseAdmin.from('enquiries').select('id,automation_paused,attention_status').eq('client_key',clientKey).eq('id',session.enquiry_id).maybeSingle()
  if(eq.error)return {session,enquiry:null,error:'enquiry_control_lookup_failed'}
  return {session,enquiry:eq.data,error:null}
}

async function persistPatientOnly(ctx:any,clientKey:string,session:any,sessionId:string,history:any[],message:string){
  if(!sessionId||!session)return
  const nextHistory=[...history,{who:'patient',text:message}].slice(-24)
  await ctx.supabaseAdmin.from('conversation_sessions').update({history:nextHistory,last_user_message:message,updated_at:new Date().toISOString()}).eq('client_key',clientKey).eq('session_id',sessionId)
}

function suppressed(reason:string,control:any,context:any={},clientKey='favfare'){
  return json({ok:true,suppressed:true,reason,reply:null,choices:[],handoff:true,enquiry_id:control?.session?.enquiry_id??control?.enquiry?.id??null,attention_status:control?.enquiry?.attention_status??'human_active',context,client_key:clientKey})
}

function serviceChoices(services:any[],filter:(s:any)=>boolean,limit=8){return services.filter(filter).slice(0,limit).map(s=>({slug:s.slug,label:s.name,description:s.price_display||''}))}
function scoreMatches(message:string,services:any[]){const m=message.toLowerCase();return services.map(s=>{let score=0;for(const tag of s.intent_tags??[]){const t=String(tag).toLowerCase();if(t&&m.includes(t))score+=Math.max(1,t.split(/\s+/).length)}if(m.includes(String(s.name).toLowerCase()))score+=5;return {s,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.s.display_order-b.s.display_order)}
function fallback(message:string,services:any[],context:any,clinicName:string){
  const m=message.toLowerCase()
  if(/pain|swollen|swelling|bleeding|infection|medicine|medication|diagnos|what is wrong|toothache/.test(m))return {reply:"I can help with clinic information and booking, but I can't diagnose symptoms in chat. I can pass this to the clinic team for review.",choices:[],handoff:true,intent:'clinical_handoff'}
  const matches=scoreMatches(message,services)
  if(matches.length){const top=matches.slice(0,Math.min(matches.length,4)).map(x=>x.s);return {reply:top.length===1?`Yes — ${clinicName} offers ${top[0].name}. I can show you the current website price or help you book it.`:`I found a few ${clinicName} services that match what you mean. Choose the closest one and I’ll help from there.`,choices:top.map(s=>({slug:s.slug,label:s.name,description:s.price_display||''})),handoff:false,intent:'service_match'}}
  if(/book|appointment|available|schedule|slot/.test(m))return {reply:'Absolutely. Choose the service you want to book, then I’ll collect your details and show you available dates and times.',choices:serviceChoices(services,s=>s.popular,8),handoff:false,intent:'booking'}
  if(/service|services|price|prices|cost|option|options|offer|treatment/.test(m))return {reply:`Sure — here are some of ${clinicName}’s services from the current catalogue.`,choices:serviceChoices(services,()=>true,8),handoff:false,intent:'browse'}
  if(/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(m))return {reply:`Hi 👋 I can help you book an appointment, look through ${clinicName}’s services, or answer an enquiry. What would you like to do?`,choices:[],handoff:false,intent:'greeting'}
  if(context?.service_name)return {reply:`Sure — we’re still talking about ${context.service_name}. What would you like to know about it?`,choices:[],handoff:false,intent:'follow_up'}
  return {reply:'Of course. Tell me what you’d like help with and I’ll guide you from there.',choices:[],handoff:false,intent:'enquiry'}
}

export default{fetch:withSupabase({auth:'none'},async(req,ctx)=>{
  if(req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405)
  const key=req.headers.get('x-bizi-core-key')??req.headers.get('x-favfare-demo-key')??'';if(!key||(await sha256Hex(key))!==EXPECTED_KEY_HASH)return json({ok:false,error:'unauthorized'},401)
  let body:any;try{body=await req.json()}catch{return json({ok:false,error:'invalid_json'},400)}
  const clientKey=keyOf(body),isDemo=demoOf(body),client=await loadClient(ctx,clientKey)
  if(!client)return json({ok:false,error:'client_not_found'},404)
  const clinicName=clean(client.display_name)||clientKey
  const action=clean(body?.action)
  if(action==='health')return json({ok:true,service:'bizi-core-assistant',version:2,client_key:clientKey})
  if(action==='noop')return json({ok:true,client_key:clientKey})
  if(action==='service_catalogue'){
    const services=await loadServices(ctx,clientKey)
    return json({ok:true,client_key:clientKey,services,choices:serviceChoices(services,body?.popular_only?((s:any)=>s.popular):(()=>true),Number(body?.limit??50))})
  }
  if(action!=='chat')return json({ok:false,error:'unsupported_action'},400)

  const message=clean(body?.message),sessionId=clean(body?.session_id),incomingContext=body?.context&&typeof body.context==='object'?body.context:{}
  const initialControl=await loadControl(ctx,clientKey,sessionId)
  if(initialControl.error)return suppressed(initialControl.error,initialControl,{},clientKey)
  const session:any=initialControl.session
  const storedHistory=Array.isArray(session?.history)?session.history:[]
  const supplied=Array.isArray(body?.history)?body.history:[]
  const history=(storedHistory.length?storedHistory:supplied).slice(-18)
  const context={service_slug:incomingContext.service_slug||session?.service_slug||null,service_name:incomingContext.service_name||session?.service_name||null,selected_date:incomingContext.selected_date||session?.selected_date||null,selected_time:incomingContext.selected_time||session?.selected_time||null,full_name:incomingContext.full_name||session?.full_name||null,phone:incomingContext.phone||session?.phone||null,email:incomingContext.email||session?.email||null}

  if(initialControl.enquiry?.automation_paused===true){await persistPatientOnly(ctx,clientKey,session,sessionId,history,message);return suppressed('human_active',initialControl,context,clientKey)}

  const services=await loadServices(ctx,clientKey)
  const fb=fallback(message,services,context,clinicName)
  const groqKey=clean(req.headers.get('x-groq-key'))
  let result:any={provider:'fallback',...fb}
  if(groqKey){
    const compact=services.map(s=>({slug:s.slug,name:s.name,price:s.price_display,group:s.display_group,description:s.public_description}))
    const system=`You are ${clinicName}'s WhatsApp patient sales assistant. Speak like a capable human receptionist: concise, natural, commercially helpful, and never robotic.\n\nYour job is to understand the patient's goal, answer questions using only supplied business data, and move them toward either booking, a service choice, or a human handoff. Ask one useful question at a time. Never invent prices, services, medical facts, dates, times or booking availability. Never diagnose or prescribe. Clinical symptoms or uncertainty require handoff=true.\n\nConversation memory/context: ${JSON.stringify(context)}\n\nService catalogue: ${JSON.stringify(compact)}\n\nReturn strict JSON: {"reply":"...","choice_slugs":[],"handoff":false,"intent":"..."}. choice_slugs may contain only catalogue slugs and only when structured choices genuinely help.`
    const messages=[{role:'system',content:system},...history.map((x:any)=>({role:x.who==='patient'?'user':'assistant',content:clean(x.text)})),{role:'user',content:message}]
    try{const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${groqKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'llama-3.3-70b-versatile',messages,temperature:.42,max_completion_tokens:320,response_format:{type:'json_object'}})});if(r.ok){const data=await r.json();const parsed=JSON.parse(clean(data?.choices?.[0]?.message?.content)||'{}');const valid=new Set(services.map(s=>s.slug));const slugs=(Array.isArray(parsed.choice_slugs)?parsed.choice_slugs:[]).filter((x:any)=>valid.has(clean(x))).slice(0,8);result={provider:'groq',reply:clean(parsed.reply)||fb.reply,choices:slugs.map((slug:string)=>{const s=services.find(x=>x.slug===slug);return {slug:s.slug,label:s.name,description:s.price_display||''}}),handoff:Boolean(parsed.handoff),intent:clean(parsed.intent)||'conversation'}}}catch{}
  }

  const finalControl=await loadControl(ctx,clientKey,sessionId)
  if(finalControl.error){await persistPatientOnly(ctx,clientKey,session,sessionId,history,message);return suppressed(finalControl.error,finalControl,context,clientKey)}
  if(finalControl.enquiry?.automation_paused===true){await persistPatientOnly(ctx,clientKey,finalControl.session??session,sessionId,history,message);return suppressed('human_active',finalControl,context,clientKey)}

  const nextHistory=[...history,{who:'patient',text:message},{who:'assistant',text:result.reply}].slice(-24)
  if(sessionId){const row={client_key:clientKey,session_id:sessionId,history:nextHistory,service_slug:context.service_slug,service_name:context.service_name,selected_date:context.selected_date||null,selected_time:context.selected_time||null,full_name:context.full_name,phone:context.phone,email:context.email,last_user_message:message,last_assistant_message:result.reply,is_demo:isDemo,updated_at:new Date().toISOString()};await ctx.supabaseAdmin.from('conversation_sessions').upsert(row,{onConflict:'client_key,session_id'})}
  return json({ok:true,...result,services,context,enquiry_id:finalControl.session?.enquiry_id??session?.enquiry_id??null,suppressed:false,client_key:clientKey})
})}
