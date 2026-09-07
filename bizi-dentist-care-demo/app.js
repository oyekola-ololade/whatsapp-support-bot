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
  const c=demo.client,brand=c.branding||{},svc=demo.services?.[0]||{name:'Dental Cleaning',price_display:'Price confirmed by clinic'},ini=brand.logo_text||initials(c.display_name);
  $('#websiteExperience').innerHTML=`<div class="fake-site"><div class="site-nav"><div class="site-brand"><i>${esc(ini)}</i><strong>${esc(c.display_name)}</strong></div><span>Home · Services · Contact</span></div><div class="site-hero"><small>${esc(brand.location||'YOUR CLINIC')}</small><h3>A calmer way to start your dental visit.</h3><p>Ask a question, explore services or send an enquiry. This site is generated in your clinic branding for the custom demo.</p><button id="siteChatBtn">Chat with the clinic</button></div><div class="site-body"><div class="site-service"><small>FEATURED SERVICE</small><strong>${esc(svc.name)}</strong><span>${esc(svc.price_display||'Price confirmed by clinic')}</span></div><div class="site-service"><small>PATIENT SUPPORT</small><strong>Questions handled before the front desk steps in</strong><span>Human handoff when needed</span></div></div><div id="siteChat" class="site-chat hidden"><div class="site-chat-head"><strong>${esc(c.display_name)}</strong><button id="closeSiteChat">×</button></div><div id="siteChatThread" class="site-chat-body"><div>Hi 👋 How can we help?</div></div><div id="siteChatChoices" class="quick-replies"><button type="button" id="askSitePrice">How much is ${esc(svc.name)}?</button><button type="button" id="bookSite">Book an appointment</button></div><form id="siteChatForm" class="web-form"><input id="siteChatInput" autocomplete="off" maxlength="700" placeholder="Message the clinic…"><button type="submit">Send</button></form></div></div><div class="web-side"><div class="web-card"><h3>Send a website enquiry</h3><p>Submit this form, then open “What staff sees”. The synthetic lead will be waiting in the same clinic queue.</p><form id="webForm" class="web-form"><input id="webName" placeholder="Demo patient name" required><input id="webEmail" type="email" placeholder="demo@example.com" required><select id="webService"><option value="${esc(svc.slug)}">${esc(svc.name)}</option><option value="">General enquiry</option></select><textarea id="webMessage" placeholder="I'd like to know more about an appointment…" required></textarea><button>Send enquiry</button></form></div><div class="web-card"><h3>The outcome</h3><p>The clinic does not have to treat WhatsApp, its website and every approved channel as separate piles of patient work.</p><div class="channel-list"><div class="channel active"><strong>WhatsApp</strong><small>demonstrated</small></div><div class="channel active"><strong>Website</strong><small>form + live assistant</small></div><div class="channel"><strong>Instagram</strong><small>custom integration</small></div><div class="channel"><strong>Facebook</strong><small>custom integration</small></div><div class="channel"><strong>Email</strong><small>custom integration</small></div><div class="channel"><strong>Other API</strong><small>discovery scope</small></div></div><div class="channel-note">Only channels the clinic owns and can authorise would be connected in production.</div></div></div>`;
  $('#webForm').onsubmit=submitWebsite;
  $('#siteChatBtn').onclick=async()=>{try{await ensureCare3Chat();$('#siteChat').classList.remove('hidden')}catch(e){toast(e.message)}};
  $('#closeSiteChat').onclick=()=>$('#siteChat').classList.add('hidden');
  $('#askSitePrice').onclick=()=>sendSiteMessage(`How much is ${svc.name}?`);
  $('#bookSite').onclick=()=>sendSiteMessage('Book an appointment');
  $('#siteChatForm').onsubmit=e=>{e.preventDefault();sendSiteMessage($('#siteChatInput').value)};
};
