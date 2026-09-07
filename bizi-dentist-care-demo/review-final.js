(()=>{
  const accent=()=>demo?.client?.branding?.accent||'#26705b';
  const rgbText=hex=>{const n=parseInt(String(hex||'').replace('#',''),16);return Number.isFinite(n)?`${(n>>16)&255},${(n>>8)&255},${n&255}`:'38,112,91'};
  const forceBrand=()=>{
    const a=accent(),r=rgbText(a);setBrand(a);
    const root=document.querySelector('#staffSurface');
    [root,...(root?[...root.querySelectorAll('.staff-demo-frame,.clinic-crm,.care1-workspace,.care1-brandbar,.crm-nav,.crm-main')]:[])].filter(Boolean).forEach(el=>{el.style.setProperty('--brand',a);el.style.setProperty('--brand-rgb',r)});
    document.documentElement.style.setProperty('--brand',a);document.documentElement.style.setProperty('--brand-rgb',r);
  };

  const staffRoot=document.querySelector('#staffSurface');
  if(staffRoot)new MutationObserver(()=>queueMicrotask(forceBrand)).observe(staffRoot,{childList:true,subtree:true});

  const previousRefresh=refreshStaff;
  refreshStaff=async function(){forceBrand();const out=await previousRefresh();forceBrand();return out};
  const previousRenderStaff=renderStaff;
  renderStaff=function(rows){forceBrand();const out=previousRenderStaff(rows);forceBrand();return out};
  const previousSwitch=switchView;
  switchView=function(view){forceBrand();const out=previousSwitch(view);if(view==='staff')setTimeout(forceBrand,0);return out};

  const threadStore=(id)=>`bizi_staff_thread:${demo.client.client_key}:${id}`;
  const saveLocal=(id,item)=>{let arr=[];try{arr=JSON.parse(sessionStorage.getItem(threadStore(id))||'[]')}catch{};if(!Array.isArray(arr))arr=[];arr.push(item);sessionStorage.setItem(threadStore(id),JSON.stringify(arr.slice(-40)))};
  const appendStaffThread=(who,text)=>{const th=document.querySelector('#staffChatThread');if(!th)return;const row=document.createElement('div');row.className=`staff-chat-msg ${who}`;row.innerHTML=`<b>${who==='patient'?'Patient':who==='staff'?'Clinic staff':'Assistant'}</b><span>${esc(text)}</span>`;th.appendChild(row);th.scrollTop=th.scrollHeight};

  const previousSend=sendChat;
  sendChat=async function(raw){
    const text=String(raw||'').trim().slice(0,700);
    if(!handoff)return previousSend(raw);
    if(!text||!lastEnquiryId)return;
    const input=document.querySelector('#chatInput');if(input)input.value='';
    messages.push({who:'user',text});saveLocal(lastEnquiryId,{who:'patient',text});renderThread();appendStaffThread('patient',text);toast('Patient message sent. Clinic staff remains in control.');
  };

  function renderWebsiteContact(box,id,e){
    const phone=e.contact?.phone||'—',email=e.contact?.email||'—';
    box.innerHTML=`<div class="website-contact"><div class="website-contact-head"><small>WEBSITE ENQUIRY</small><strong>Contact ${esc(e.contact?.full_name||'patient')}</strong><span>No assistant conversation exists yet, so this is a direct staff contact action.</span></div><div class="website-contact-meta"><div><small>Phone / WhatsApp</small><b>${esc(phone)}</b></div><div><small>Email</small><b>${esc(email)}</b></div></div><form id="websiteContactForm"><textarea id="websiteContactText" maxlength="500" placeholder="Write a demo follow-up message…"></textarea><button>Send demo contact</button></form><div id="websiteContactHistory" class="website-contact-history"></div><button id="websiteContactBack" class="website-contact-back">Back to patient details</button></div>`;
    const hist=box.querySelector('#websiteContactHistory');let saved=[];try{saved=JSON.parse(sessionStorage.getItem(threadStore(id))||'[]')}catch{};for(const m of Array.isArray(saved)?saved:[]){if(m.who!=='staff')continue;const r=document.createElement('div');r.innerHTML=`<b>Clinic staff</b><span>${esc(m.text||'')}</span>`;hist.appendChild(r)}
    box.querySelector('#websiteContactForm').onsubmit=ev=>{ev.preventDefault();const input=box.querySelector('#websiteContactText'),text=input.value.trim();if(!text)return;saveLocal(id,{who:'staff',text});const r=document.createElement('div');r.innerHTML=`<b>Clinic staff</b><span>${esc(text)}</span>`;hist.appendChild(r);input.value='';toast('Demo contact saved for this website enquiry.')};
    box.querySelector('#websiteContactBack').onclick=()=>openDetail(id);
  }

  const previousOpenDetail=openDetail;
  openDetail=async function(id){
    await previousOpenDetail(id);forceBrand();
    const row=(crmRows||[]).find(x=>x.id===id);if(!row||row.source!=='website')return;
    const box=document.querySelector('#detail'),btn=box?.querySelector('#takeoverAction');if(!box||!btn)return;
    btn.textContent='Contact patient';btn.onclick=()=>renderWebsiteContact(box,id,row);
  };

  forceBrand();
})();