const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

const defaultConfig={name:'Pearl Dental Clinic',location:'Lekki, Lagos',service:'Teeth Cleaning',price:'₦25,000',colour:'#277a61',care:2};
let config={...defaultConfig};
let chatState={stage:'idle',name:'Demo Patient',email:'',phone:'this WhatsApp number',date:'',time:'',handoff:false,messages:[]};
let crmExtra=[];

const careMeta={
  1:{label:'Care 1 · Essential',short:'Care 1',nav:'Enquiry table',chip:'Care 1 · enquiry capture',crmTitle:'Simple enquiry table',crmDesc:'Approved questions are handled and useful enquiries are captured for staff. Appointment times remain requests until staff confirms them.'},
  2:{label:'Care 2 · Operations',short:'Care 2',nav:'Enquiry CRM',chip:'Care 2 · booking-aware',crmTitle:'Enquiry CRM',crmDesc:'Patient conversations become structured staff work with booking state, activity history, human takeover and follow-up.'},
  3:{label:'Care 3 · Custom',short:'Care 3',nav:'Clinic OS',chip:'Care 3 · custom workflow',crmTitle:'Custom clinic operations',crmDesc:'The same patient operations foundation extends into custom modules, locations, channels, payments and deeper workflow control.'}
};

const cannedPatients=[
  ['TA','Teni A.','Teeth Cleaning','WhatsApp','Booked'],
  ['MO','Michael O.','Whitening','WhatsApp','Open'],
  ['ZA','Zara A.','Clinical question','WhatsApp','Needs human'],
  ['DA','Dayo A.','Braces','Website','Follow-up']
];

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function initials(name){return String(name||'Clinic').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'C'}
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2500)}
function hexToRgb(hex){let h=String(hex).replace('#','').trim();if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return Number.isFinite(n)?[(n>>16)&255,(n>>8)&255,n&255]:[39,122,97]}
function setBrand(hex){const safe=/^#[0-9a-fA-F]{6}$/.test(hex)?hex:'#277a61',rgb=hexToRgb(safe);document.documentElement.style.setProperty('--brand',safe);document.documentElement.style.setProperty('--brand-rgb',rgb.join(','));$('#brandColor').value=safe;$('#colourValue').textContent=safe.toUpperCase();$$('.swatch').forEach(s=>s.classList.toggle('active',s.dataset.colour.toLowerCase()===safe.toLowerCase()))}
function updateCareSelection(){
  $$('.care-option').forEach(label=>label.classList.toggle('selected',Number($('input',label).value)===Number(config.care)));
  $$('[data-care-switch]').forEach(b=>b.classList.toggle('active',Number(b.dataset.careSwitch)===Number(config.care)));
  $('#navCareLabel').textContent=careMeta[config.care].short;
  $('#crmNavLabel').textContent=careMeta[config.care].nav;
  $('#patientFeatureChip').textContent=careMeta[config.care].chip;
  $('#crmTitle').textContent=careMeta[config.care].crmTitle;
  $('#crmDescription').textContent=careMeta[config.care].crmDesc;
  $('#crmFeatureChip').textContent=careMeta[config.care].short;
  const custom=config.care===3;
  for(const id of ['websiteNav','channelsNav','mobileWebsite','mobileChannels']){
    const el=$('#'+id);if(el)el.classList.toggle('locked',!custom);
  }
}
function applyBranding(){
  setBrand(config.colour);
  const ini=initials(config.name);
  $('#clinicLogo').textContent=ini;$('#navLogo').textContent=ini;$('#phoneAvatar').textContent=ini;
  $('#demoClinicName').textContent=config.name;$('#demoClinicLocation').textContent=config.location;
  $('#navClinicName').textContent=config.name;$('#phoneClinicName').textContent=config.name;
  $('#demoStateText').textContent=careMeta[config.care].label;
  updateCareSelection();
}

function serializeConfig(){
  const p=new URLSearchParams();p.set('clinic',config.name);p.set('location',config.location);p.set('service',config.service);p.set('price',config.price);p.set('colour',config.colour.replace('#',''));p.set('care',String(config.care));history.replaceState(null,'',location.pathname+'?'+p.toString());
}
function loadFromUrl(){
  const p=new URLSearchParams(location.search);if(!p.has('clinic'))return false;
  config={name:(p.get('clinic')||defaultConfig.name).slice(0,55),location:(p.get('location')||defaultConfig.location).slice(0,45),service:(p.get('service')||defaultConfig.service).slice(0,45),price:(p.get('price')||defaultConfig.price).slice(0,25),colour:'#'+(p.get('colour')||'277a61').replace(/[^0-9a-f]/gi,'').slice(0,6),care:[1,2,3].includes(Number(p.get('care')))?Number(p.get('care')):2};return true
}
function hydrateBuilder(){
  $('#clinicName').value=config.name;$('#clinicLocation').value=config.location;$('#serviceName').value=config.service;$('#servicePrice').value=config.price;setBrand(config.colour);const radio=$(`input[name="care"][value="${config.care}"]`);if(radio)radio.checked=true;updateCareSelection();
}

function showBuilder(){
  $('#builderScreen').classList.remove('hidden');$('#demoScreen').classList.add('hidden');$('#editDemoBtn').classList.add('hidden');hydrateBuilder();window.scrollTo({top:0,behavior:'smooth'});
}
function showDemo(){
  applyBranding();serializeConfig();resetChat();renderCRM();renderWebsite();renderChannels();switchView('patient');$('#builderScreen').classList.add('hidden');$('#demoScreen').classList.remove('hidden');$('#editDemoBtn').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'});
}
function switchView(view){
  if((view==='website'||view==='channels')&&config.care!==3){toast('That experience is unlocked in Care 3 · Custom.');return}
  $$('.app-view').forEach(v=>v.classList.toggle('active',v.dataset.viewPanel===view));$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
}

function assistant(text){chatState.messages.push({who:'assistant',text});renderChat()}
function user(text){chatState.messages.push({who:'user',text});renderChat()}
function staff(text){chatState.messages.push({who:'staff',text});renderChat()}
function resetChat(){
  chatState={stage:'idle',name:'Demo Patient',email:'',phone:'this WhatsApp number',date:'',time:'',handoff:false,messages:[{who:'assistant',text:`Hi 👋 Welcome to ${config.name}. How can I help you today?`}]};renderChat();
}
function renderChat(){
  const thread=$('#phoneThread');thread.innerHTML=chatState.messages.map(m=>`<div class="chat-msg ${m.who}"><div>${esc(m.text)}<small>${m.who==='user'?'You':m.who==='staff'?'Clinic staff':'Patient Assistant'} · now</small></div></div>`).join('');thread.scrollTop=thread.scrollHeight;
  const quick=chatState.handoff?[]:chatState.stage==='pick_time'?['10:00 AM','2:00 PM','4:30 PM']:chatState.stage==='pick_date'?['Tomorrow','2 weeks from now']:['Services & prices','Book an appointment','I have tooth pain'];
  $('#quickReplies').innerHTML=quick.map(q=>`<button type="button" data-quick="${esc(q)}">${esc(q)}</button>`).join('');$$('[data-quick]').forEach(b=>b.onclick=()=>handleChat(b.dataset.quick));
  $('#automationState').textContent=chatState.handoff?'Human takeover':'Assistant active';$('#automationState').classList.toggle('human',chatState.handoff);
  const rows=[['Care level',careMeta[config.care].short],['Featured service',config.service],['Booking state',chatState.stage==='confirmed'?'Confirmed':chatState.stage.startsWith('pick_')||chatState.stage.startsWith('collect_')?'In progress':chatState.handoff?'Paused':'Open'],['Human handoff',chatState.handoff?'Active':'Ready']];
  $('#patientStateList').innerHTML=rows.map(r=>`<div class="state-row"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('');
  const careCopy=config.care===1?'Care 1 captures appointment intent and passes the request to staff for confirmation.':config.care===2?'Care 2 can check defined availability, manage booking state and schedule follow-up.':'Care 3 can extend the same flow with branches, providers, payments and custom rules.';
  $('#experienceCard').innerHTML=`<small>WHAT YOU ARE EXPERIENCING</small><strong>${esc(careMeta[config.care].label)}</strong><p>${esc(careCopy)}</p>`;
}
function cleanMessage(v){return String(v||'').trim().slice(0,500)}
function handleChat(raw){
  const text=cleanMessage(raw);if(!text)return;user(text);$('#chatInput').value='';if(chatState.handoff){staff('A staff member is handling this conversation now. In a real deployment, your team would reply from the connected inbox.');return}
  const low=text.toLowerCase();
  if(/pain|swollen|bleed|medicine|dosage|antibiotic|diagnos|emergency/.test(low)){
    chatState.handoff=true;assistant('I can help with clinic information and appointments, but I can’t safely diagnose symptoms or recommend medication here. I’ll hand this to the clinic team.');staff('Hi, the clinic team has taken over this conversation.');return
  }
  if(/service|price|cost|how much|cleaning|whitening|braces/.test(low)&&chatState.stage==='idle'){
    assistant(`${config.service} is ${config.price} in this demo. I can also help you ${config.care===1?'send an appointment request':'book an appointment'} if you want.`);return
  }
  if(/book|appointment|schedule/.test(low)&&chatState.stage==='idle'){
    chatState.stage='collect_name';assistant(`Sure. I can help with a ${config.service} appointment. What name should I put on it?`);return
  }
  if(chatState.stage==='collect_name'){
    if(text.length<2||/what|why|name|hello|yes|no/i.test(text)){assistant('What name should I put on the appointment?');return}
    chatState.name=text;chatState.stage='collect_email';assistant(`Thanks, ${chatState.name}. What email should the clinic use for the appointment?`);return
  }
  if(chatState.stage==='collect_email'){
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)){assistant('Send me a valid email address for the appointment.');return}
    chatState.email=text;chatState.stage='pick_date';assistant(config.care===1?'What day and time would you prefer? I’ll record it as a request for the clinic team.':'What day would you like? I can check the demo availability.');return
  }
  if(chatState.stage==='pick_date'){
    chatState.date=text;chatState.stage='pick_time';if(config.care===1){assistant('And what time window works best for you?');return}assistant(`${text} has demo availability. Pick a time: 10:00 AM, 2:00 PM or 4:30 PM.`);return
  }
  if(chatState.stage==='pick_time'){
    chatState.time=text;
    if(config.care===1){chatState.stage='confirmed';assistant(`Got it. I’ve captured your ${config.service} request for ${chatState.date} at ${text}. The clinic team would confirm the actual appointment with you.`);addSyntheticLead('WhatsApp','Requested');return}
    chatState.stage='confirmed';assistant(`Done. Your demo ${config.service} appointment is confirmed for ${chatState.date} at ${text}.`);addSyntheticLead('WhatsApp','Booked');return
  }
  if(/human|person|staff|receptionist/.test(low)){chatState.handoff=true;assistant('Of course. I’ll hand this conversation to the clinic team.');staff('A staff member has taken over.');return}
  assistant(`I can help with ${config.name} service information, pricing and ${config.care===1?'appointment requests':'appointments'}. Try asking “How much is ${config.service}?” or “Book an appointment”.`)
}
function addSyntheticLead(source,status){
  const row=[initials(chatState.name),chatState.name,config.service,source,status];crmExtra.unshift(row);renderCRM();
}

function renderCRM(){
  const rows=[...crmExtra,...cannedPatients.map(r=>[r[0],r[1],r[2]==='Teeth Cleaning'?config.service:r[2],r[3],r[4]])].slice(0,8);
  let metrics,workflow,note='';
  if(config.care===1){metrics=[['12','Enquiries','captured this week'],['4','Requests','awaiting staff'],['2','Needs human','staff attention'],['—','Automation','follow-up not included']];workflow=[['Patient asks','Assistant uses approved clinic facts'],['Enquiry captured','Contact + service interest'],['Appointment preference','Recorded as a request'],['Staff continues','Clinic confirms manually']];note='<div class="simple-table-note"><strong>Care 1 intentionally stays simple.</strong> This is an enquiry table, not a custom CRM. It gives staff the captured details without adding workflow complexity.</div>'}
  else if(config.care===2){metrics=[['24','Open','active enquiries'],['7','Bookings','in workflow'],['3','Needs human','automation paused'],['5','Follow-ups','eligible today']];workflow=[['Patient conversation','Approved service data'],['CRM record','Context + activity history'],['Booking engine','Checks defined availability'],['Staff control','Take over / return to assistant'],['Follow-up','Eligible only while open']];}
  else{metrics=[['86','Conversations','configured channels'],['18','Appointments','demo today'],['4','Queues','role-routed'],['2','Locations','example custom scope']];workflow=[['Multi-channel intake','WhatsApp + web + scoped channels'],['Custom routing','Branch, staff role or provider'],['Advanced scheduling','Location/provider rules'],['Optional payment step','Deposit or payment workflow'],['Lifecycle automation','Recall + follow-up modules']];}
  const badges=s=>/human|request/i.test(s)?'warn':/open|follow/i.test(s)?'neutral':'';
  $('#crmSurface').innerHTML=`<div class="crm-shell">${note}<div class="crm-metrics">${metrics.map(m=>`<div class="crm-metric"><small>${esc(m[1])}</small><strong>${esc(m[0])}</strong><span>${esc(m[2])}</span></div>`).join('')}</div><div class="crm-grid"><div class="crm-card"><div class="crm-card-head"><div><strong>${esc(config.care===1?'Captured enquiries':config.care===2?'Patient enquiries':'Unified operational queue')}</strong><small>Synthetic demo records</small></div></div><div class="crm-table"><div class="crm-row header"><span>Patient</span><span>Service</span><span>Source</span><span>State</span><span>Action</span></div>${rows.map(r=>`<div class="crm-row"><div class="patient-cell"><i>${esc(r[0])}</i><strong>${esc(r[1])}</strong></div><span>${esc(r[2])}</span><span>${esc(r[3])}</span><span class="badge ${badges(r[4])}">${esc(r[4])}</span><span>${esc(config.care===1?'Contact patient':config.care===2?'Open record':'Route workflow')}</span></div>`).join('')}</div><div class="crm-actions">${config.care===1?'<button>Export table</button>':'<button class="primary-action" id="takeoverDemo">Take over selected chat</button><button id="followupDemo">Set follow-up</button><button>View activity</button>'}</div></div><div class="crm-card"><div class="crm-card-head"><div><strong>How work moves</strong><small>${esc(careMeta[config.care].label)}</small></div></div><div class="workflow-list">${workflow.map(w=>`<div class="workflow-item"><strong>${esc(w[0])}</strong><span>${esc(w[1])}</span></div>`).join('')}</div></div></div></div>`;
  const t=$('#takeoverDemo');if(t)t.onclick=()=>{chatState.handoff=true;renderChat();toast('Demo conversation moved to human takeover.');};const f=$('#followupDemo');if(f)f.onclick=()=>toast('Demo follow-up scheduled for tomorrow.');
}

function renderWebsite(){
  $('#websiteFrame').innerHTML=`<div class="site-preview-top"><div class="site-preview-brand"><span>${esc(initials(config.name))}</span><strong>${esc(config.name)}</strong></div><div class="site-preview-links"><span>Home</span><span>Services</span><span>About</span><span>Contact</span></div></div><div class="site-hero"><div><small>${esc(config.location)}</small><h3>A calmer way to care for your smile.</h3><p>Example branded website generated for ${esc(config.name)}. In a real Care 3 implementation, the website can be designed around the clinic’s actual brand and connected to the same enquiry and CRM workflow.</p><div class="site-cta"><button type="button">Book appointment</button><button type="button" class="secondary">Chat with us</button></div></div><form class="web-form" id="webLeadForm"><h4>Request an appointment</h4><p>Submit this demo form and watch the enquiry appear in the CRM.</p><label>Name<input id="webName" value="Amina Bello" required></label><label>Email<input id="webEmail" type="email" value="amina@example.com" required></label><label>Service<select id="webService"><option>${esc(config.service)}</option><option>Teeth Whitening</option><option>Braces Consultation</option></select></label><button type="submit">Send enquiry</button></form></div><div class="website-lower"><div class="website-feature"><strong>Website intake</strong><p>Web enquiries can enter the same patient operations workflow instead of living in a separate inbox.</p></div><div class="website-feature"><strong>Embedded assistant</strong><p>A web chat assistant can use the same approved service information and handoff rules.</p></div><div class="website-feature"><strong>CRM connection</strong><p>Form and chat context can be captured as staff-manageable records.</p></div></div>`;
  $('#webLeadForm').onsubmit=e=>{e.preventDefault();const name=$('#webName').value.trim()||'Website Patient';const service=$('#webService').value;crmExtra.unshift([initials(name),name,service,'Website','New']);renderCRM();toast('Website enquiry added to the demo CRM.');};
}
function renderChannels(){
  const channels=[['WA','WhatsApp','Core patient messaging channel','Supported'],['WEB','Website','Forms + embedded patient assistant','Supported'],['IG','Instagram','Can be integrated where approved APIs and account permissions allow','Custom'],['FB','Facebook','Can be connected into a custom enquiry workflow','Custom'],['MAIL','Email','Enquiries can feed the same operational record','Custom'],['API','Other systems','Custom integrations depend on the clinic’s tools and available APIs','Discovery']];
  $('#channelsGrid').innerHTML=channels.map(c=>`<div class="channel-card"><span class="channel-icon">${esc(c[0])}</span><strong>${esc(c[1])}</strong><p>${esc(c[2])}</p><span class="channel-status">${esc(c[3])}</span></div>`).join('');
}

$('#demoBuilder').addEventListener('submit',e=>{
  e.preventDefault();const care=Number($('input[name="care"]:checked').value);config={name:$('#clinicName').value.trim()||defaultConfig.name,location:$('#clinicLocation').value.trim()||defaultConfig.location,service:$('#serviceName').value.trim()||defaultConfig.service,price:$('#servicePrice').value.trim()||defaultConfig.price,colour:$('#brandColor').value,care};crmExtra=[];showDemo();
});
$('#brandColor').addEventListener('input',e=>setBrand(e.target.value));$$('.swatch').forEach(s=>s.addEventListener('click',()=>setBrand(s.dataset.colour)));$$('input[name="care"]').forEach(r=>r.addEventListener('change',()=>{$$('.care-option').forEach(l=>l.classList.toggle('selected',$('input',l).checked));}));
$('#editDemoBtn').onclick=showBuilder;$$('[data-reset-home]').forEach(a=>a.onclick=e=>{e.preventDefault();history.replaceState(null,'',location.pathname);config={...defaultConfig};showBuilder()});
$$('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));$$('[data-care-switch]').forEach(b=>b.onclick=()=>{config.care=Number(b.dataset.careSwitch);applyBranding();serializeConfig();resetChat();renderCRM();renderWebsite();renderChannels();switchView('patient');toast(`Switched to ${careMeta[config.care].label}.`)});
$('#chatForm').addEventListener('submit',e=>{e.preventDefault();handleChat($('#chatInput').value)});$('#resetChatBtn').onclick=resetChat;

if(loadFromUrl()){hydrateBuilder();showDemo()}else hydrateBuilder();
