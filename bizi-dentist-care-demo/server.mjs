import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const files={
  '/':['index.html','text/html; charset=utf-8'],
  '/index.html':['index.html','text/html; charset=utf-8'],
  '/styles.css':['styles.css','text/css; charset=utf-8'],
  '/app.js':['app.js','text/javascript; charset=utf-8']
};
const security={
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'x-frame-options':'DENY',
  'referrer-policy':'no-referrer',
  'permissions-policy':'camera=(), microphone=(), geolocation=(), payment=()',
  'content-security-policy':"default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; form-action 'self'"
};

function send(res,status,body,type='application/json; charset=utf-8'){
  res.writeHead(status,{'content-type':type,...security});
  res.end(body);
}

const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url||'/','http://localhost');
    if(req.method==='GET'&&u.pathname==='/health'){
      return send(res,200,JSON.stringify({ok:true,service:'bizi-dentist-care-demo',version:1,packages:3}));
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,JSON.stringify({ok:false,error:'method_not_allowed'}));
    const entry=files[u.pathname];
    if(!entry)return send(res,404,JSON.stringify({ok:false,error:'not_found'}));
    const [name,type]=entry;
    const body=await fs.readFile(path.join(__dirname,name));
    res.writeHead(200,{'content-type':type,...security});
    if(req.method==='HEAD')return res.end();
    res.end(body);
  }catch(e){
    console.error('CARE_DEMO_SERVER_ERROR',e?.message||e);
    send(res,500,JSON.stringify({ok:false,error:'internal_error'}));
  }
});
server.listen(PORT,'0.0.0.0',()=>console.log('BIZI_DENTIST_CARE_DEMO_READY',PORT));
