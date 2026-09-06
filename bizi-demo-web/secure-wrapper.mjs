import http from 'node:http';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';

const PORT=Number(process.env.PORT||3000);
const INTERNAL_PORT=Number(process.env.INTERNAL_DEMO_PORT||3101);
const STAFF_TOKEN=String(process.env.STAFF_ACCESS_TOKEN||'');
const CORE_URL=String(process.env.BIZI_CORE_URL||'');
const CORE_KEY=String(process.env.BIZI_CORE_KEY||'');
const CLIENT_KEY=String(process.env.CLIENT_KEY||'');
if(!STAFF_TOKEN||!CORE_URL||!CORE_KEY||!CLIENT_KEY){console.error('SECURE_WRAPPER_CONFIG_MISSING');process.exit(1)}

const child=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(INTERNAL_PORT)},stdio:'inherit'});
child.on('exit',(code,signal)=>{console.error('DEMO_CHILD_EXIT',code,signal);process.exit(code??1)});
const safeEq=(a,b)=>{try{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)}catch{return false}};
function cookies(req){const out={};for(const part of String(req.headers.cookie||'').split(';')){const i=part.indexOf('=');if(i>0)out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim())}return out}
function staffOk(req,u){return safeEq(u.searchParams.get('token')||'',STAFF_TOKEN)||safeEq(cookies(req).bizi_staff||'',STAFF_TOKEN)||safeEq(req.headers['x-bizi-demo-token']||'',STAFF_TOKEN)}
const staffPaths=new Set(['/crm','/api/overview','/api/enquiries','/api/detail','/api/action','/api/reset']);
function headers(type='application/json; charset=utf-8'){return {'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer','permissions-policy':'camera=(), microphone=(), geolocation=(), payment=()','content-security-policy':"default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'self'"}}
function reply(res,status,body,type='application/json; charset=utf-8'){res.writeHead(status,headers(type));res.end(type.startsWith('application/json')?JSON.stringify(body):String(body))}
async function bodyOf(req,max=1_000_000){const chunks=[];let n=0;for await(const c of req){n+=c.length;if(n>max){const e=new Error('body_too_large');e.status=413;throw e}chunks.push(c)}return Buffer.concat(chunks)}
async function proxy(req,res,u){const raw=['GET','HEAD'].includes(req.method)?undefined:await bodyOf(req);const h={};if(req.headers['content-type'])h['content-type']=req.headers['content-type'];const r=await fetch(`http://127.0.0.1:${INTERNAL_PORT}${u.pathname}${u.search}`,{method:req.method,headers:h,body:raw,redirect:'manual',signal:AbortSignal.timeout(30000)});const buf=Buffer.from(await r.arrayBuffer()),type=r.headers.get('content-type')||'application/octet-stream',hs=headers(type);const loc=r.headers.get('location');if(loc)hs.location=loc;res.writeHead(r.status,hs);res.end(buf)}

const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
  if(u.pathname==='/health')return reply(res,200,{ok:true,service:'bizi-demo-web',version:2,staff_auth:true});
  if(u.pathname==='/crm'&&safeEq(u.searchParams.get('token')||'',STAFF_TOKEN)){const secure=String(req.headers['x-forwarded-proto']||'https').includes('https')?'; Secure':'';res.writeHead(303,{...headers('text/plain; charset=utf-8'),'set-cookie':`bizi_staff=${encodeURIComponent(STAFF_TOKEN)}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=21600`,location:'/crm'});return res.end('Redirecting')}
  if(staffPaths.has(u.pathname)&&!staffOk(req,u))return reply(res,404,{ok:false,error:'not_found'});
  return await proxy(req,res,u);
}catch(e){console.error('SECURE_WRAPPER_ERROR',e?.message||e);return reply(res,Number(e?.status)||500,{ok:false,error:Number(e?.status)===413?'body_too_large':'internal_error'})}});
server.listen(PORT,'0.0.0.0',()=>console.log('BIZI_DEMO_SECURE_WRAPPER_READY',PORT,'internal',INTERNAL_PORT));
process.on('SIGTERM',()=>{child.kill('SIGTERM');server.close(()=>process.exit(0))});
