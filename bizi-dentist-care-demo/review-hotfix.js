(()=>{
  const normalizeWho=who=>who==='user'?'patient':who==='patient'?'patient':who==='staff'?'staff':'assistant';
  const normalizePhone=v=>{let p=String(v||'').trim().replace(/[\s()\-.]/g,'');if(/^0\d{10}$/.test(p))return '+234'+p.slice(1);if(/^234\d{10}$/.test(p))return '+'+p;if(/^\+234\d{10}$/.test(p))return p;if(/^\+?[1-9]\d{7,14}$/.test(p))return p.startsWith('+')?p:'+'+p;return null};
  const accent=()=>demo?.client?.branding?.accent||'#26705b';
  const rgbText=hex=>{const n=parseInt(String(hex||'').replace('#',''),16);return Number.isFinite(n)?`${(n>>16)&255},${(n>>8)&255},${n&255}`:'38,112,91'};
  const takeoverBusy=new Set();

  function forceBrand(){
    const a=accent(),r=rgbText(a);setBrand(a);
    document.documentElement.style.setProperty('--brand',a);document.documentElement.style.setProperty('--brand-rgb',r);
    const root=document.querySelector('#staffSurface');
    if(root){root.style.setProperty('--brand',a);root.style.setProperty('--brand-rgb',r);root.querySelectorAll('.staff-demo-frame,.clinic-crm,.care1-workspace,.care1-brandbar,.crm-nav,.crm-main,.staff-chat').forEach(el=>{el.style.setProperty('--brand',a);el.style.setProperty('--brand-rgb',r)})}
  }
  const staffRoot=document.querySelector('#staffSurface');if(staffRoot)new MutationObserver(()=>queueMicrotask(forceBrand)).observe(staffRoot,{childList:true,subtree:true});

  const baseApply=applyDemo;applyDemo=function(){baseApply();forceBrand()};
  const baseRefresh=refreshStaff;refreshStaff=async function(){forceBrand();const out=await baseRefresh();forceBrand();return out};
  const baseRenderStaff=renderStaff;renderStaff=function(rows){forceBrand();const out=baseRenderStaff(rows);forceBrand();return out};
  const baseSwitch=switchView;switchView=function(view){forceBrand();const out=baseSwitch(view);if(view==='staff')setTimeout(forceBrand,0);return out};

  const threadKey=id=>`bizi_staff_thread:${demo.client.client_key}:${id}`;
  const loadStored=id=>{try{const a=JSON.parse(sessionStorage.getItem(threadKey(id))||'[]');return Array.isArray(a)?a:[]}catch{return []}};
  const saveStored=(id,item)=>{const a=loadStored(id);a.push(item);sessionStorage.setItem(threadKey(id),JSON.stringify(a.slice(-40)))};
  function liveItems(id,e){
    if(id===lastEnquiryId)return messages.slice(-60).map(m=>({who:normalizeWho(m.who),text:String(m.text||'')}));
    return [{who:'patient',text:e.conversation_summary||`I’m interested in ${e.service?.name||'a dental service'}.`},{who:'assistant',text:e.automation_paused?'A member of the clinic team now owns this conversation.':'Thanks. The clinic has your enquiry.'},...loadStored(id).map(m=>({who:normalizeWho(m.who),text:String(m.text||'')}))];
  }
  function appendStaffThread(who,text){const th=document.querySelector('#staffChatThread');if(!th)return;const role=normalizeWho(who),row=document.createElement('div');row.className=`staff-chat-msg ${role}`;row.innerHTML=`<b>${role==='patient'?'Patient':role==='staff'?'Clinic staff':'Assistant'}</b><span>${esc(text)}</span>`;th.appendChild(row);th.scrollTop=th.scrollHeight}

  function renderStaffChat(box,id,e,pending=false,errorText=''){
    forceBrand();const items=liveItems(id,e),status=pending?'Pausing assistant…':e.automation_paused?'Human takeover active':'Assistant active';
    box.innerHTML=`<div class="staff-chat"><div class="staff-chat-head"><div><small>LIVE CONVERSATION · DEMO</small><strong>${esc(e.contact?.full_name||'Patient')}</strong></div><span>${esc(status)}</span></div>${errorText?`<div class="takeover-error">${esc(errorText)}</div>`:''}<div id="staffChatThread" class="staff-chat-thread">${items.map(m=>`<div class="staff-chat-msg ${esc(normalizeWho(m.who))}"><b>${normalizeWho(m.who)==='patient'?'Patient':normalizeWho(m.who)==='staff'?'Clinic staff':'Assistant'}</b><span>${esc(m.text)}</span></div>`).join('')}</div><form id="staffChatForm" class="staff-chat-compose"><input id="staffChatInput" maxlength="500" placeholder="Reply as ${esc(demo.client.display_name)}…" ${pending||!e.automation_paused?'disabled':''}><button ${pending||!e.automation_paused?'disabled':''}>Send demo reply</button></form><div class="staff-chat-actions">${pending?'<button type="button" disabled>Saving takeover…</button>':e.automation_paused?'<button id="returnAssistant" type="button">Return to assistant</button>':'<button id="retryTakeover" type="button">Try takeover again</button>'}<button id="backPatientDetails" type="button">Back to patient details</button></div></div>`;
    forceBrand();const th=box.querySelector('#staffChatThread');if(th)th.scrollTop=th.scrollHeight;
    box.querySelector('#staffChatForm').onsubmit=ev=>{ev.preventDefault();const input=box.querySelector('#staffChatInput'),text=input?.value.trim();if(!text||pending||!e.automation_paused)return;saveStored(id,{who:'staff',text});if(id===lastEnquiryId){messages.push({who:'staff',text});renderThread()}input.value='';appendStaffThread('staff',text)};
    box.querySelector('#backPatientDetails')?.addEventListener('click',()=>openDetail(id));
    box.querySelector('#retryTakeover')?.addEventListener('click',()=>activateTakeover(box,id,e));
    box.querySelector('#returnAssistant')?.addEventListener('click',async()=>{const btn=box.querySelector('#returnAssistant');btn.disabled=true;btn.textContent='Returning…';try{await api('/api/action',{client_key:demo.client.client_key,enquiry_id:id,action_type:'return_to_assistant',staff_id:demo.staff?.id});e.automation_paused=false;e.attention_status='automated';if(id===lastEnquiryId){handoff=false;messages.push({who:'assistant',text:'The assistant is active again and can continue the conversation.'});renderThread()}toast('Assistant returned to the conversation.');openDetail(id)}catch(err){btn.disabled=false;btn.textContent='Return to assistant';toast(err.message)}});
  }

  async function activateTakeover(box,id,e){
    if(takeoverBusy.has(id))return;takeoverBusy.add(id);const wasPaused=Boolean(e.automation_paused);e.automation_paused=true;e.attention_status='human_active';
    if(id===lastEnquiryId&&!handoff){handoff=true;messages.push({who:'staff',text:'Clinic staff has taken over this conversation.'});renderThread()}
    renderStaffChat(box,id,e,!wasPaused);
    if(wasPaused){takeoverBusy.delete(id);return}
    try{await api('/api/action',{client_key:demo.client.client_key,enquiry_id:id,action_type:'take_over',staff_id:demo.staff?.id});toast('Human takeover active.');renderStaffChat(box,id,e,false)}catch(err){e.automation_paused=false;e.attention_status='automated';if(id===lastEnquiryId){handoff=false;renderThread()}renderStaffChat(box,id,e,false,`Takeover could not be saved: ${err.message}`);toast(err.message)}finally{takeoverBusy.delete(id)}
  }

  function renderWebsiteContact(box,id,e){
    const phone=e.contact?.phone||'—',email=e.contact?.email||'—';box.innerHTML=`<div class="website-contact"><div class="website-contact-head"><small>WEBSITE ENQUIRY</small><strong>Contact ${esc(e.contact?.full_name||'patient')}</strong><span>This lead came from the website, so staff contacts the patient directly instead of taking over an assistant conversation.</span></div><div class="website-contact-meta"><div><small>Phone / WhatsApp</small><b>${esc(phone)}</b></div><div><small>Email</small><b>${esc(email)}</b></div></div><form id="websiteContactForm"><textarea id="websiteContactText" maxlength="500" placeholder="Write a demo follow-up message…"></textarea><button>Send demo contact</button></form><div id="websiteContactHistory" class="website-contact-history"></div><button id="websiteContactBack" class="website-contact-back">Back to patient details</button></div>`;
    const hist=box.querySelector('#websiteContactHistory');for(const m of loadStored(id)){if(normalizeWho(m.who)!=='staff')continue;const r=document.createElement('div');r.innerHTML=`<b>Clinic staff</b><span>${esc(m.text||'')}</span>`;hist.appendChild(r)}
    box.querySelector('#websiteContactForm').onsubmit=ev=>{ev.preventDefault();const input=box.querySelector('#websiteContactText'),text=input.value.trim();if(!text)return;saveStored(id,{who:'staff',text});const r=document.createElement('div');r.innerHTML=`<b>Clinic staff</b><span>${esc(text)}</span>`;hist.appendChild(r);input.value='';toast('Demo contact saved for this website enquiry.')};box.querySelector('#websiteContactBack').onclick=()=>openDetail(id);forceBrand();
  }

  openDetail=async function(id){
    forceBrand();const box=document.querySelector('#detail');if(!box)return;box.className='detail';box.innerHTML='Loading patient context…';
    try{
      const d=await api('/api/detail',{client_key:demo.client.client_key,enquiry_id:id}),e=d.enquiry,summary=String(e.conversation_summary||''),phoneFromSummary=(summary.match(/Phone:\s*([^.;]+)/i)||[])[1],phone=e.contact?.phone||phoneFromSummary||'—',isWebsite=e.source==='website';
      box.innerHTML=`<h3>${esc(e.contact?.full_name||'Patient')}</h3><p>${esc(summary||'No summary yet.')}</p><div class="kv"><span>Service</span><b>${esc(e.service?.name||'General')}</b><span>Phone</span><b>${esc(phone)}</b><span>Email</span><b>${esc(e.contact?.email||'—')}</b><span>Source</span><b>${esc(e.source||'—')}</b><span>Booking</span><b>${esc(e.booking_status)}</b><span>Attention</span><b>${esc(e.attention_status)}</b><span>Next action</span><b>${esc(e.next_action||'—')}</b></div><div id="detailNotice"></div><div class="detail-actions"><button class="primary" id="takeoverAction">${isWebsite?'Contact patient':e.automation_paused?'Open live chat':'Take over conversation'}</button><button id="followAction">Schedule follow-up</button><button id="closeAction">Close enquiry</button></div><div id="followPanel" class="follow-panel hidden"><label>Follow up at<input id="followWhen" type="datetime-local"></label><label>Note<input id="followNote" value="Follow up with patient"></label><button id="saveFollow">Save follow-up</button></div>`;
      box.querySelector('#takeoverAction').onclick=()=>isWebsite?renderWebsiteContact(box,id,e):activateTakeover(box,id,e);
      box.querySelector('#followAction').onclick=()=>{const panel=box.querySelector('#followPanel');panel.classList.toggle('hidden');const when=box.querySelector('#followWhen');if(!when.value){const dt=new Date(Date.now()+24*60*60*1000);dt.setMinutes(dt.getMinutes()-dt.getTimezoneOffset());when.value=dt.toISOString().slice(0,16)}};
      box.querySelector('#saveFollow').onclick=async()=>{const when=box.querySelector('#followWhen').value,note=box.querySelector('#followNote').value.trim()||'Follow up with patient';if(!when){toast('Choose when the follow-up should happen.');return}const due=new Date(when).toISOString();await api('/api/action',{client_key:demo.client.client_key,enquiry_id:id,action_type:'set_follow_up',staff_id:demo.staff?.id,follow_up_due_at:due,note});const row=(crmRows||[]).find(x=>x.id===id);if(row){row.follow_up_due_at=due;row.next_action=note}box.querySelector('#detailNotice').innerHTML=`<div class="action-success"><strong>Follow-up scheduled</strong><span>${new Date(due).toLocaleString()} · ${esc(note)}</span></div>`;box.querySelector('#followPanel').classList.add('hidden');toast('Follow-up scheduled.')};
      box.querySelector('#closeAction').onclick=async()=>{await api('/api/action',{client_key:demo.client.client_key,enquiry_id:id,action_type:'close',staff_id:demo.staff?.id});const row=(crmRows||[]).find(x=>x.id===id);if(row){row.status='closed';row.attention_status='resolved';row.next_action='Closed by staff'}box.querySelector('#detailNotice').innerHTML='<div class="action-success"><strong>Enquiry closed</strong><span>Saved without a full-page refresh.</span></div>';box.querySelectorAll('.detail-actions button').forEach(b=>b.disabled=true);toast('Enquiry closed.')};forceBrand();
    }catch(err){box.innerHTML=`Could not load this enquiry: ${esc(err.message)}`}
  };

  const baseSend=sendChat;
  sendChat=async function(raw){const text=String(raw||'').trim().slice(0,700);if(!handoff)return baseSend(raw);if(!text||!lastEnquiryId)return;const input=document.querySelector('#chatInput');if(input)input.value='';messages.push({who:'user',text});saveStored(lastEnquiryId,{who:'patient',text});renderThread();appendStaffThread('patient',text);toast('Patient message sent. Clinic staff remains in control.')};

  const baseWebsite=renderWebsite;
  renderWebsite=function(){
    baseWebsite();forceBrand();const form=document.querySelector('#webForm');if(!form)return;
    const email=form.querySelector('#webEmail');if(email&&!form.querySelector('#webPhone')){const phone=document.createElement('input');phone.id='webPhone';phone.type='tel';phone.inputMode='tel';phone.placeholder='Phone / WhatsApp number';phone.required=true;phone.maxLength=24;email.insertAdjacentElement('afterend',phone)}
    form.onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,btn=f.querySelector('button'),date=f.querySelector('#webDate')?.value||'',time=f.querySelector('#webTime')?.value||'',phone=normalizePhone(f.querySelector('#webPhone')?.value||'');if(!phone){toast('Enter a valid phone or WhatsApp number.');return}if(!date||!time){toast('Choose an available date and time.');return}btn.disabled=true;btn.textContent='Sending…';try{const note=f.querySelector('#webMessage')?.value.trim()||'',message=`Phone: ${phone}. ${note||'Website appointment enquiry'} Preferred appointment: ${date} at ${time}.`;await api('/api/website',{client_key:demo.client.client_key,full_name:f.querySelector('#webName').value,email:f.querySelector('#webEmail').value,phone,staff_id:demo.staff?.id,message,service_slug:f.querySelector('#webService').value});f.reset();const timeSel=f.querySelector('#webTime');if(timeSel){timeSel.disabled=true;timeSel.innerHTML='<option value="">Choose a date first</option>'}document.querySelector('#webFlow')?.classList.add('show');toast('Website enquiry captured in the clinic workspace.')}catch(err){toast(err.message)}finally{btn.disabled=false;btn.textContent='Send appointment enquiry'}};
  };
  forceBrand();
})();