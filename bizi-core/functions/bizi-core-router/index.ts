import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from 'npm:@supabase/server@1.5.3'

const EXPECTED_KEY_HASH='9a282475f5afaa3ec5edacea466dbca831eed5f3500a7e5890b87fb0127edede'
async function sha256Hex(v:string){const b=new TextEncoder().encode(v);const d=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('')}
const clean=(v:any)=>String(v??'').trim()
const json=(body:unknown,status=200)=>Response.json(body,{status})

async function clientConfig(ctx:any,clientKey:string){
  const {data,error}=await ctx.supabaseAdmin.from('bizi_clients').select('client_key,display_name,vertical,timezone,locale,currency,branding,assistant_config,handoff_config,metadata').eq('client_key',clientKey).eq('active',true).maybeSingle()
  if(error)throw new Error('client_lookup_failed')
  return data
}

export default{fetch:withSupabase({auth:'none'},async(req,ctx)=>{
  if(req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405)
  const key=req.headers.get('x-bizi-core-key')??req.headers.get('x-favfare-demo-key')??''
  if(!key||(await sha256Hex(key))!==EXPECTED_KEY_HASH)return json({ok:false,error:'unauthorized'},401)
  let body:any;try{body=await req.json()}catch{return json({ok:false,error:'invalid_json'},400)}
  const action=clean(body?.action)
  if(action==='health')return json({ok:true,service:'bizi-core-router',version:1})
  if(action!=='resolve_channel')return json({ok:false,error:'unsupported_action'},400)
  const provider=clean(body?.provider),external=clean(body?.external_instance_id),channelId=clean(body?.channel_id)
  if(!channelId&&(!provider||!external))return json({ok:false,error:'provider_and_external_instance_id_required'},400)
  let q=ctx.supabaseAdmin.from('bizi_channels').select('id,client_key,channel_type,provider,external_instance_id,public_address,status,config,metadata').eq('status','active')
  if(channelId)q=q.eq('id',channelId);else q=q.eq('provider',provider).eq('external_instance_id',external)
  const {data:channel,error}=await q.maybeSingle()
  if(error)return json({ok:false,error:'channel_lookup_failed'},500)
  if(!channel)return json({ok:false,error:'channel_not_found'},404)
  const client=await clientConfig(ctx,channel.client_key)
  if(!client)return json({ok:false,error:'client_not_found'},404)
  return json({ok:true,client_key:client.client_key,client,channel})
})}
