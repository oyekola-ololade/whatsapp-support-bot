(()=>{
  const careCopy={
    1:'Care 1 · Approved answers, structured enquiries and appointment requests for staff to confirm.',
    2:'Care 2 · Patient conversations become organised booking, follow-up and human-handoff work.',
    3:'Care 3 · Website, chat and approved channels can feed one custom clinic operations layer.'
  };
  let guideIndex=0,crmPage='overview',crmRows=[],crmAppointments=[];
  let activeService=null,care1Availability={};
  let landingGate=new URLSearchParams(location.search).has('demo')&&!new URLSearchParams(location.search).has('resume');

  function chooseCare(n,scroll=false){
    const num=Math.max(1,Math.min(3,Number(n)||2));
    document.querySelectorAll('input[name="level"]').forEach(r=>r.checked=Number(r.value)===num);
    document.querySelectorAll('[data-care-card]').forEach(c=>c.classList.toggle('selected',Number(c.dataset.careCard)===num));
    const badge=document.querySelector('#selectedCareBadge'),out=document.querySelector('#selectedOutcome strong'),btn=document.querySelector('#buildBtn span');
    if(badge)badge.textContent=`Care ${num} selected`;
    if(out)out.textContent=careCopy[num];
    if(btn)btn.textContent=`Build my Care ${num} demo`;
    if(scroll)document.querySelector('#customise')?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  document.querySelectorAll('[data-pick-level]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();chooseCare(b.dataset.pickLevel,true)}));
  document.querySelectorAll('[data-care-card]').forEach(card=>{
    card.tabIndex=0;
    card.addEventListener('click',e=>{if(!e.target.closest('button'))chooseCare(card.dataset.careCard,false)});
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseCare(card.dataset.careCard,false)}});
  });
  chooseCare(Number(document.querySelector('input[name="level"]:checked')?.value||2),false);

  const trust=document.createElement('div');
  trust.className='buyer-trust-row';
  trust.innerHTML='<span>You control the pace</span><span>Synthetic demo data</span><span>No account required</span>';
  document.querySelector('.builder-copy')?.appendChild(trust);

  function guideSteps(){
    const base=[
      {view:'patient',kicker:'STEP 1 · PATIENT EXPERIENCE',title:'Start as a patient.',copy:level===1?'Ask about a service or request an appointment. Care 1 captures the work and leaves confirmation with staff.':'Ask about a service, price or appointment. Complete the flow or deliberately trigger human takeover.'},
      {view:'staff',kicker:'STEP 2 · STAFF EXPERIENCE',title:level===1?'Now see what the front desk receives.':'Now step behind the front desk.',copy:level===1?'Care 1 stays intentionally light: structured enquiries instead of another heavy CRM.':'The same conversation is already organised inside your clinic-branded workspace.'}
    ];
    if(level===3)base.push({view:'website',kicker:'STEP 3 · WEBSITE + CHANNELS',title:'Now enter through your clinic website.',copy:'Use the website form or assistant, then return to the staff workspace and see everything feeding one queue.'});
    else if(level===2)base.push({view:'staff',crm:'followups',kicker:'STEP 3 · FOLLOW-UP',title:'See how the work keeps moving.',copy:'A seeded follow-up is waiting so this step never dead-ends. Open it and see the next action stay attached to the patient.'});
    return base;
  }
  function updateGuide(fromView){
    const guide=document.querySelector('#demoGuide');if(!guide||guide.classList.contains('dismissed'))return;
    const steps=guideSteps();let idx=steps.findIndex((s,i)=>s.view===fromView&&(i>=guideIndex||i===0));if(idx<0)idx=Math.min(guideIndex,steps.length-1);guideIndex=idx;
    const s=steps[guideIndex];
    document.querySelector('#guideStep').textContent=`${guideIndex+1} of ${steps.length}`;
    document.querySelector('#guideKicker').textContent=s.kicker;document.querySelector('#guideTitle').textContent=s.title;document.querySelector('#guideCopy').textContent=s.copy;
    document.querySelector('#guideNext').textContent=guideIndex===steps.length-1?'Finish tour':'Next step →';
    document.querySelectorAll('.tour-focus').forEach(x=>x.classList.remove('tour-focus'));
    document.querySelector(`[data-view="${s.view}"]`)?.classList.add('tour-focus');
  }
  function startGuide(){guideIndex=0;const g=document.querySelector('#demoGuide');g?.classList.remove('dismissed');updateGuide('patient')}

  const originalSwitch=switchView;
  switchView=function(view){
    originalSwitch(view);
    const steps=guideSteps(),idx=steps.findIndex(s=>s.view===view);if(idx>=0&&idx>guideIndex)guideIndex=idx;
    updateGuide(view);
  };

  function enhancePatientChrome(){
    const head=document.querySelector('.phone-head');
    if(head&&!document.querySelector('#patientResetCompact')){
      const b=document.createElement('button');b.id='patientResetCompact';b.className='patient-reset';b.type='button';b.textContent='Reset chat';
      b.onclick=async()=>{b.disabled=true;b.textContent='Resetting…';try{await startNewPatient();activeService=null;care1Availability={};hideJourneyNext();}finally{b.disabled=false;b.textContent='Reset chat'}};
      head.appendChild(b);
    }
    const old=document.querySelector('#resetPatient');if(old)old.classList.add('legacy-reset');
  }

  const originalApply=applyDemo;
  applyDemo=function(){
    if(landingGate){showBuilder();return}
    originalApply();activeService=null;care1Availability={};startGuide();renderWebsite();enhancePatientChrome();hideJourneyNext();
  };
  document.querySelector('#builderForm')?.addEventListener('submit',()=>{landingGate=false},{capture:true});
  document.addEventListener('DOMContentLoaded',()=>{if(landingGate)showBuilder()},{once:true});

  document.querySelector('#guideDismiss')?.addEventListener('click',()=>document.querySelector('#demoGuide')?.classList.add('dismissed'));
  document.querySelector('#guideNext')?.addEventListener('click',()=>{
    const steps=guideSteps();if(guideIndex>=steps.length-1){document.querySelector('#demoGuide')?.classList.add('dismissed');return}
    guideIndex++;const s=steps[guideIndex];switchView(s.view);if(s.crm){crmPage=s.crm;setTimeout(()=>renderCrmPage(crmPage),80)}updateGuide(s.view);
  });

  function normalText(v){return String(v||'').trim().toLowerCase()}
  function serviceFromText(text){
    const t=normalText(text);if(!t)return null;
    return (demo?.services||[]).find(s=>t.includes(normalText(s.name)))||null;
  }
  function contextualTransport(text){
    const explicit=serviceFromText(text);if(explicit)activeService=explicit;
    if(!activeService)return text;
    const t=normalText(text),hasExplicit=Boolean(explicit);
    const priceFollow=/\b(how much|price|cost|fee|service and price|details|tell me more|more about it|what does it include|about it)\b/i.test(t);
    const bookingFollow=/\b(book|booking|appointment|schedule|reserve|slot)\b/i.test(t);
    if(!hasExplicit&&bookingFollow)return `Book an appointment for ${activeService.name}. ${text}`;
    if(!hasExplicit&&priceFollow)return `${text} I mean ${activeService.name}.`;
    return text;
  }

  function hideJourneyNext(){document.querySelector('#journeyNext')?.remove()}
  function showJourneyNext(kind='complete'){
    const side=document.querySelector('.patient-side');if(!side)return;
    let card=document.querySelector('#journeyNext');if(!card){card=document.createElement('div');card.id='journeyNext';card.className='journey-next';side.appendChild(card)}
    const title=kind==='handoff'?'Human takeover is active.':'Patient step complete.';
    const copy=kind==='handoff'?'Now see how the receptionist sees and controls this exact conversation.':'Now step behind the front desk and see what this conversation created.';
    card.innerHTML=`<small>NEXT IN THE STORY</small><strong>${title}</strong><p>${copy}</p><button type="button" id="journeyOpenStaff">See what your team sees →</button>`;
    document.querySelector('#journeyOpenStaff').onclick=()=>switchView('staff');
  }

  function friendlyDate(iso){try{return new Intl.DateTimeFormat('en-NG',{weekday:'short',day:'numeric',month:'short'}).format(new Date(`${iso}T12:00:00`))}catch{return iso}}
  function isoDay(offset){const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function validPersonName(v){const n=String(v||'').trim();return n.length>=2&&n.length<=80&&!/^(admin|administrator|root|system|bot|assistant|receptionist|test|testing|null|undefined|none)$/i.test(n)&&/\p{L}/u.test(n)&&!/@|\d{3,}/.test(n)}

  async function offerCare1Dates(){
    messages.push({who:'assistant',text:'Let me show you only times the clinic actually has open.'});renderThread(true);
    const dates=Array.from({length:10},(_,i)=>isoDay(i));
    const results=await Promise.all(dates.map(date=>api('/api/availability',{client_key:demo.client.client_key,date}).then(x=>({date,slots:x.slots||[]})).catch(()=>({date,slots:[]}))));
    care1Availability={};for(const r of results)if(r.slots.length)care1Availability[r.date]=r.slots;
    const open=results.filter(r=>r.slots.length).slice(0,7);
    messages=messages.filter(m=>m.text!=='Let me show you only times the clinic actually has open.');
    if(!open.length){messages.push({who:'assistant',text:'There are no open demo slots in the next few days. Try another time later.'});pendingChoices=[];renderThread();return}
    messages.push({who:'assistant',text:'Which day would you prefer?'});pendingChoices=open.map(r=>({kind:'action',value:'date',date:r.date,label:friendlyDate(r.date),description:`${r.slots.length} times available`}));renderThread();
  }

  packageOneRequest=async function(text){
    if(p1.stage==='idle'&&!/appointment|book|request|schedule/i.test(text))return false;
    bubble('user',text);
    if(p1.stage==='idle'){
      const found=serviceFromText(text);if(found)activeService=found;
      const svc=activeService||demo.services?.[0];p1.service_slug=svc?.slug||'featured-service';p1.service_name=svc?.name||'appointment';p1.stage='name';bubble('assistant',`Sure. What name should I put on the ${p1.service_name} request?`);return true;
    }
    if(p1.stage==='name'){
      if(!validPersonName(text)){bubble('assistant','Please enter a real person name for the appointment request.');return true}
      p1.name=text.trim();p1.stage='email';bubble('assistant','Thanks. What email should the clinic use to confirm the request?');return true;
    }
    if(p1.stage==='email'){
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)){bubble('assistant','Send me a valid email address for the request.');return true}
      p1.email=text.trim();p1.stage='date';await offerCare1Dates();return true;
    }
    if(p1.stage==='date'){
      const iso=(text.match(/20\d{2}-\d{2}-\d{2}/)||[])[0];
      if(!iso||!care1Availability[iso]?.length){bubble('assistant','Please choose one of the available days shown below.');pendingChoices=Object.keys(care1Availability).slice(0,7).map(d=>({kind:'action',value:'date',date:d,label:friendlyDate(d)}));renderThread();return true}
      p1.date=iso;p1.stage='time';bubble('assistant',`What time works best on ${friendlyDate(iso)}?`);pendingChoices=care1Availability[iso].slice(0,9).map(t=>({kind:'action',value:'time',time:String(t).slice(0,5),label:String(t).slice(0,5)}));renderThread();return true;
    }
    if(p1.stage==='time'){
      const tm=(text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)||[]);const time=tm.length?`${String(Number(tm[1])).padStart(2,'0')}:${tm[2]}`:'';
      const available=(care1Availability[p1.date]||[]).map(x=>String(x).slice(0,5));
      if(!time||!available.includes(time)){bubble('assistant','Please choose one of the available times shown below.');pendingChoices=available.slice(0,9).map(t=>({kind:'action',value:'time',time:t,label:t}));renderThread();return true}
      p1.time=time;pendingChoices=[];renderThread(true);
      try{
        const d=await api('/api/request',{client_key:demo.client.client_key,full_name:p1.name,email:p1.email,phone:'',preferred_date:p1.date,preferred_time:p1.time,service_slug:p1.service_slug});
        lastEnquiryId=d.enquiry_id;p1.stage='done';messages.push({who:'assistant',text:'Your preferred time has been sent to the clinic team. They’ll confirm it for you.'});renderThread();showJourneyNext('complete');
      }catch(e){messages.push({who:'assistant',text:'I could not save that demo request. Please try again.'});renderThread();toast(e.message)}
      return true;
    }
    return false;
  };

  sendChat=async function(raw){
    const text=String(raw||'').trim().slice(0,700);if(!text||handoff)return;document.querySelector('#chatInput').value='';
    if(level===1&&!isClinical(text)&&await packageOneRequest(text))return;
    const transport=contextualTransport(text);
    bubble('user',text);pendingChoices=[];renderThread(true);
    try{
      const d=await api('/api/chat',{client_key:demo.client.client_key,session_id:sessionId,remote_jid:remote,enquiry_id:lastEnquiryId,staff_id:demo.staff?.id,message:transport});
      lastEnquiryId=d.enquiry_id||lastEnquiryId;
      if(d.reply)messages.push({who:'assistant',text:d.reply});
      pendingChoices=Array.isArray(d.menu_choices)&&d.menu_choices.length?d.menu_choices:Array.isArray(d.choices)?d.choices:[];
      if(d.handoff||d.suppressed){handoff=true;messages.push({who:'staff',text:'A member of the clinic team now owns this conversation. The assistant is paused.'});showJourneyNext('handoff')}
      if(d.booking_status==='confirmed'||d.intent==='booking_confirmed')showJourneyNext('complete');
      renderThread();
    }catch(e){messages.push({who:'assistant',text:'The demo had trouble processing that message. Try again.'});renderThread();toast(e.message)}
  };

  refreshStaff=async function(){
    const root=document.querySelector('#staffSurface');if(!root)return;
    root.innerHTML='<div class="outcome-card"><strong>Opening your clinic workspace…</strong><p>Pulling the synthetic patient work created inside this private demo tenant.</p></div>';
    try{
      const [e,a]=await Promise.all([api('/api/enquiries',{client_key:demo.client.client_key}),level>=2?api('/api/appointments',{client_key:demo.client.client_key}).catch(()=>({appointments:[]})):Promise.resolve({appointments:[]})]);
      crmRows=e.enquiries||[];crmAppointments=a.appointments||[];renderStaff(crmRows);
    }catch(err){root.innerHTML=`<div class="outcome-card"><strong>Could not open the staff workspace.</strong><p>${esc(err.message)}</p></div>`}
  };

  function stateText(e){return ['needs_human','human_active'].includes(e.attention_status)?'Needs human':e.booking_status!=='none'?e.booking_status:e.status}
  function setCrmNav(page,title,kicker='FRONT DESK'){
    document.querySelectorAll('[data-crm]').forEach(b=>b.classList.toggle('active',b.dataset.crm===page));
    const t=document.querySelector('#crmTitle'),k=document.querySelector('#crmKicker');if(t)t.textContent=title;if(k)k.textContent=kicker;
  }
  function followupRows(){
    const real=crmRows.filter(e=>e.follow_up_due_at).map(e=>({...e,_due:new Date(e.follow_up_due_at),_demo:false}));if(real.length)return real;
    const seeded=crmRows.slice(0,Math.min(2,crmRows.length));return seeded.map((e,i)=>({...e,_due:new Date(Date.now()+(i+1)*4*60*60*1000),_demo:true,next_action:i?'Check appointment preference':'Send a friendly follow-up'}));
  }
  function crmMetrics(){const m=metrics(crmRows);return `<div class="crm-metrics"><div class="crm-metric"><small>Open enquiries</small><strong>${m.open}</strong><span>patient work in progress</span></div><div class="crm-metric"><small>Booking requests</small><strong>${m.requests}</strong><span>needs scheduling action</span></div><div class="crm-metric"><small>Needs human</small><strong>${m.human}</strong><span>assistant stepped aside</span></div><div class="crm-metric"><small>Follow-ups</small><strong>${Math.max(m.follow,followupRows().length)}</strong><span>scheduled / demo-ready</span></div></div>`}

  renderStaff=function(rows){
    const root=document.querySelector('#staffSurface'),brand=demo?.client?.branding||{},name=demo?.client?.display_name||'Your clinic',ini=brand.logo_text||initials(name),loc=brand.location||demo?.client?.metadata?.location||'Clinic location';
    if(level===1){
      root.innerHTML=`<div class="staff-demo-frame care1-frame"><div class="staff-demo-label"><span>CARE 1 · STAFF SANDBOX</span><b>${esc(name)} · Front-desk capture</b><small>Private synthetic demo tenant · not shared with the next prospect</small></div><div class="care1-workspace"><div class="care1-brandbar"><i>${esc(ini)}</i><div><strong>${esc(name)}</strong><small>${esc(loc)} · Enquiry capture</small></div></div><div class="outcome-card"><strong>Simple on purpose.</strong><p>Care 1 keeps staff in a lightweight capture view while patient questions and appointment preferences stop getting lost in chat.</p></div>${tableCard(rows,false)}</div></div>`;wireRows();return;
    }
    root.innerHTML=`<div class="staff-demo-frame"><div class="staff-demo-label"><span>LIVE STAFF SANDBOX</span><b>${esc(name)} patient operations</b><small>Private synthetic tenant · each prospect gets a separate demo environment</small></div><div class="crm-sandbox clinic-crm">
      <aside class="crm-nav"><div class="crm-brand"><i>${esc(ini)}</i><div><strong>${esc(name)}</strong><small>${esc(loc)}</small></div></div><button data-crm="overview">Overview</button><button data-crm="enquiries">Enquiries</button><button data-crm="appointments">Appointments</button><button data-crm="followups">Follow-ups</button><button data-crm="activity">Activity</button>${level===3?'<button data-crm="unified">Unified intake</button>':''}<div class="crm-bottom">${esc(name)} workspace<br>Care ${level} demo</div></aside>
      <section class="crm-main"><div class="crm-topbar"><div><small id="crmKicker">${esc(name.toUpperCase())}</small><strong id="crmTitle">Today at a glance</strong></div><span>● Live synthetic data</span></div><div id="crmContent" class="crm-content"></div></section>
    </div></div>`;
    document.querySelectorAll('[data-crm]').forEach(b=>b.addEventListener('click',()=>{crmPage=b.dataset.crm;renderCrmPage(crmPage)}));renderCrmPage(crmPage);
  };

  function renderCrmPage(page){
    const root=document.querySelector('#crmContent');if(!root)return;
    if(page==='overview'){
      setCrmNav(page,'Today at a glance');const attention=crmRows.filter(e=>['needs_human','human_active'].includes(e.attention_status)||['requested','proposed'].includes(e.booking_status)).slice(0,5),recent=crmRows.slice(0,5);
      root.innerHTML=`<div class="crm-page">${crmMetrics()}<div class="crm-two"><div class="crm-card"><div class="crm-card-head"><div><strong>Needs attention</strong><small>What reception should see first</small></div></div><div class="crm-list">${attention.length?attention.map(e=>`<div class="crm-item"><div><strong>${esc(e.contact?.full_name||'Patient')} · ${esc(e.service?.name||'General enquiry')}</strong><small>${esc(e.next_action||'Review enquiry')}</small></div><b>${esc(stateText(e))}</b></div>`).join(''):'<div class="empty-state">Nothing urgent right now.</div>'}</div></div><div class="crm-card"><div class="crm-card-head"><div><strong>Recent activity</strong><small>Latest patient work</small></div></div><div class="crm-list">${recent.map(e=>`<div class="crm-item"><div><strong>${esc(e.contact?.full_name||'Patient')}</strong><small>${esc(e.source||'channel')} · ${esc(e.service?.name||'General')}</small></div><b>${esc(stateText(e))}</b></div>`).join('')}</div></div></div></div>`;return;
    }
    if(page==='enquiries'){
      setCrmNav(page,'Patient enquiries');root.innerHTML=`<div class="crm-page"><div class="staff-grid">${tableCard(crmRows,true)}<div class="staff-card"><div class="cardbar"><div><strong>Patient context</strong><small>Click an enquiry to work with it</small></div></div><div id="detail" class="detail empty">Pick a patient row to see service, booking state, next action and staff controls.</div></div></div></div>`;wireRows();return;
    }
    if(page==='appointments'){
      setCrmNav(page,'Appointments','SCHEDULING');root.innerHTML=`<div class="crm-page"><div class="outcome-card"><strong>The patient only sees times that are actually open.</strong><p>Care 2+ checks the clinic schedule before confirming a slot.</p></div><div class="booking-list">${crmAppointments.length?crmAppointments.map(a=>`<div class="booking-row"><strong>${esc(a.contact?.full_name||'Patient')}</strong><span>${esc(a.service?.name||'Appointment')}</span><span>${esc(a.appointment_date)} · ${esc(String(a.start_time||'').slice(0,5))}</span><b>${esc(a.status)}</b></div>`).join(''):'<div class="empty-state">Complete a booking in Patient experience and it appears here.</div>'}</div></div>`;return;
    }
    if(page==='followups'){
      setCrmNav(page,'Follow-ups','NEXT ACTION');const list=followupRows();
      root.innerHTML=`<div class="crm-page"><div class="outcome-card"><strong>Follow-up stops living in someone’s memory.</strong><p>The demo always includes synthetic follow-up work so you can experience the page instead of hitting an empty state.</p></div><div class="follow-list">${list.map(e=>`<button class="follow-row follow-click" data-follow-id="${esc(e.id||'')}"><strong>${esc(e.contact?.full_name||'Patient')}</strong><span>${esc(e.service?.name||'General')}</span><span>${e._due.toLocaleString()}</span><b>${esc(e.next_action||'Follow up')}</b></button>`).join('')}</div></div>`;
      document.querySelectorAll('[data-follow-id]').forEach(b=>b.onclick=()=>{const id=b.dataset.followId;crmPage='enquiries';renderCrmPage('enquiries');if(id)setTimeout(()=>openDetail(id),80)});return;
    }
    if(page==='activity'){
      setCrmNav(page,'Clinic activity','AUDIT TRAIL');root.innerHTML=`<div class="crm-page"><div class="crm-card"><div class="crm-card-head"><div><strong>Recent patient operations</strong><small>Synthetic demo activity</small></div></div><div class="activity-timeline">${crmRows.slice(0,12).map(e=>`<div class="activity-row"><i></i><div><strong>${esc(e.contact?.full_name||'Patient')} · ${esc(stateText(e))}</strong><span>${esc(e.source||'channel')} · ${esc(e.next_action||'Patient enquiry updated')}</span></div></div>`).join('')}</div></div></div>`;return;
    }
    if(page==='unified'){
      setCrmNav(page,'One intake layer','CARE 3 · UNIFIED OPERATIONS');root.innerHTML=`<div class="crm-page"><div class="unified-hero"><small>THE CARE 3 OUTCOME</small><strong>Patients can arrive from different places. Staff does not need six different queues.</strong><p>WhatsApp and the generated clinic website are live inside this demo. Other channels are scoped only after the clinic authorises the required accounts and APIs.</p></div><div class="intake-flow"><div class="intake-sources"><div class="intake-source live"><b>WhatsApp</b><span>Live in demo</span></div><div class="intake-source live"><b>Clinic website</b><span>Live in demo</span></div><div class="intake-source"><b>Instagram</b><span>After access approval</span></div><div class="intake-source"><b>Facebook</b><span>After access approval</span></div><div class="intake-source"><b>Email</b><span>Custom scope</span></div><div class="intake-source"><b>Locations / providers</b><span>Clinic-specific routing</span></div></div><div class="intake-arrow">→</div><div class="intake-destination"><small>ONE OPERATING LAYER</small><strong>Patient queue</strong><span>Booking · follow-up · human takeover · activity history</span></div></div></div>`;return;
    }
  }

  function siteServices(){
    const actual=(demo?.services||[]).map(s=>({name:s.name,slug:s.slug,price:s.price_display||'Ask the clinic',desc:s.public_description||'Clinic service information and enquiry support.',real:true}));
    const filler=[
      {name:'Routine Check-up',slug:'',price:'Ask the clinic',desc:'General dental assessment and visit planning.'},
      {name:'Dental Cleaning',slug:'',price:'Ask the clinic',desc:'Routine cleaning and oral-hygiene support.'},
      {name:'Teeth Whitening',slug:'',price:'Ask the clinic',desc:'Cosmetic whitening enquiry and appointment support.'},
      {name:'Braces & Aligners',slug:'',price:'Consultation first',desc:'Orthodontic enquiry and consultation pathway.'},
      {name:'Root Canal Care',slug:'',price:'Assessment required',desc:'Treatment enquiry routed to the clinic team.'},
      {name:'Emergency Dental Visit',slug:'',price:'Contact the clinic',desc:'Urgent enquiries escalated to clinic staff.'}
    ];
    const names=new Set(actual.map(x=>normalText(x.name))),all=[...actual];for(const f of filler){if(!names.has(normalText(f.name))&&all.length<6)all.push({...f,real:false})}return all.slice(0,6);
  }
  function websiteDateMin(){return isoDay(0)}
  async function populateWebsiteTimes(){
    const date=document.querySelector('#webDate')?.value,sel=document.querySelector('#webTime');if(!sel)return;
    sel.disabled=true;sel.innerHTML='<option value="">Checking available times…</option>';if(!date){sel.innerHTML='<option value="">Choose a date first</option>';return}
    try{const d=await api('/api/availability',{client_key:demo.client.client_key,date});const slots=d.slots||[];sel.innerHTML=slots.length?'<option value="">Choose an available time</option>'+slots.map(t=>`<option value="${esc(String(t).slice(0,5))}">${esc(String(t).slice(0,5))}</option>`).join(''):'<option value="">No times available that day</option>';sel.disabled=!slots.length}catch{sel.innerHTML='<option value="">Could not load times</option>'}
  }

  renderWebsite=function(){
    if(!demo||level<3)return;care3Chat=null;
    const c=demo.client,brand=c.branding||{},services=siteServices(),actual=demo.services||[],svc=actual[0]||{name:'Dental Cleaning',slug:'featured-service',price_display:'Price confirmed by clinic'},ini=brand.logo_text||initials(c.display_name),loc=brand.location||c.metadata?.location||'Your clinic location';
    document.querySelector('#websiteExperience').innerHTML=`<div class="fake-site-v3"><div class="site-demo-ribbon">Generated Care 3 website preview · clinic details are personalised · other page copy is synthetic demo content</div><div class="site-v2-nav"><div class="site-v2-brand"><i>${esc(ini)}</i><strong>${esc(c.display_name)}</strong></div><div class="site-v2-links"><span>Home</span><span>Services</span><span>Why us</span><span>Appointments</span><span>Contact</span></div></div><section class="site-v2-hero"><div class="site-v2-hero-copy"><small>${esc(loc)}</small><h3>A more convenient way to start your dental visit.</h3><p>Explore services, ask the clinic a question or request a time without waiting on a phone call.</p><div class="site-hero-actions"><button id="siteChatBtn">Chat with ${esc(c.display_name)}</button><button id="siteBookBtn" class="site-secondary">Request an appointment</button></div></div><div class="site-v2-hero-art"><div class="clinic-art"><div class="clinic-art-card"><small>PATIENT SUPPORT</small><strong>Questions → booking → staff</strong><span>One connected clinic experience</span></div></div></div></section><section class="site-info-band"><div><strong>Clear service enquiries</strong><span>Patients start with useful information.</span></div><div><strong>Availability-aware requests</strong><span>Only open demo times are selectable.</span></div><div><strong>Human handoff</strong><span>Staff takes over when a person is needed.</span></div></section><section class="site-v2-services"><div class="site-section-head"><small>OUR SERVICES</small><h4>Care that starts with the right next step.</h4><p>Illustrative service content makes the preview feel like a complete clinic website. Your production site would use the clinic’s approved catalogue.</p></div><div class="site-service-grid">${services.map(x=>`<div class="site-v2-service"><small>${x.real?'PERSONALISED / CATALOGUE':'DEMO CONTENT'}</small><strong>${esc(x.name)}</strong><p>${esc(x.desc)}</p><span>${esc(x.price)}</span></div>`).join('')}</div></section><section class="site-why"><div><small>WHY THIS MATTERS</small><h4>The website is not another inbox.</h4><p>A patient can begin here, while the clinic still manages the work from the same operations layer used for WhatsApp.</p></div><div class="site-why-grid"><div><b>01</b><strong>Capture the enquiry</strong><span>Patient details and service interest stay structured.</span></div><div><b>02</b><strong>Check a real slot</strong><span>The form only displays open demo times.</span></div><div><b>03</b><strong>Move it to staff</strong><span>The website submission lands in the CRM with its source attached.</span></div></div></section><section id="appointmentFormSection" class="site-v2-contact"><div class="site-v2-contact-copy"><small>REQUEST AN APPOINTMENT</small><h4>Pick from times that are actually available.</h4><p>Submit this form, then open “What staff sees”. The website enquiry will arrive in the same clinic workspace.</p><div class="site-contact-card"><b>${esc(c.display_name)}</b><span>${esc(loc)}</span><span>Demo hours are generated from this tenant’s availability rules.</span></div></div><form id="webForm" class="site-v2-form"><input id="webName" placeholder="Demo patient name" required><input id="webEmail" type="email" placeholder="demo@example.com" required><select id="webService">${actual.map(x=>`<option value="${esc(x.slug)}">${esc(x.name)}</option>`).join('')}<option value="">General dental enquiry</option></select><div class="web-date-grid"><input id="webDate" type="date" min="${websiteDateMin()}" required><select id="webTime" disabled required><option value="">Choose a date first</option></select></div><textarea id="webMessage" placeholder="Anything the clinic should know? (demo details only)"></textarea><button>Send appointment enquiry</button><small>Only synthetic demo patient information should be entered.</small></form></section><section class="site-channel-story"><small>CARE 3 · ONE INTAKE LAYER</small><h4>Different entry points. One place for staff to work.</h4><div class="site-channel-row"><span class="live">WhatsApp</span><span class="live">Website</span><span>Instagram</span><span>Facebook</span><span>Email</span><b>→ Patient operations</b></div></section><div id="siteChat" class="site-chat-v2 hidden"><div class="site-chat-head-v2"><strong>${esc(c.display_name)} · Patient Assistant</strong><button id="closeSiteChat">×</button></div><div id="siteChatThread" class="site-chat-thread-v2"><div>Hi 👋 How can we help?</div></div><div id="siteChatChoices" class="quick-replies"><button type="button" id="askSitePrice">How much is ${esc(svc.name)}?</button><button type="button" id="bookSite">Book an appointment</button></div><form id="siteChatForm" class="web-form"><input id="siteChatInput" autocomplete="off" maxlength="700" placeholder="Message the clinic…"><button type="submit">Send</button></form></div><div id="webFlow" class="web-flow"><div class="web-flow-card"><small>THE ENQUIRY IS MOVING</small><strong>Website → structured patient work → staff CRM</strong><div class="flow-line"><div class="flow-node">Clinic website</div><span class="flow-arrow">→</span><div class="flow-node">Enquiry structured</div><span class="flow-arrow">→</span><div class="flow-node">Staff workspace</div></div><button id="flowOpenCrm">Open the staff CRM →</button></div></div></div>`;
    document.querySelector('#webDate').onchange=populateWebsiteTimes;
    document.querySelector('#siteBookBtn').onclick=()=>document.querySelector('#appointmentFormSection')?.scrollIntoView({behavior:'smooth',block:'center'});
    document.querySelector('#webForm').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button'),date=document.querySelector('#webDate').value,time=document.querySelector('#webTime').value;if(!date||!time){toast('Choose an available date and time.');return}btn.disabled=true;btn.textContent='Sending…';try{const note=document.querySelector('#webMessage').value.trim(),message=`${note||'Website appointment enquiry'} Preferred appointment: ${date} at ${time}.`;await api('/api/website',{client_key:demo.client.client_key,full_name:document.querySelector('#webName').value,email:document.querySelector('#webEmail').value,message,service_slug:document.querySelector('#webService').value});e.currentTarget.reset();document.querySelector('#webTime').disabled=true;document.querySelector('#webTime').innerHTML='<option value="">Choose a date first</option>';document.querySelector('#webFlow').classList.add('show');toast('Website enquiry captured in the clinic workspace.')}catch(err){toast(err.message)}finally{btn.disabled=false;btn.textContent='Send appointment enquiry'}};
    document.querySelector('#flowOpenCrm').onclick=()=>{document.querySelector('#webFlow').classList.remove('show');crmPage='enquiries';switchView('staff');setTimeout(()=>renderCrmPage('enquiries'),100)};
    document.querySelector('#siteChatBtn').onclick=async()=>{try{await ensureCare3Chat();document.querySelector('#siteChat').classList.remove('hidden')}catch(err){toast(err.message)}};
    document.querySelector('#closeSiteChat').onclick=()=>document.querySelector('#siteChat').classList.add('hidden');document.querySelector('#askSitePrice').onclick=()=>sendSiteMessage(`How much is ${svc.name}?`);document.querySelector('#bookSite').onclick=()=>sendSiteMessage(`Book an appointment for ${svc.name}`);document.querySelector('#siteChatForm').onsubmit=e=>{e.preventDefault();sendSiteMessage(document.querySelector('#siteChatInput').value)};
  };

  const originalShowBuilder=showBuilder;
  showBuilder=function(){originalShowBuilder();activeService=null;care1Availability={};hideJourneyNext();setTimeout(()=>document.querySelector('#careHeading')?.scrollIntoView({block:'start'}),50)};
})();
