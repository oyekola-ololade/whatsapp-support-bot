const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

const packages={
  1:{
    title:'Care Level 1 · Essential',subtitle:'Patient Assistant + Simple Enquiry Table',capability:'Assistant + simple enquiry capture',operationsLabel:'Enquiry table',opsTitle:'Simple enquiry table',opsDescription:'A lightweight operational list for staff. No custom CRM application.',opsTag:'LEVEL 1',scheduleTitle:'Appointment request capture',scheduleDescription:'The assistant records a preferred date and time. Staff confirms the actual appointment.',scheduleTag:'REQUEST ONLY',insightsTitle:'Basic enquiry visibility',insightsDescription:'See what has been captured without adding an advanced reporting layer.',insightsTag:'LEVEL 1',
    metrics:[['12','Enquiries','captured this week'],['4','Appointment requests','awaiting staff'],['2','Needs human','staff attention'],['—','Follow-up engine','not included']],
    records:[
      ['TA','Teni A.','Cleaning','WhatsApp','Request','New'],['MO','Michael O.','Whitening','WhatsApp','—','Open'],['ZA','Zara A.','Clinical question','WhatsApp','—','Needs human'],['DA','Dayo A.','Braces','Website','Request','New']
    ],
    workflow:[['Patient asks a question','Assistant uses approved clinic facts'],['Useful enquiry captured','Contact + service interest saved'],['Appointment preference recorded','Request only · not yet confirmed'],['Staff notified','Clinic team continues in WhatsApp']],
    context:[['Source','WhatsApp'],['Interest','Cleaning'],['Preferred time','Tomorrow · 2–4 PM'],['Booking state','Requested'],['Staff action','Confirm manually']],
    chat:[
      {who:'patient',text:'Hi, how much is teeth cleaning?'},
      {who:'assistant',text:'Cleaning is ₦20,000–₦25,000. Would you like me to help with an appointment request?'},
      {who:'patient',text:'Yes, tomorrow afternoon please.'},
      {who:'assistant',text:'Got it. I’ve recorded tomorrow afternoon as your preference and sent the request to the clinic team. They’ll confirm the appointment with you.'}
    ],
    actions:['Approved price lookup','Request captured','Staff notified'],
    scheduleLower:[
      {title:'What Level 1 does',body:'Captures the patient’s preferred date and time, then creates an appointment request for staff.',items:['Preference captured','Request status','Staff confirmation']},
      {title:'What it does not do',body:'It does not independently claim the slot is confirmed without an authoritative availability mechanism.',items:['No auto-confirm','No slot engine','No calendar sync']}
    ],
    insights:[
      {type:'number',label:'Enquiries captured',value:'12',copy:'Basic weekly count from the simple enquiry surface.'},
      {type:'number',label:'Needs staff',value:'2',copy:'Clinical or unsupported questions routed to a human.'},
      {type:'funnel',label:'Simple flow',rows:[['New enquiries',100,12],['Appointment requests',58,7],['Staff contacted',42,5]]}
    ]
  },
  2:{
    title:'Care Level 2 · Operations',subtitle:'Patient Assistant + Enquiry CRM',capability:'Branded CRM + booking + follow-up',operationsLabel:'Enquiry CRM',opsTitle:'Enquiry CRM',opsDescription:'Every useful patient interaction becomes a structured, staff-manageable record.',opsTag:'LIVE PREVIEW',scheduleTitle:'Availability-aware booking',scheduleDescription:'Defined clinic hours, blocked periods and existing appointments are checked before a slot is confirmed.',scheduleTag:'LEVEL 2',insightsTitle:'Operational pulse',insightsDescription:'See enquiries, booking state, staff attention and follow-up work in one place.',insightsTag:'LEVEL 2',
    metrics:[['24','Open enquiries','across channels'],['7','Booking requests','3 ready to confirm'],['3','Needs human','clinical / exception'],['5','Follow-ups due','eligible today']],
    records:[
      ['TA','Teni A.','Cleaning','WhatsApp','Confirmed','Booked'],['MO','Michael O.','Whitening','WhatsApp','Requested','Open'],['ZA','Zara A.','Clinical question','WhatsApp','—','Needs human'],['DA','Dayo A.','Braces','Website','Proposed','Contacted']
    ],
    workflow:[['Patient asks a question','Assistant uses approved business data'],['Enquiry record updates','Contact, service and conversation context'],['Availability check runs','Hours + blocks + held/confirmed slots'],['Booking state updates','Confirm or propose another time'],['Follow-up becomes eligible','Only while open and automation active']],
    context:[['Source','WhatsApp'],['Interest','Cleaning'],['Preferred time','8 Sep · 2:00 PM'],['Booking state','Confirmed'],['Next action','Appointment scheduled']],
    chat:[
      {who:'patient',text:'Hi, how much is teeth cleaning?'},
      {who:'assistant',text:'Cleaning is ₦20,000–₦25,000. Would you like me to help you book?'},
      {who:'patient',text:'Yes. Tomorrow afternoon.'},
      {who:'assistant',text:'I can check that. I have Teni A. as your name and this WhatsApp number for contact. Should I use those?'},
      {who:'patient',text:'Yes.'},
      {who:'assistant',text:'2:00 PM is available tomorrow. I’ve confirmed your cleaning appointment for 2:00 PM.'}
    ],
    actions:['CRM record updated','Availability checked','Booking confirmed'],
    scheduleLower:[
      {title:'Available slots · Tue 8 Sep',body:'The internal booking layer checks clinic rules before returning an available time.',items:['10:00 AM','11:30 AM','2:00 PM','3:30 PM']},
      {title:'Booking rules',body:'Lightweight operational scheduling, not a full multi-provider calendar product.',items:['Opening hours','Blocked dates','Existing appointments','Slot interval']}
    ],
    insights:[
      {type:'chart',label:'Enquiry activity',values:[42,68,53,84,71,92,64]},
      {type:'number',label:'Needs human',value:'3',copy:'Paused from automation until staff explicitly returns control.'},
      {type:'funnel',label:'Patient workflow',rows:[['Enquiries',100,24],['Booking intent',63,15],['Confirmed',38,9],['Follow-up due',21,5]]},
      {type:'channels',label:'Sources',channels:[['WhatsApp','18','75%'],['Website','6','25%']]}
    ]
  },
  3:{
    title:'Care Level 3 · Custom',subtitle:'Custom Clinic Operations Platform',capability:'Custom clinic operations platform',operationsLabel:'Clinic OS',opsTitle:'Custom clinic operations platform',opsDescription:'A broader operational surface designed around the clinic’s actual workflow after discovery.',opsTag:'CUSTOM PREVIEW',scheduleTitle:'Advanced scheduling layer',scheduleDescription:'Custom-scoped scheduling can extend into provider calendars, locations, deposits and external synchronization.',scheduleTag:'CUSTOM',insightsTitle:'Clinic intelligence',insightsDescription:'Custom reporting can combine channels, locations, staff workflow and patient lifecycle signals.',insightsTag:'CUSTOM',
    metrics:[['86','Active conversations','all configured channels'],['18','Appointments today','across locations'],['4','Staff queues','role-routed'],['91%','Workflow coverage','demo configuration']],
    records:[
      ['TA','Teni A.','Cleaning','WhatsApp','Confirmed','Lekki'],['MO','Michael O.','Whitening','Instagram','Deposit due','VI'],['ZA','Zara A.','Clinical question','WhatsApp','Dentist queue','Lekki'],['DA','Dayo A.','Braces','Website','Consult booked','Lekki']
    ],
    workflow:[['Multi-channel intake','WhatsApp, website and scoped channels'],['Role-based routing','Front desk, dentist, manager queues'],['Advanced scheduling','Provider/location rules + calendar sync'],['Deposit/payment step','Optional custom commercial workflow'],['Lifecycle automation','Recall, follow-up and clinic-specific journeys']],
    context:[['Location','Lekki branch'],['Assigned queue','Front desk'],['Interest','Cleaning'],['Provider rule','Any hygienist'],['Lifecycle','New patient']],
    chat:[
      {who:'patient',text:'Can I get cleaning at Lekki tomorrow after 1 PM?'},
      {who:'assistant',text:'Yes. I’ll check the Lekki schedule for cleaning after 1 PM.'},
      {who:'assistant',text:'I found 2:00 PM with the hygiene team and 4:30 PM with another available provider.'},
      {who:'patient',text:'2 PM works.'},
      {who:'assistant',text:'Great. I’ve reserved 2:00 PM at the Lekki branch. Your clinic can configure whether a deposit is required before final confirmation.'}
    ],
    actions:['Location resolved','Provider rules checked','Lifecycle updated'],
    scheduleLower:[
      {title:'Custom scheduling modules',body:'Care Level 3 is scoped to the clinic instead of promising every scheduling feature by default.',items:['Provider calendars','Multi-location','External calendar sync','Deposit rule']},
      {title:'Operational extensions',body:'The same foundation can be extended rather than replaced.',items:['Roles & permissions','Multi-channel inbox','Payments','Custom automations']}
    ],
    insights:[
      {type:'chart',label:'Conversation volume',values:[58,75,69,90,78,96,88]},
      {type:'funnel',label:'Patient lifecycle',rows:[['New enquiries',100,86],['Qualified intent',72,62],['Booked',53,46],['Completed',39,34],['Recall eligible',28,24]]},
      {type:'channels',label:'Channel mix',channels:[['WhatsApp','54','63%'],['Website','17','20%'],['Instagram','10','12%'],['Other','5','5%']]},
      {type:'number',label:'Locations',value:'2',copy:'Example custom multi-location operational configuration.'}
    ]
  }
};

const conversations={
  teni:{name:'Teni A.',initials:'TA',subtitle:'WhatsApp · New enquiry'},
  mike:{name:'Michael O.',initials:'MO',subtitle:'WhatsApp · Price enquiry'},
  zara:{name:'Zara A.',initials:'ZA',subtitle:'WhatsApp · Needs human'}
};

let activePackage=2;
let activeConversation='teni';
let chatStep=0;

function setText(sel,value){const el=$(sel);if(el)el.textContent=value}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function updatePackageButtons(){
  $$('[data-package]').forEach(btn=>{
    const active=Number(btn.dataset.package)===activePackage;
    btn.classList.toggle('active',active);
    if(btn.getAttribute('role')==='tab')btn.setAttribute('aria-selected',String(active));
  });
  $$('[data-package-card]').forEach(card=>card.classList.toggle('selected',Number(card.dataset.packageCard)===activePackage));
}

function renderMetrics(list){
  $('#metricGrid').innerHTML=list.map(([value,label,copy])=>`<div class="metric"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(copy)}</span></div>`).join('');
}

function renderRecords(rows){
  const p=activePackage;
  const headers=p===1?['Patient','Interest','Source','Appointment','Status']:p===2?['Patient','Service','Source','Booking','Status']:['Patient','Service','Source','State','Location'];
  $('#recordsTable').innerHTML=`<div class="data-row header">${headers.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`+rows.map((r,i)=>{
    const status=r[5];
    const cls=/human|due|requested|deposit/i.test(status)?'warn':/new|open|contacted/i.test(status)?'neutral':'';
    return `<div class="data-row"><div class="data-name"><span>${esc(r[0])}</span><strong>${esc(r[1])}</strong></div><span>${esc(r[2])}</span><span>${esc(r[3])}</span><span>${esc(r[4])}</span><span class="tag ${cls}">${esc(status)}</span></div>`;
  }).join('');
}

function renderWorkflow(rows){
  $('#workflowList').innerHTML=rows.map((r,i)=>`<div class="workflow-step ${i===Math.min(2,rows.length-1)?'current':''}"><strong>${esc(r[0])}</strong><span>${esc(r[1])}</span></div>`).join('');
}

function renderContext(rows,mode='normal'){
  const title=activePackage===1?'Enquiry context':activePackage===2?'CRM context':'Operational context';
  $('#contextPanel').innerHTML=`<h4>${title}</h4><div class="context-card"><small>Patient record</small><strong>${esc(conversations[activeConversation].name)}</strong><span class="context-status ${mode==='human'?'warn':''}">${mode==='human'?'Needs human':'Automation active'}</span></div><div class="context-card">${rows.map(r=>`<div class="context-row"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div><div class="context-card"><small>Safety boundary</small><strong>Clinical judgement → staff</strong><div class="context-row"><span>Diagnosis</span><b>Never automated</b></div><div class="context-row"><span>Prescription</span><b>Never automated</b></div></div>`;
}

function messageHtml(m){return `<div class="msg ${esc(m.who)}"><div class="content">${esc(m.text)}<span class="meta">${m.who==='patient'?'Patient':m.who==='staff'?'Clinic staff':'Bizi Assistant'} · now</span></div></div>`}

function baseChatForConversation(){
  if(activeConversation==='mike')return [
    {who:'patient',text:'How much is whitening?'},
    {who:'assistant',text:'Teeth whitening starts from ₦38,000. I can help with an appointment if you want.'}
  ];
  if(activeConversation==='zara')return [
    {who:'patient',text:'My tooth is swollen and bleeding. What medicine should I take?'},
    {who:'assistant',text:'I can help with clinic information and booking, but I can’t safely assess symptoms or recommend medication here. I’ll hand this to the clinic team.'},
    {who:'staff',text:'Hi Zara, a member of the clinic team has taken over this conversation.'}
  ];
  return packages[activePackage].chat;
}

function renderChat(reset=true){
  const person=conversations[activeConversation];
  $('.chat-person .contact-avatar').textContent=person.initials;
  $('.chat-person strong').textContent=person.name;
  $('.chat-person small').textContent=person.subtitle;
  const human=activeConversation==='zara';
  $('#automationChip').textContent=human?'Human takeover':'Assistant active';
  $('#automationChip').classList.toggle('human',human);
  if(reset)chatStep=human?3:2;
  const all=baseChatForConversation();
  const visible=all.slice(0,Math.min(chatStep,all.length));
  $('#chatThread').innerHTML=visible.map(messageHtml).join('');
  $('#chatThread').scrollTop=$('#chatThread').scrollHeight;
  const actions=human?['Automation paused','Clinical handoff','Staff owns reply']:packages[activePackage].actions;
  $('#suggestedActions').innerHTML=actions.map(a=>`<button tabindex="-1">${esc(a)}</button>`).join('');
  $('#advanceChat').textContent=chatStep>=all.length?'Replay flow':'Run next step';
  renderContext(human?[['Source','WhatsApp'],['Interest','Clinical question'],['Attention','Needs human'],['Automation','Paused'],['Next action','Staff response']]:packages[activePackage].context,human?'human':'normal');
}

function advanceChat(){
  const all=baseChatForConversation();
  if(chatStep>=all.length){chatStep=0;renderChat(false);return}
  chatStep++;
  renderChat(false);
}

function renderCalendar(){
  const cells=[];
  const startOffset=1;
  for(let i=0;i<startOffset;i++)cells.push(`<div class="day muted">${31-startOffset+i+1}</div>`);
  for(let d=1;d<=30;d++){
    let cls='available';let small='';
    if([6,13,20,27].includes(d))cls='blocked';
    if(activePackage>=2&&d===8){cls='selected available';small=activePackage===3?'2 providers':'4 slots'}
    if(activePackage===1&&d===8){cls='selected';small='preferred'}
    cells.push(`<div class="day ${cls}">${d}${small?`<small>${small}</small>`:''}</div>`);
  }
  while(cells.length%7)cells.push(`<div class="day muted">${cells.length-30}</div>`);
  $('#calendarGrid').innerHTML=cells.join('');
}

function renderScheduleLower(items){
  $('#scheduleLower').innerHTML=items.map((card,i)=>`<div class="schedule-card"><strong>${esc(card.title)}</strong><p>${esc(card.body)}</p><div class="${i===0?'slot-list':'module-list'}">${card.items.map(item=>i===0?`<span class="slot">${esc(item)}</span>`:`<div class="module-item"><span>${esc(item)}</span><b>${activePackage===3?'CUSTOM':'ACTIVE'}</b></div>`).join('')}</div></div>`).join('');
}

function renderInsights(items){
  $('#insightGrid').innerHTML=items.map((item,i)=>{
    if(item.type==='number')return `<div class="insight-card"><small>${esc(item.label)}</small><strong>${esc(item.value)}</strong><p>${esc(item.copy)}</p></div>`;
    if(item.type==='chart')return `<div class="insight-card large"><small>${esc(item.label)}</small><div class="bars">${item.values.map((v,j)=>`<div class="bar" style="height:${v}%"><span>${['M','T','W','T','F','S','S'][j]||''}</span></div>`).join('')}</div></div>`;
    if(item.type==='funnel')return `<div class="insight-card ${activePackage===1?'large':'full'}"><small>${esc(item.label)}</small><div class="funnel">${item.rows.map(r=>`<div class="funnel-row"><span>${esc(r[0])}</span><div class="funnel-line"><i style="width:${Number(r[1])}%"></i></div><b>${esc(r[2])}</b></div>`).join('')}</div></div>`;
    if(item.type==='channels')return `<div class="insight-card full"><small>${esc(item.label)}</small><div class="channel-grid">${item.channels.map(c=>`<div class="channel"><strong>${esc(c[1])}</strong><small>${esc(c[0])}</small><span>${esc(c[2])}</span></div>`).join('')}</div></div>`;
    return '';
  }).join('');
}

function renderPackage(){
  const p=packages[activePackage];
  setText('#demoPackageTitle',p.title);setText('#demoPackageSubtitle',p.subtitle);
  $('#packageCapability').innerHTML=`<small>Current package</small><strong>Care Level ${activePackage}</strong><span>${esc(p.capability)}</span>`;
  setText('#operationsLabel',p.operationsLabel);setText('#opsEyebrow',`Care Level ${activePackage}`);setText('#opsTitle',p.opsTitle);setText('#opsDescription',p.opsDescription);setText('#opsScreenTag',p.opsTag);
  setText('#scheduleTitle',p.scheduleTitle);setText('#scheduleDescription',p.scheduleDescription);setText('#scheduleTag',p.scheduleTag);
  setText('#insightsTitle',p.insightsTitle);setText('#insightsDescription',p.insightsDescription);setText('#insightsTag',p.insightsTag);
  setText('#recordsTitle',activePackage===1?'Current enquiry table':activePackage===2?'Recent enquiries':'Unified operational queue');
  setText('#recordsSubtitle',activePackage===1?'Simple captured fields':activePackage===2?'Captured from WhatsApp and website':'Custom-scoped channels and locations');
  setText('#workflowTitle',activePackage===1?'Level 1 workflow':activePackage===2?'Operations workflow':'Custom workflow');
  renderMetrics(p.metrics);renderRecords(p.records);renderWorkflow(p.workflow);renderChat(true);renderCalendar();renderScheduleLower(p.scheduleLower);renderInsights(p.insights);updatePackageButtons();
}

function selectPackage(n,scroll=false){
  activePackage=Number(n);
  activeConversation='teni';
  renderPackage();
  if(scroll)document.querySelector('#demo').scrollIntoView({behavior:'smooth',block:'start'});
}

$$('[data-package]').forEach(btn=>btn.addEventListener('click',()=>selectPackage(btn.dataset.package,btn.classList.contains('package-select'))));
$$('.side-item').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.side-item').forEach(x=>x.classList.toggle('active',x===btn));
  $$('.workspace-view').forEach(v=>v.classList.toggle('active',v.dataset.viewPanel===btn.dataset.view));
}));
$$('.conversation').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.conversation').forEach(x=>x.classList.toggle('active',x===btn));
  activeConversation=btn.dataset.conversation;
  renderChat(true);
}));
$('#advanceChat').addEventListener('click',advanceChat);
$('#resetDemo').addEventListener('click',()=>{activeConversation='teni';$$('.conversation').forEach(x=>x.classList.toggle('active',x.dataset.conversation==='teni'));renderPackage()});

renderPackage();
