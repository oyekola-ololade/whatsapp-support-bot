let care3Chat=null;

async function ensureCare3Chat(){
  if(care3Chat)return care3Chat;
  const d=await api('/api/new-session',{client_key:demo.client.client_key});
  care3Chat={session_id:d.demo_session_id,remote_jid:d.demo_remote,enquiry_id:d.demo_enquiry_id,handoff:false};
  return care3Chat;
}
function siteMsg(who,text){
  const th=$('#siteChatThread');if(!th)return;
  const row=document.createElement('div');row.className=who==='user'?'site-user':'';row.textContent=text;th.appendChild(row);th.scrollTop=th.scrollHeight;
}
function renderSiteChoices(list){
  const root=$('#siteChatChoices');if(!root)return;root.innerHTML='';
  for(const c of Array.isArray(list)?list:[]){const b=document.createElement('button');b.type='button';b.textContent=c.label||c.date||c.time||'Continue';b.onclick=()=>sendSiteMessage(choiceText(c));root.appendChild(b)}
}
async function sendSiteMessage(raw){
  const text=String(raw||'').trim().slice(0,700);if(!text)return;
  const input=$('#siteChatInput');if(input)input.value='';
  try{
    const s=await ensureCare3Chat();if(s.handoff)return;
    siteMsg('user',text);renderSiteChoices([]);
    const d=await api('/api/chat',{client_key:demo.client.client_key,session_id:s.session_id,remote_jid:s.remote_jid,enquiry_id:s.enquiry_id,staff_id:demo.staff?.id,message:text});
    s.enquiry_id=d.enquiry_id||s.enquiry_id;if(d.reply)siteMsg('assistant',d.reply);
    renderSiteChoices(Array.isArray(d.menu_choices)&&d.menu_choices.length?d.menu_choices:d.choices);
    if(d.handoff||d.suppressed){s.handoff=true;siteMsg('assistant','A member of the clinic team now owns this conversation. The assistant is paused.')}
  }catch(e){siteMsg('assistant','The demo could not process that message. Try again.');toast(e.message)}
}

renderWebsite=function(){
  if(!demo||level<3)return;care3Chat=null;
  const c=demo.client,brand=c.branding||{},svc=demo.services?.[0]||{name:'Dental Cleaning'},ini=brand.logo_text||initials(c.display_name);
  $('#websiteExperience').innerHTML=`<div class="fake-site"><div class="site-nav"><div class="site-brand"><i>${esc(ini)}</i><strong>${esc(c.display_name)}</strong></div><span>Home · Services · Contact</span></div><div class="site-hero"><small>${esc(brand.location||'YOUR CLINIC')}</small><h3>A calmer way to start your dental visit.</h3><p>Ask a question, explore services or send an enquiry. This site is generated in your clinic branding for the custom demo.</p><button id="siteChatBtn">Chat with the clinic</button></div><div class="site-body"><div class="site-service"><small>FEATURED SERVICE</small><strong>${esc(svc.name)}</strong><span>Service details available</span></div><div class="site-service"><small>PATIENT SUPPORT</small><strong>Questions handled before the front desk steps in</strong><span>Human handoff when needed</span></div></div><div id="siteChat" class="site-chat hidden"><div class="site-chat-head"><strong>${esc(c.display_name)}</strong><button id="closeSiteChat">×</button></div><div id="siteChatThread" class="site-chat-body"><div>Hi 👋 How can we help?</div></div><div id="siteChatChoices" class="quick-replies"><button type="button" id="askSitePrice">Tell me about ${esc(svc.name)}</button><button type="button" id="bookSite">Book an appointment</button></div><form id="siteChatForm" class="web-form"><input id="siteChatInput" autocomplete="off" maxlength="700" placeholder="Message the clinic…"><button type="submit">Send</button></form></div></div><div class="web-side"><div class="web-card"><h3>Send a website enquiry</h3><p>Submit this form, then open “What staff sees”. The synthetic lead will be waiting in the same clinic queue.</p><form id="webForm" class="web-form"><input id="webName" placeholder="Demo patient name" required><input id="webEmail" type="email" placeholder="demo@example.com" required><select id="webService"><option value="${esc(svc.slug)}">${esc(svc.name)}</option><option value="">General enquiry</option></select><textarea id="webMessage" placeholder="I'd like to know more about an appointment…" required></textarea><button>Send enquiry</button></form></div><div class="web-card"><h3>The outcome</h3><p>The clinic does not have to treat WhatsApp, its website and every approved channel as separate piles of patient work.</p><div class="channel-list"><div class="channel active"><strong>WhatsApp</strong><small>demonstrated</small></div><div class="channel active"><strong>Website</strong><small>form + live assistant</small></div><div class="channel"><strong>Instagram</strong><small>custom integration</small></div><div class="channel"><strong>Facebook</strong><small>custom integration</small></div><div class="channel"><strong>Email</strong><small>custom integration</small></div><div class="channel"><strong>Other API</strong><small>discovery scope</small></div></div><div class="channel-note">Only channels the clinic owns and can authorise would be connected in production.</div></div></div>`;
  $('#webForm').onsubmit=submitWebsite;
  $('#siteChatBtn').onclick=async()=>{try{await ensureCare3Chat();$('#siteChat').classList.remove('hidden')}catch(e){toast(e.message)}};
  $('#closeSiteChat').onclick=()=>$('#siteChat').classList.add('hidden');
  $('#askSitePrice').onclick=()=>sendSiteMessage(`Tell me about ${svc.name}`);
  $('#bookSite').onclick=()=>sendSiteMessage('Book an appointment');
  $('#siteChatForm').onsubmit=e=>{e.preventDefault();sendSiteMessage($('#siteChatInput').value)};
};

/* Review-flow patches: keep package selection and personalisation as separate screens. */
document.addEventListener('DOMContentLoaded',()=>{
  const careCopy={
    1:'Care 1 · Approved answers, structured enquiries and appointment requests for staff to confirm.',
    2:'Care 2 · Patient conversations become organised booking, follow-up and human-handoff work.',
    3:'Care 3 · Website, chat and approved channels can feed one custom clinic operations layer.'
  };
  const careFrom=v=>Math.max(1,Math.min(3,Number(v)||2));
  const goToPersonalise=care=>location.assign(`${location.pathname}?step=2&care=${careFrom(care)}`);

  const applyPersonaliseRoute=()=>{
    const p=new URLSearchParams(location.search),builder=document.querySelector('#builder');if(!builder)return;
    if(p.get('step')!=='2'){builder.classList.remove('personalise-mode');return}
    const care=careFrom(p.get('care'));builder.classList.add('personalise-mode');
    document.querySelectorAll('input[name="level"]').forEach(r=>r.checked=Number(r.value)===care);
    document.querySelectorAll('[data-care-card]').forEach(c=>c.classList.toggle('selected',Number(c.dataset.careCard)===care));
    const badge=document.querySelector('#selectedCareBadge'),out=document.querySelector('#selectedOutcome strong'),btn=document.querySelector('#buildBtn span');
    if(badge)badge.textContent=`Care ${care} selected`;if(out)out.textContent=careCopy[care];if(btn)btn.textContent=`Build my Care ${care} demo`;
    const copy=document.querySelector('.customise-copy');
    if(copy&&!document.querySelector('#stepBack')){const back=document.createElement('button');back.id='stepBack';back.type='button';back.className='step-back';back.textContent='← Back to Care levels';back.onclick=()=>location.assign(location.pathname);copy.prepend(back)}
    setTimeout(()=>document.querySelector('#customise')?.scrollIntoView({block:'center'}),30);
  };

  document.addEventListener('click',e=>{
    if(new URLSearchParams(location.search).has('demo'))return;
    const pick=e.target.closest?.('[data-pick-level]'),card=e.target.closest?.('[data-care-card]');if(!pick&&!card)return;
    const care=pick?.dataset.pickLevel||card?.dataset.careCard;if(!care)return;
    e.preventDefault();e.stopImmediatePropagation();goToPersonalise(care);
  },true);
  document.addEventListener('keydown',e=>{
    if(!['Enter',' '].includes(e.key)||new URLSearchParams(location.search).has('demo'))return;
    const card=e.target.closest?.('[data-care-card]');if(!card)return;e.preventDefault();e.stopImmediatePropagation();goToPersonalise(card.dataset.careCard);
  },true);

  document.querySelector('#tryAnother')?.addEventListener('click',()=>{document.querySelector('#builder')?.classList.remove('personalise-mode');history.replaceState(null,'',location.pathname)});

  const fixStaffMessageRoles=root=>{
    (root||document).querySelectorAll?.('.staff-chat-msg.user').forEach(row=>{row.classList.add('patient');const label=row.querySelector('b');if(label)label.textContent='Patient'});
  };
  const staffSurface=document.querySelector('#staffSurface');if(staffSurface){fixStaffMessageRoles(staffSurface);new MutationObserver(()=>fixStaffMessageRoles(staffSurface)).observe(staffSurface,{childList:true,subtree:true})}

  applyPersonaliseRoute();
});

/* Final review behavior: explicit clinic-brand propagation, patient replies during takeover, and website-specific staff action. */
(()=>{
  const accent=()=>demo?.client?.branding?.accent||'#2E66B8';
  const rgbText=hex=>{const n=parseInt(String(hex||'').replace('#',''),16);return Number.isFinite(n)?`${(n>>16)&255},${(n>>8)&255},${n&255}`:'46,102,184'};
  const forceBrand=()=>{
    const a=accent(),r=rgbText(a);setBrand(a);
    const root=document.querySelector('#staffSurface');
    [root,...(root?[...root.querySelectorAll('.staff-demo-frame,.clinic-crm,.care1-workspace,.care1-brandbar,.crm-nav,.crm-main')]:[])].filter(Boolean).forEach(el=>{el.style.setProperty('--brand',a);el.style.setProperty('--brand-rgb',r)});
    document.documentElement.style.setProperty('--brand',a);document.documentElement.style.setProperty('--brand-rgb',r);
  };
  const staffRoot=document.querySelector('#staffSurface');if(staffRoot)new MutationObserver(()=>queueMicrotask(forceBrand)).observe(staffRoot,{childList:true,subtree:true});
  const previousRefresh=refreshStaff;refreshStaff=async function(){forceBrand();const out=await previousRefresh();forceBrand();return out};
  const previousRenderStaff=renderStaff;renderStaff=function(rows){forceBrand();const out=previousRenderStaff(rows);forceBrand();return out};
  const previousSwitch=switchView;switchView=function(view){forceBrand();const out=previousSwitch(view);if(view==='staff')setTimeout(forceBrand,0);return out};
  const threadStore=id=>`bizi_staff_thread:${demo.client.client_key}:${id}`;
  const saveLocal=(id,item)=>{let arr=[];try{arr=JSON.parse(sessionStorage.getItem(threadStore(id))||'[]')}catch{};if(!Array.isArray(arr))arr=[];arr.push(item);sessionStorage.setItem(threadStore(id),JSON.stringify(arr.slice(-40)))};
  const appendStaffThread=(who,text)=>{const th=document.querySelector('#staffChatThread');if(!th)return;const row=document.createElement('div');row.className=`staff-chat-msg ${who}`;row.innerHTML=`<b>${who==='patient'?'Patient':who==='staff'?'Clinic staff':'Assistant'}</b><span>${esc(text)}</span>`;th.appendChild(row);th.scrollTop=th.scrollHeight};
  const previousSend=sendChat;
  sendChat=async function(raw){const text=String(raw||'').trim().slice(0,700);if(!handoff)return previousSend(raw);if(!text||!lastEnquiryId)return;const input=document.querySelector('#chatInput');if(input)input.value='';messages.push({who:'user',text});saveLocal(lastEnquiryId,{who:'patient',text});renderThread();appendStaffThread('patient',text);toast('Patient message sent. Clinic staff remains in control.')};
  function renderWebsiteContact(box,id,e){const phone=e.contact?.phone||'—',email=e.contact?.email||'—';box.innerHTML=`<div class="website-contact"><div class="website-contact-head"><small>WEBSITE ENQUIRY</small><strong>Contact ${esc(e.contact?.full_name||'patient')}</strong><span>No assistant conversation exists yet, so this is a direct staff contact action.</span></div><div class="website-contact-meta"><div><small>Phone / WhatsApp</small><b>${esc(phone)}</b></div><div><small>Email</small><b>${esc(email)}</b></div></div><form id="websiteContactForm"><textarea id="websiteContactText" maxlength="500" placeholder="Write a demo follow-up message…"></textarea><button>Send demo contact</button></form><div id="websiteContactHistory" class="website-contact-history"></div><button id="websiteContactBack" class="website-contact-back">Back to patient details</button></div>`;const hist=box.querySelector('#websiteContactHistory');let saved=[];try{saved=JSON.parse(sessionStorage.getItem(threadStore(id))||'[]')}catch{};for(const m of Array.isArray(saved)?saved:[]){if(m.who!=='staff')continue;const r=document.createElement('div');r.innerHTML=`<b>Clinic staff</b><span>${esc(m.text||'')}</span>`;hist.appendChild(r)}box.querySelector('#websiteContactForm').onsubmit=ev=>{ev.preventDefault();const input=box.querySelector('#websiteContactText'),text=input.value.trim();if(!text)return;saveLocal(id,{who:'staff',text});const r=document.createElement('div');r.innerHTML=`<b>Clinic staff</b><span>${esc(text)}</span>`;hist.appendChild(r);input.value='';toast('Demo contact saved for this website enquiry.')};box.querySelector('#websiteContactBack').onclick=()=>openDetail(id)}
  const previousOpenDetail=openDetail;openDetail=async function(id){await previousOpenDetail(id);forceBrand();const row=(crmRows||[]).find(x=>x.id===id);if(!row||row.source!=='website')return;const box=document.querySelector('#detail'),btn=box?.querySelector('#takeoverAction');if(!box||!btn)return;btn.textContent='Contact patient';btn.onclick=()=>renderWebsiteContact(box,id,row)};
  forceBrand();
})();
