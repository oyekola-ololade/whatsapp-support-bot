const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials=name=>String(name||'Clinic').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'DC';
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2600)};
async function api(path,body){const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const text=await r.text();let d;try{d=text?JSON.parse(text):{}}catch{d={ok:false,error:'Invalid demo response'}}if(!r.ok||d?.ok===false)throw new Error(d?.error||'Demo request failed');return d}
function rgb(hex){const n=parseInt(String(hex).replace('#',''),16);return Number.isFinite(n)?[(n>>16)&255,(n>>8)&255,n&255]:[38,112,91]}
function setBrand(hex){const safe=/^#[0-9a-f]{6}$/i.test(hex)?hex:'#26705b';document.documentElement.style.setProperty('--brand',safe);document.documentElement.style.setProperty('--brand-rgb',rgb(safe).join(','))}

let demo=null,level=2,messages=[],pendingChoices=[],handoff=false,lastEnquiryId=null,sessionId='',remote='',p1={stage:'idle',name:'',email:'',date:'',time:''};
const outcome={
  1:{patient:'A patient gets an answer without pulling your receptionist away from everything else.',copy:'Try pricing, service questions, an appointment request, or a clinical question. Useful details are captured for staff instead of disappearing in chat.',story:'The front desk only needs to step in when the conversation actually needs a person.',staff:'Your team sees the useful enquiries without learning another full application.',staffCopy:'Care 1 keeps the staff side deliberately simple: captured patient, service interest, request state and what needs attention.'},
  2:{patient:'A patient conversation turns itself into organised front-desk work.',copy:'Try a service question, complete a booking flow, or trigger human takeover. The same conversation updates the staff workspace.',story:'The receptionist sees the patient, service, booking state and next action without reconstructing the conversation.',staff:'Your team opens one workspace and immediately knows what needs action.',staffCopy:'Booking state, attention, follow-up and conversation context stay attached to the enquiry.'},
  3:{patient:'Patients can enter from more places without creating more front-desk chaos.',copy:'Start in chat, then try the clinic website. The custom preview shows how multiple approved entry points can feed one operations layer.',story:'The outcome is not more channels. It is fewer disconnected places for staff to monitor.',staff:'Your clinic can route patient work through one custom operations surface.',staffCopy:'Care 3 extends the same foundation with clinic-specific channels, locations, routing and custom modules after discovery.'}
};

function showBuilder(){
  $('#builder').classList.remove('hidden');$('#experience').classList.add('hidden');history.replaceState(null,'',location.pathname);window.scrollTo({top:0,behavior:'smooth'});
}
function switchView(view){
  if(view==='website'&&level<3){toast('The website-to-operations experience is part of Care 3.');return}
  $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.panel===view));
  $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  if(view==='staff')refreshStaff();
}
function applyDemo(){
  const c=demo.client,brand=c.branding||{},name=c.display_name,loc=brand.location||c.metadata?.location||'Your clinic';
  level=Number(c.metadata?.package_level||2);setBrand(brand.accent||'#26705b');
  sessionId=demo.demo_session_id;remote=demo.demo_remote;lastEnquiryId=demo.demo_enquiry_id||null;
  const ini=brand.logo_text||initials(name);$('#clinicLogo').textContent=ini;$('#phoneLogo').textContent=ini;
  $('#clinicTitle').textContent=name;$('#clinicSub').textContent=`${loc} · your live demo`;$('#phoneClinic').textContent=name;
  $('#levelFooter').textContent=`Care Level ${level} demo`;$('#websiteTab').classList.toggle('locked',level<3);
  $('#patientOutcomeTitle').textContent=outcome[level].patient;$('#patientOutcomeCopy').textContent=outcome[level].copy;
  $('#storyTitle').textContent=outcome[level].story;
  $('#storyCopy').textContent=level===1?'Routine questions are handled. Appointment preferences become requests for staff to confirm. Clinical judgement is escalated.':level===2?'Routine questions, booking state and follow-up move forward automatically, while staff can take control at any point.':'Website and approved channels can feed the same operational flow, while staff keeps one place to manage the work.';
  $('#staffTitle').textContent=outcome[level].staff;$('#staffCopy').textContent=outcome[level].staffCopy;
  document.title=`${name} · Live Clinic Demo`;
  addRestartButton();resetChatUI();renderWebsite();
}
function addRestartButton(){
  if($('#resetPatient'))return;
  const b=document.createElement('button');b.id='resetPatient';b.className='staff-jump';b.style.marginTop='10px';b.textContent='Restart with a fresh patient →';b.onclick=startNewPatient;$('#openStaff').insertAdjacentElement('afterend',b);
}

function bubble(who,text){messages.push({who,text});renderThread()}
function renderThread(typing=false){
  const th=$('#thread');th.innerHTML=messages.map(m=>`<div class="msg ${esc(m.who)}"><div>${esc(m.text)}<small>${m.who==='user'?'You':m.who==='staff'?'Clinic staff':'Patient Assistant'} · now</small></div></div>`).join('')+(typing?'<div class="msg assistant"><div class="typing"><i></i><i></i><i></i></div></div>':'');
  th.scrollTop=th.scrollHeight;renderQuick();renderState();
}
function choiceText(c){
  if(c?.kind==='service'||c?.slug)return `I want ${c.label||c.name||'that service'}`;
  if(c?.value==='date'&&c?.date)return `I choose ${c.date} for the appointment`;
  if(c?.value==='time'&&c?.time)return `I choose ${String(c.time).slice(0,5)}`;
  if(c?.value==='book')return 'I want to book an appointment';
  if(c?.value==='services')return 'Show me your services and prices';
  if(c?.value==='human')return 'I need a person';
  return c?.label||c?.date||c?.time||'Continue';
}
function renderQuick(){
  const q=$('#quickReplies');if(handoff){q.innerHTML='';return}
  if(pendingChoices.length){
    q.innerHTML=pendingChoices.map((c,i)=>`<button type="button" data-choice="${i}">${esc(c.label||c.date||c.time||`Option ${i+1}`)}</button>`).join('');
    $$('[data-choice]',q).forEach(b=>b.onclick=()=>{const c=pendingChoices[Number(b.dataset.choice)];sendChat(choiceText(c))});return;
  }
  const base=level===1?['Services & price','Request an appointment','I have tooth pain','I need a person']:['Services & price','Book an appointment','I have tooth pain','I need a person'];
  q.innerHTML=base.map(x=>`<button type="button" data-quick="${esc(x)}">${esc(x)}</button>`).join('');$$('[data-quick]',q).forEach(b=>b.onclick=()=>sendChat(b.dataset.quick));
}
function renderState(){
  const svc=demo?.services?.[0]?.name||'Featured service';const rows=[['Care level',`Care ${level}`],['Featured service',svc],['Conversation',handoff?'Human takeover':'Assistant active'],['Staff record',lastEnquiryId?'Live and updating':'Ready to capture']];
  $('#stateRows').innerHTML=rows.map(r=>`<div class="state-row"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('');
  $('#automationState').textContent=handoff?'Human takeover':'Assistant active';$('#automationState').classList.toggle('human',handoff);
}
function resetChatUI(){
  messages=[{who:'assistant',text:`Hi 👋 Welcome to ${demo.client.display_name}. How can I help you today?`}];pendingChoices=[];handoff=false;p1={stage:'idle',name:'',email:'',date:'',time:''};renderThread();
}
async function startNewPatient(){
  const btn=$('#resetPatient');btn.disabled=true;btn.textContent='Starting fresh patient…';
  try{const d=await api('/api/new-session',{client_key:demo.client.client_key});sessionId=d.demo_session_id;remote=d.demo_remote;lastEnquiryId=d.demo_enquiry_id;resetChatUI();toast('Fresh synthetic patient ready.');}
  catch(e){toast(e.message)}finally{btn.disabled=false;btn.textContent='Restart with a fresh patient →'}
}
function isClinical(t){return /pain|swollen|swelling|bleed|medicine|dosage|dose|antibiotic|diagnos|emergency|infection/i.test(t)}
async function packageOneRequest(text){
  if(p1.stage==='idle'&&!/appointment|book|request/i.test(text))return false;
  bubble('user',text);
  if(p1.stage==='idle'){p1.stage='name';bubble('assistant',`Sure. What name should I put on the ${demo.services?.[0]?.name||'appointment'} request?`);return true}
  if(p1.stage==='name'){if(text.length<2||/^(yes|no|what|why|hello|hi)$/i.test(text)){bubble('assistant','What name should I put on the request?');return true}p1.name=text;p1.stage='email';bubble('assistant','Thanks. What email should the clinic use if they need to confirm the request?');return true}
  if(p1.stage==='email'){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)){bubble('assistant','Send me a valid email address for the request.');return true}p1.email=text;p1.stage='date';bubble('assistant','What day would you prefer?');return true}
  if(p1.stage==='date'){p1.date=text;p1.stage='time';bubble('assistant','What time or time window works best for you?');return true}
  if(p1.stage==='time'){
    p1.time=text;renderThread(true);
    try{const d=await api('/api/request',{client_key:demo.client.client_key,full_name:p1.name,email:p1.email,phone:'',preferred_date:p1.date,preferred_time:p1.time,service_slug:demo.services?.[0]?.slug||'featured-service'});lastEnquiryId=d.enquiry_id;p1.stage='done';messages.push({who:'assistant',text:d.reply||'Your appointment preference has been recorded for the clinic team to confirm.'});renderThread();}
    catch(e){messages.push({who:'assistant',text:'I could not save that demo request. Please try again.'});renderThread();toast(e.message)}return true;
  }
  return false;
}
async function sendChat(raw){
  const text=String(raw||'').trim().slice(0,700);if(!text||handoff)return;$('#chatInput').value='';
  if(level===1&&!isClinical(text)&&await packageOneRequest(text))return;
  bubble('user',text);pendingChoices=[];renderThread(true);
  try{
    const d=await api('/api/chat',{client_key:demo.client.client_key,session_id:sessionId,remote_jid:remote,enquiry_id:lastEnquiryId,staff_id:demo.staff?.id,message:text});
    lastEnquiryId=d.enquiry_id||lastEnquiryId;
    if(d.reply)messages.push({who:'assistant',text:d.reply});
    pendingChoices=Array.isArray(d.menu_choices)&&d.menu_choices.length?d.menu_choices:Array.isArray(d.choices)?d.choices:[];
    if(d.handoff||d.suppressed){handoff=true;messages.push({who:'staff',text:'A member of the clinic team now owns this conversation. The assistant is paused.'})}
    renderThread();
  }catch(e){messages.push({who:'assistant',text:'The demo had trouble processing that message. Try again.'});renderThread();toast(e.message)}
}

async function refreshStaff(){
  const root=$('#staffSurface');root.innerHTML='<div class="outcome-card"><strong>Refreshing the clinic view…</strong><p>Pulling the synthetic enquiries created by this demo tenant.</p></div>';
  try{const d=await api('/api/enquiries',{client_key:demo.client.client_key});renderStaff(d.enquiries||[])}catch(e){root.innerHTML=`<div class="outcome-card"><strong>Could not load the staff view.</strong><p>${esc(e.message)}</p></div>`}
}
function metrics(rows){return {open:rows.filter(x=>['new','open'].includes(x.status)).length,requests:rows.filter(x=>['requested','proposed'].includes(x.booking_status)).length,human:rows.filter(x=>['needs_human','human_active'].includes(x.attention_status)).length,follow:rows.filter(x=>x.follow_up_due_at).length}}
function renderStaff(rows){
  const root=$('#staffSurface'),m=metrics(rows);
  if(level===1){root.innerHTML=`<div class="staff-surface simple-sheet"><div class="outcome-card"><strong>No full CRM to learn.</strong><p>Your team still works mainly in WhatsApp. This table exists so names, service interest, appointment requests and human-attention flags do not get lost.</p></div><div class="simple-sheet-note">The patient conversation you just tried creates synthetic operational records here. Appointment requests remain requests until staff confirms them.</div>${tableCard(rows,false)}</div>`;wireRows();return}
  const intro=level===2?'The point is not “a CRM”. The point is that the next action is obvious before a receptionist opens the conversation.':'The custom surface can be shaped around how the clinic actually routes patient work, rather than forcing every branch and channel into separate tools.';
  root.innerHTML=`<div class="staff-surface"><div class="outcome-card"><strong>${level===2?'Your front desk starts with context, not detective work.':'One clinic operations layer instead of disconnected inboxes.'}</strong><p>${esc(intro)}</p></div><div class="metrics"><div class="metric"><small>Open</small><strong>${m.open}</strong><span>needs action</span></div><div class="metric"><small>Booking requests</small><strong>${m.requests}</strong><span>in progress</span></div><div class="metric"><small>Needs human</small><strong>${m.human}</strong><span>assistant stepped aside</span></div><div class="metric"><small>Follow-up</small><strong>${m.follow}</strong><span>scheduled / due</span></div></div><div class="staff-grid">${tableCard(rows,true)}<div class="staff-card"><div class="cardbar"><div><strong>Patient context</strong><small>Click an enquiry</small></div></div><div id="detail" class="detail empty">Pick a patient row to see what staff knows and what they can do next.</div></div></div>${level===3?channelOutcome():''}</div>`;wireRows();
}
function tableCard(rows,full){
  const r=rows.slice(0,12);return `<div class="staff-card"><div class="cardbar"><div><strong>${full?(level===3?'Unified patient queue':'Patient enquiries'):'Captured enquiries'}</strong><small>Synthetic records from this personalised clinic demo</small></div></div><div class="table-wrap"><div class="data-table"><div class="data-row header"><span>Patient</span><span>Service</span><span>Source</span><span>State</span><span>Next action</span></div>${r.map(e=>{const human=['needs_human','human_active'].includes(e.attention_status),state=human?'Needs human':e.booking_status!=='none'?e.booking_status:e.status,cls=human?'warn':['new','open'].includes(e.status)?'neutral':'';return `<div class="data-row" data-enquiry="${esc(e.id)}"><div class="person"><i>${esc(initials(e.contact?.full_name))}</i><strong>${esc(e.contact?.full_name||'Patient')}</strong></div><span>${esc(e.service?.name||'General enquiry')}</span><span>${esc(e.source||'—')}</span><span class="status ${cls}">${esc(state)}</span><span>${esc(e.next_action||'Review enquiry')}</span></div>`}).join('')}</div></div></div>`
}
function channelOutcome(){return `<div class="outcome-card"><strong>Custom does not mean “more dashboards”.</strong><p>It means the clinic can decide which approved patient entry points feed this same queue. WhatsApp and website are demonstrated here. Instagram, Facebook, email or another system can be scoped when the clinic controls the required accounts and APIs.</p></div>`}
function wireRows(){$$('[data-enquiry]').forEach(r=>r.onclick=()=>openDetail(r.dataset.enquiry))}
async function openDetail(id){
  if(level===1)return;const box=$('#detail');box.className='detail';box.innerHTML='Loading patient context…';
  try{const d=await api('/api/detail',{client_key:demo.client.client_key,enquiry_id:id}),e=d.enquiry;box.innerHTML=`<h3>${esc(e.contact?.full_name||'Patient')}</h3><p>${esc(e.conversation_summary||'No summary yet.')}</p><div class="kv"><span>Service</span><b>${esc(e.service?.name||'General')}</b><span>Source</span><b>${esc(e.source)}</b><span>Booking</span><b>${esc(e.booking_status)}</b><span>Attention</span><b>${esc(e.attention_status)}</b><span>Next action</span><b>${esc(e.next_action||'—')}</b></div><div class="detail-actions"><button class="primary" data-action="${e.automation_paused?'return_to_assistant':'take_over'}">${e.automation_paused?'Return to assistant':'Take over conversation'}</button><button data-action="set_follow_up">Set follow-up</button><button data-action="close">Close</button></div>`;$$('[data-action]',box).forEach(b=>b.onclick=()=>staffAction(id,b.dataset.action));}
  catch(e){box.innerHTML=`Could not load this enquiry: ${esc(e.message)}`}
}
async function staffAction(id,action){
  try{const body={client_key:demo.client.client_key,enquiry_id:id,action_type:action,staff_id:demo.staff?.id};if(action==='set_follow_up'){body.follow_up_due_at=new Date(Date.now()+24*60*60*1000).toISOString();body.note='Follow up with patient tomorrow'}await api('/api/action',body);toast(action==='take_over'?'Assistant paused for this conversation.':action==='return_to_assistant'?'Assistant returned to the conversation.':'Staff action saved.');await refreshStaff();}
  catch(e){toast(e.message)}
}

function renderWebsite(){
  if(!demo||level<3)return;const c=demo.client,brand=c.branding||{},svc=demo.services?.[0]||{name:'Dental Cleaning',price_display:'Price confirmed by clinic'},ini=brand.logo_text||initials(c.display_name);
  $('#websiteExperience').innerHTML=`<div class="fake-site"><div class="site-nav"><div class="site-brand"><i>${esc(ini)}</i><strong>${esc(c.display_name)}</strong></div><span>Home · Services · Contact</span></div><div class="site-hero"><small>${esc(brand.location||'YOUR CLINIC')}</small><h3>A calmer way to start your dental visit.</h3><p>Ask a question, explore services or send an enquiry. This site is generated in your clinic branding for the custom demo.</p><button id="siteChatBtn">Chat with the clinic</button></div><div class="site-body"><div class="site-service"><small>FEATURED SERVICE</small><strong>${esc(svc.name)}</strong><span>${esc(svc.price_display||'Price confirmed by clinic')}</span></div><div class="site-service"><small>PATIENT SUPPORT</small><strong>Questions handled before the front desk steps in</strong><span>Human handoff when needed</span></div></div><div id="siteChat" class="site-chat hidden"><div class="site-chat-head"><strong>${esc(c.display_name)}</strong><button id="closeSiteChat">×</button></div><div class="site-chat-body"><div>Hi 👋 How can we help?</div><button id="askSitePrice">How much is ${esc(svc.name)}?</button></div></div></div><div class="web-side"><div class="web-card"><h3>Send a website enquiry</h3><p>Submit this form, then open “What staff sees”. The synthetic lead will be waiting in the same clinic queue.</p><form id="webForm" class="web-form"><input id="webName" placeholder="Demo patient name" required><input id="webEmail" type="email" placeholder="demo@example.com" required><select id="webService"><option value="${esc(svc.slug)}">${esc(svc.name)}</option><option value="">General enquiry</option></select><textarea id="webMessage" placeholder="I'd like to know more about an appointment…" required></textarea><button>Send enquiry</button></form></div><div class="web-card"><h3>The outcome</h3><p>Instead of someone copying website leads into another system, the enquiry can arrive already labelled with its source and next action.</p><div class="channel-list"><div class="channel active"><strong>WhatsApp</strong><small>demonstrated</small></div><div class="channel active"><strong>Website</strong><small>demonstrated</small></div><div class="channel"><strong>Instagram</strong><small>custom integration</small></div><div class="channel"><strong>Facebook</strong><small>custom integration</small></div><div class="channel"><strong>Email</strong><small>custom integration</small></div><div class="channel"><strong>Other API</strong><small>discovery scope</small></div></div><div class="channel-note">Only channels the clinic owns and can authorise would be connected in production.</div></div></div>`;
  $('#webForm').onsubmit=submitWebsite;$('#siteChatBtn').onclick=()=>$('#siteChat').classList.remove('hidden');$('#closeSiteChat').onclick=()=>$('#siteChat').classList.add('hidden');$('#askSitePrice').onclick=()=>{const body=$('.site-chat-body');body.insertAdjacentHTML('beforeend',`<div class="site-user">How much is ${esc(svc.name)}?</div><div>${esc(svc.name)} is ${esc(svc.price_display||'priced by the clinic')}. Would you like to send an enquiry?</div>`)};
}
async function submitWebsite(e){
  e.preventDefault();const btn=$('button',e.currentTarget);btn.disabled=true;btn.textContent='Sending…';
  try{await api('/api/website',{client_key:demo.client.client_key,full_name:$('#webName').value,email:$('#webEmail').value,message:$('#webMessage').value,service_slug:$('#webService').value});toast('Website enquiry captured. Open the staff view to see it.');e.currentTarget.reset();}
  catch(err){toast(err.message)}finally{btn.disabled=false;btn.textContent='Send enquiry'}
}

async function createDemo(e){
  e.preventDefault();const btn=$('#buildBtn'),selected=Number($('input[name="level"]:checked').value);btn.disabled=true;btn.querySelector('span').textContent='Building your clinic…';
  try{demo=await api('/api/create',{clinic_name:$('#clinicName').value,location:$('#location').value,brand_color:$('#brandColor').value,featured_service:$('#serviceName').value,featured_price:$('#servicePrice').value,package_level:selected});history.replaceState(null,'',`${location.pathname}?demo=${encodeURIComponent(demo.client.client_key)}`);$('#builder').classList.add('hidden');$('#experience').classList.remove('hidden');applyDemo();switchView('patient');window.scrollTo({top:0});}
  catch(err){toast(err.message)}finally{btn.disabled=false;btn.querySelector('span').textContent='Show me my clinic'}
}
async function loadDemo(key){
  try{demo=await api('/api/config',{client_key:key});$('#builder').classList.add('hidden');$('#experience').classList.remove('hidden');applyDemo();switchView('patient');window.scrollTo({top:0})}
  catch(e){toast('That demo has expired. Build a fresh one.');showBuilder()}
}

$('#builderForm').addEventListener('submit',createDemo);
$('#brandColor').addEventListener('input',e=>{$('#colorText').textContent=e.target.value.toUpperCase();setBrand(e.target.value)});
$$('input[name="level"]').forEach(r=>r.onchange=()=>$$('.level-option').forEach(x=>x.classList.toggle('selected',$('input',x).checked)));
$('#chatForm').onsubmit=e=>{e.preventDefault();sendChat($('#chatInput').value)};
$('#openStaff').onclick=()=>switchView('staff');$('#refreshStaff').onclick=refreshStaff;$('#tryAnother').onclick=showBuilder;$$('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
const existing=new URLSearchParams(location.search).get('demo');if(existing)loadDemo(existing);else setBrand($('#brandColor').value);
