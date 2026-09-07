(()=>{
  const careCopy={
    1:'Care 1 · Patients get approved answers while useful enquiries and appointment preferences are captured for staff.',
    2:'Care 2 · A patient conversation becomes organised front-desk work with booking, follow-up and human takeover.',
    3:'Care 3 · Website, chat and approved channels can feed one custom clinic operations layer.'
  };
  let guideIndex=0,crmPage='overview',crmRows=[],crmAppointments=[];

  function chooseCare(n,scroll=true){
    const num=Number(n);
    document.querySelectorAll('input[name="level"]').forEach(r=>r.checked=Number(r.value)===num);
    document.querySelectorAll('[data-care-card]').forEach(c=>c.classList.toggle('selected',Number(c.dataset.careCard)===num));
    const badge=document.querySelector('#selectedCareBadge'),out=document.querySelector('#selectedOutcome strong');
    if(badge)badge.textContent=`Care ${num} selected`;if(out)out.textContent=careCopy[num];
    if(scroll)document.querySelector('#customise')?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  document.querySelectorAll('[data-pick-level]').forEach(b=>b.addEventListener('click',()=>chooseCare(b.dataset.pickLevel,true)));
  chooseCare(2,false);

  function guideSteps(){
    const base=[
      {view:'patient',kicker:'STEP 1 · PATIENT EXPERIENCE',title:'Start as a patient.',copy:level===1?'Ask about a service, price or appointment request. Watch the repetitive front-desk work disappear.':'Ask about a service, price or appointment. Complete the flow or deliberately trigger human handoff.'},
      {view:'staff',kicker:'STEP 2 · STAFF EXPERIENCE',title:level===1?'Now look at what staff receives.':'Now step behind the front desk.',copy:level===1?'There is no heavy CRM in Care 1. The outcome is a simple structured table instead of lost chat details.':'The same patient conversation is already organised into a branded clinic workspace. Open Enquiries, Appointments and Follow-ups.'}
    ];
    if(level===3)base.push({view:'website',kicker:'STEP 3 · WEBSITE EXPERIENCE',title:'Now enter through your clinic website.',copy:'Use the website form or its live assistant. Then open the CRM and see the website enquiry in the same patient operations layer.'});
    else if(level===2)base.push({view:'staff',crm:'followups',kicker:'STEP 3 · FOLLOW-UP',title:'See how the work stays moving.',copy:'Open Follow-ups or an enquiry record. The clinic can schedule the next action without keeping it in someone’s memory.'});
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
  switchView=function(view){originalSwitch(view);const steps=guideSteps(),idx=steps.findIndex(s=>s.view===view);if(idx>=0&&idx>guideIndex)guideIndex=idx;updateGuide(view)};
  const originalApply=applyDemo;
  applyDemo=function(){originalApply();startGuide();renderWebsite()};
  document.querySelector('#guideDismiss')?.addEventListener('click',()=>document.querySelector('#demoGuide')?.classList.add('dismissed'));
  document.querySelector('#guideNext')?.addEventListener('click',()=>{
    const steps=guideSteps();if(guideIndex>=steps.length-1){document.querySelector('#demoGuide')?.classList.add('dismissed');return}
    guideIndex++;const s=steps[guideIndex];switchView(s.view);if(s.crm){crmPage=s.crm;setTimeout(()=>renderCrmPage(crmPage),80)}updateGuide(s.view);
  });

  refreshStaff=async function(){
    const root=document.querySelector('#staffSurface');if(!root)return;
    root.innerHTML='<div class="outcome-card"><strong>Opening your clinic workspace…</strong><p>Pulling the synthetic patient work created inside this demo.</p></div>';
    try{
      const [e,a]=await Promise.all([api('/api/enquiries',{client_key:demo.client.client_key}),level>=2?api('/api/appointments',{client_key:demo.client.client_key}).catch(()=>({appointments:[]})):Promise.resolve({appointments:[]})]);
      crmRows=e.enquiries||[];crmAppointments=a.appointments||[];renderStaff(crmRows);
    }catch(err){root.innerHTML=`<div class="outcome-card"><strong>Could not open the staff workspace.</strong><p>${esc(err.message)}</p></div>`}
  };

  renderStaff=function(rows){
    const root=document.querySelector('#staffSurface'),brand=demo?.client?.branding||{},name=demo?.client?.display_name||'Your clinic',ini=brand.logo_text||initials(name);
    if(level===1){
      root.innerHTML=`<div class="staff-surface simple-sheet"><div class="outcome-card"><strong>This is intentionally simple.</strong><p>Care 1 does not force your receptionist into a new CRM. It captures the useful details so the team can keep working mainly in WhatsApp without losing enquiries.</p></div><div class="simple-sheet-note"><b style="color:var(--brand)">${esc(name)}</b> · simple enquiry table · branded with your clinic colour</div>${tableCard(rows,false)}</div>`;wireRows();return;
    }
    root.innerHTML=`<div class="crm-sandbox">
      <aside class="crm-nav">
        <div class="crm-brand"><i>${esc(ini)}</i><div><strong>${esc(name)}</strong><small>Patient operations</small></div></div>
        <button data-crm="overview">Overview</button><button data-crm="enquiries">Enquiries</button><button data-crm="appointments">Appointments</button><button data-crm="followups">Follow-ups</button><button data-crm="activity">Activity</button>${level===3?'<button data-crm="channels">Channels & locations</button>':''}
        <div class="crm-bottom">Synthetic clinic workspace<br>Care ${level} demo</div>
      </aside>
      <section class="crm-main"><div class="crm-topbar"><div><small id="crmKicker">FRONT DESK</small><strong id="crmTitle">Overview</strong></div><span>● Live demo data</span></div><div id="crmContent" class="crm-content"></div></section>
    </div>`;
    document.querySelectorAll('[data-crm]').forEach(b=>b.addEventListener('click',()=>{crmPage=b.dataset.crm;renderCrmPage(crmPage)}));renderCrmPage(crmPage);
  };

  function setCrmNav(page,title,kicker='FRONT DESK'){
    document.querySelectorAll('[data-crm]').forEach(b=>b.classList.toggle('active',b.dataset.crm===page));
    const t=document.querySelector('#crmTitle'),k=document.querySelector('#crmKicker');if(t)t.textContent=title;if(k)k.textContent=kicker;
  }
  function statCards(){const m=metrics(crmRows);return `<div class="crm-metrics"><div class="crm-metric"><small>Open enquiries</small><strong>${m.open}</strong><span>patient work in progress</span></div><div class="crm-metric"><small>Booking requests</small><strong>${m.requests}</strong><span>needs scheduling action</span></div><div class="crm-metric"><small>Needs human</small><strong>${m.human}</strong><span>assistant stepped aside</span></div><div class="crm-metric"><small>Follow-ups</small><strong>${m.follow}</strong><span>scheduled / due</span></div></div>`}
  function rowState(e){return ['needs_human','human_active'].includes(e.attention_status)?'Needs human':e.booking_status!=='none'?e.booking_status:e.status}
  function renderCrmPage(page){
    const root=document.querySelector('#crmContent');if(!root)return;
    if(page==='overview'){
      setCrmNav(page,'Today at a glance');const attention=crmRows.filter(e=>['needs_human','human_active'].includes(e.attention_status)||['requested','proposed'].includes(e.booking_status)).slice(0,5),recent=crmRows.slice(0,5);
      root.innerHTML=`<div class="crm-page">${statCards()}<div class="crm-two"><div class="crm-card"><div class="crm-card-head"><div><strong>Needs attention</strong><small>The work a receptionist should see first</small></div></div><div class="crm-list">${attention.length?attention.map(e=>`<div class="crm-item"><div><strong>${esc(e.contact?.full_name||'Patient')} · ${esc(e.service?.name||'General enquiry')}</strong><small>${esc(e.next_action||'Review enquiry')}</small></div><b>${esc(rowState(e))}</b></div>`).join(''):'<div class="empty-state">Nothing urgent right now.</div>'}</div></div><div class="crm-card"><div class="crm-card-head"><div><strong>Recent activity</strong><small>Latest patient work</small></div></div><div class="crm-list">${recent.map(e=>`<div class="crm-item"><div><strong>${esc(e.contact?.full_name||'Patient')}</strong><small>${esc(e.source||'channel')} · ${esc(e.service?.name||'General')}</small></div><b>${esc(rowState(e))}</b></div>`).join('')}</div></div></div></div>`;return;
    }
    if(page==='enquiries'){
      setCrmNav(page,'Patient enquiries');root.innerHTML=`<div class="crm-page"><div class="staff-grid">${tableCard(crmRows,true)}<div class="staff-card"><div class="cardbar"><div><strong>Patient context</strong><small>Click an enquiry to work with it</small></div></div><div id="detail" class="detail empty">Pick a patient row to see their service, booking state, next action and staff controls.</div></div></div></div>`;wireRows();return;
    }
    if(page==='appointments'){
      setCrmNav(page,'Appointments','SCHEDULING');root.innerHTML=`<div class="crm-page"><div class="outcome-card"><strong>Only available slots should reach the patient.</strong><p>Care 2+ checks clinic hours and existing synthetic bookings before confirming a demo appointment.</p></div><div class="booking-list" style="margin-top:10px">${crmAppointments.length?crmAppointments.map(a=>`<div class="booking-row"><strong>${esc(a.contact?.full_name||'Patient')}</strong><span>${esc(a.service?.name||'Appointment')}</span><span>${esc(a.appointment_date)} · ${esc(String(a.start_time||'').slice(0,5))}</span><b>${esc(a.status)}</b></div>`).join(''):'<div class="empty-state">Complete a booking in Patient experience and it will appear here.</div>'}</div></div>`;return;
    }
    if(page==='followups'){
      setCrmNav(page,'Follow-ups','NEXT ACTION');const list=crmRows.filter(e=>e.follow_up_due_at);
      root.innerHTML=`<div class="crm-page"><div class="outcome-card"><strong>Follow-up stops living in someone’s head.</strong><p>Open any enquiry, schedule a follow-up, then return here. Human takeover still blocks automation until staff returns control.</p></div><div class="follow-list" style="margin-top:10px">${list.length?list.map(e=>`<div class="follow-row"><strong>${esc(e.contact?.full_name||'Patient')}</strong><span>${esc(e.service?.name||'General')}</span><span>${new Date(e.follow_up_due_at).toLocaleString()}</span><b>${esc(e.next_action||'Follow up')}</b></div>`).join(''):'<div class="empty-state">No follow-up is scheduled yet. Go to Enquiries, open a patient and click “Set follow-up”.</div>'}</div></div>`;return;
    }
    if(page==='activity'){
      setCrmNav(page,'Clinic activity','AUDIT TRAIL');root.innerHTML=`<div class="crm-page"><div class="crm-card"><div class="crm-card-head"><div><strong>Recent patient operations</strong><small>Synthetic demo activity</small></div></div><div class="activity-timeline">${crmRows.slice(0,12).map(e=>`<div class="activity-row"><i></i><div><strong>${esc(e.contact?.full_name||'Patient')} · ${esc(rowState(e))}</strong><span>${esc(e.source||'channel')} · ${esc(e.next_action||'Patient enquiry updated')}</span></div></div>`).join('')}</div></div></div>`;return;
    }
    if(page==='channels'){
      setCrmNav(page,'Channels & locations','CUSTOM OPERATIONS');root.innerHTML=`<div class="crm-page"><div class="outcome-card"><strong>Custom means one operating layer, not six new dashboards.</strong><p>These are examples of entry points that can be scoped when the clinic owns and authorises the required accounts and APIs.</p></div><div class="channel-board" style="margin-top:10px"><div class="channel-tile active"><strong>WhatsApp</strong><span>Demonstrated patient flow</span></div><div class="channel-tile active"><strong>Clinic website</strong><span>Form + live assistant demonstrated</span></div><div class="channel-tile"><strong>Instagram</strong><span>Custom integration after access approval</span></div><div class="channel-tile"><strong>Facebook</strong><span>Custom integration after access approval</span></div><div class="channel-tile"><strong>Email</strong><span>Can feed the same queue</span></div><div class="channel-tile"><strong>Locations / providers</strong><span>Configured around clinic operations</span></div></div></div>`;return;
    }
  }

  renderWebsite=function(){
    if(!demo||level<3)return;care3Chat=null;
    const c=demo.client,brand=c.branding||{},services=demo.services||[],svc=services[0]||{name:'Dental Cleaning',slug:'featured-service',price_display:'Price confirmed by clinic'},ini=brand.logo_text||initials(c.display_name);
    const cards=[svc,...services.filter(x=>x.slug!==svc.slug).slice(0,2)];
    document.querySelector('#websiteExperience').innerHTML=`<div class="fake-site-v2">
      <div class="site-v2-nav"><div class="site-v2-brand"><i>${esc(ini)}</i><strong>${esc(c.display_name)}</strong></div><div class="site-v2-links"><span>Home</span><span>Services</span><span>About</span><span>Contact</span></div></div>
      <section class="site-v2-hero"><div class="site-v2-hero-copy"><small>${esc(brand.location||'YOUR CLINIC')}</small><h3>Dental care that starts with a simpler conversation.</h3><p>Ask a question, check a service or send an appointment enquiry before you ever call the front desk.</p><button id="siteChatBtn">Chat with ${esc(c.display_name)}</button></div><div class="site-v2-hero-art"><div class="clinic-art"></div></div></section>
      <section class="site-v2-services"><div class="site-section-head"><small>OUR SERVICES</small><h4>Start with what you need.</h4><p>This synthetic website is generated in your clinic branding for the Care 3 experience.</p></div><div class="site-service-grid">${cards.map(x=>`<div class="site-v2-service"><small>DENTAL SERVICE</small><strong>${esc(x.name)}</strong><span>${esc(x.price_display||'Price confirmed by clinic')}</span></div>`).join('')}</div></section>
      <section class="site-v2-contact"><div class="site-v2-contact-copy"><small>CONTACT THE CLINIC</small><h4>Send an enquiry without creating another admin task.</h4><p>This form is part of the clinic website. Submit it, then open “What staff sees”. The enquiry will appear inside the same branded operations workspace.</p><p><strong>Other approved entry points</strong><br>WhatsApp · Website · Instagram · Facebook · Email · Other APIs, subject to clinic ownership and platform access.</p></div><form id="webForm" class="site-v2-form"><input id="webName" placeholder="Demo patient name" required><input id="webEmail" type="email" placeholder="demo@example.com" required><select id="webService">${cards.map(x=>`<option value="${esc(x.slug)}">${esc(x.name)}</option>`).join('')}<option value="">General enquiry</option></select><textarea id="webMessage" placeholder="I'd like to know more about an appointment…" required></textarea><button>Send enquiry to the clinic</button></form></section>
      <div id="siteChat" class="site-chat-v2 hidden"><div class="site-chat-head-v2"><strong>${esc(c.display_name)} · Patient Assistant</strong><button id="closeSiteChat">×</button></div><div id="siteChatThread" class="site-chat-thread-v2"><div>Hi 👋 How can we help?</div></div><div id="siteChatChoices" class="quick-replies"><button type="button" id="askSitePrice">How much is ${esc(svc.name)}?</button><button type="button" id="bookSite">Book an appointment</button></div><form id="siteChatForm" class="web-form"><input id="siteChatInput" autocomplete="off" maxlength="700" placeholder="Message the clinic…"><button type="submit">Send</button></form></div>
      <div id="webFlow" class="web-flow"><div class="web-flow-card"><small>THE ENQUIRY IS MOVING</small><strong>Website → patient operations → staff CRM</strong><div class="flow-line"><div class="flow-node">Clinic website</div><span class="flow-arrow">→</span><div class="flow-node">Enquiry structured</div><span class="flow-arrow">→</span><div class="flow-node">Staff workspace</div></div><button id="flowOpenCrm">Open the staff CRM →</button></div></div>
    </div>`;
    document.querySelector('#webForm').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button');btn.disabled=true;btn.textContent='Sending…';try{await api('/api/website',{client_key:demo.client.client_key,full_name:document.querySelector('#webName').value,email:document.querySelector('#webEmail').value,message:document.querySelector('#webMessage').value,service_slug:document.querySelector('#webService').value});e.currentTarget.reset();document.querySelector('#webFlow').classList.add('show');toast('Website enquiry captured in the clinic workspace.')}catch(err){toast(err.message)}finally{btn.disabled=false;btn.textContent='Send enquiry to the clinic'}};
    document.querySelector('#flowOpenCrm').onclick=()=>{document.querySelector('#webFlow').classList.remove('show');crmPage='enquiries';switchView('staff');setTimeout(()=>renderCrmPage('enquiries'),100)};
    document.querySelector('#siteChatBtn').onclick=async()=>{try{await ensureCare3Chat();document.querySelector('#siteChat').classList.remove('hidden')}catch(err){toast(err.message)}};
    document.querySelector('#closeSiteChat').onclick=()=>document.querySelector('#siteChat').classList.add('hidden');
    document.querySelector('#askSitePrice').onclick=()=>sendSiteMessage(`How much is ${svc.name}?`);document.querySelector('#bookSite').onclick=()=>sendSiteMessage('Book an appointment');document.querySelector('#siteChatForm').onsubmit=e=>{e.preventDefault();sendSiteMessage(document.querySelector('#siteChatInput').value)};
  };

  const originalShowBuilder=showBuilder;
  showBuilder=function(){originalShowBuilder();setTimeout(()=>document.querySelector('#careHeading')?.scrollIntoView({block:'start'}),50)};
})();
