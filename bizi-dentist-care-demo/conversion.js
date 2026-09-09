// Serve the bundled official logo; retain the existing CSS logo treatment in both placements.
(()=>{
  const phone='2347074396136';
  const chatUrl=text=>'https://wa.me/'+phone+'?text='+encodeURIComponent(text);
  const intro='Hi Bizi Systems! I tried the Dental Care demo and would like this for my clinic.';
  const biziLogo='/assets/bizi-systems-logo.webp';
  const brandImage=(className='bizi-brand-logo')=>'<img class="'+className+'" src="'+biziLogo+'" alt="Bizi Systems logo">';

  const topBrand=document.querySelector('.tiny-brand .bizi-wordmark');
  if(topBrand) topBrand.outerHTML='<span class="bizi-wordmark bizi-official-wordmark">'+brandImage('bizi-brand-logo bizi-brand-logo-top')+'</span>';

  const logoStyle=document.createElement('style');
  logoStyle.textContent='.bizi-brand-logo{display:block;width:auto;height:auto;object-fit:contain;border-radius:10px;box-shadow:0 8px 24px rgba(5,18,38,.16)}.bizi-brand-logo-top{width:96px;max-height:114px}.bizi-official-wordmark{display:inline-flex;align-items:center;flex:none}.bizi-conversion-brand{margin-bottom:16px}.bizi-brand-logo-cta{width:150px;max-height:178px}@media(max-width:700px){.bizi-brand-logo-top{width:78px;max-height:94px}.bizi-brand-logo-cta{width:120px;max-height:144px}}';
  document.head.appendChild(logoStyle);

  const card=document.createElement('section');card.id='biziConversion';card.className='bizi-conversion';card.setAttribute('aria-labelledby','biziConversionTitle');
  card.innerHTML='<div><div class="bizi-conversion-brand">'+brandImage('bizi-brand-logo bizi-brand-logo-cta')+'</div><small>BIZI SYSTEMS · YOUR NEXT STEP</small><h2 id="biziConversionTitle" tabindex="-1">Want this for your clinic?</h2><p>You’ve seen what a calmer front desk could look like. Let’s talk about a version tailored to your clinic, your team and your patients.</p></div><div class="bizi-conversion-actions"><button type="button" data-bizi-form>Fill Out the Form</button><a data-bizi-chat target="_blank" rel="noopener noreferrer">Chat With Us ↗</a><small>Speak directly with Bizi Systems.</small></div>';
  document.querySelector('.demo-footer')?.before(card);

  const contact=document.createElement('button');contact.type='button';contact.className='bizi-contact';contact.textContent='Contact Us';contact.setAttribute('data-bizi-form','');document.body.appendChild(contact);
  const dialog=document.createElement('dialog');dialog.id='biziEnquiry';dialog.className='bizi-enquiry';dialog.setAttribute('aria-labelledby','biziEnquiryTitle');
  dialog.innerHTML='<button type="button" class="bizi-close" aria-label="Close enquiry form">×</button><small>BIZI SYSTEMS</small><h2 id="biziEnquiryTitle">Let’s make this yours.</h2><p>Tell us a little about your clinic. We’ll help you find the right fit.</p><form id="biziLeadForm"><label>Your name<input name="name" autocomplete="name" maxlength="80" required></label><label>Clinic name<input name="clinic" autocomplete="organization" maxlength="100" required></label><label>Phone / WhatsApp number<input name="phone" type="tel" autocomplete="tel" maxlength="25" required></label><label>Email (optional)<input name="email" type="email" autocomplete="email" maxlength="120"></label><label>Interested in<select name="care"><option>Help me choose</option><option>Care 1 · Essential</option><option>Care 2 · Operations</option><option>Care 3 · Custom</option></select></label><label>What would you like help with?<textarea name="message" rows="3" maxlength="1200" placeholder="For example: missed enquiries, booking or follow-ups"></textarea></label><p class="bizi-form-note">This is a business enquiry to Bizi Systems. Please don’t include patient information. Your details will open in WhatsApp for you to review and send.</p><button type="submit">Continue to WhatsApp →</button><p id="biziLeadStatus" role="status"></p></form>';
  document.body.appendChild(dialog);

  let opener;
  function openForm(){opener=document.activeElement;dialog.showModal();dialog.querySelector('input').focus()}
  document.querySelectorAll('[data-bizi-form]').forEach(b=>b.addEventListener('click',openForm));
  document.querySelectorAll('[data-bizi-chat]').forEach(a=>a.href=chatUrl(intro));
  dialog.querySelector('.bizi-close').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>opener?.focus());
  dialog.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;const f=new FormData(form);const digits=String(f.get('phone')).replace(/\D/g,'');if(digits.length<8||digits.length>15){const p=form.elements.phone;p.setCustomValidity('Enter a valid phone number, including the country code.');p.reportValidity();return}const text=intro+'\n\nName: '+String(f.get('name')).trim()+'\nClinic: '+String(f.get('clinic')).trim()+'\nPhone: '+String(f.get('phone')).trim()+'\nEmail: '+(String(f.get('email')).trim()||'Not provided')+'\nInterest: '+f.get('care')+'\nHelp needed: '+(String(f.get('message')).trim()||'Please help me choose the right setup.');window.open(chatUrl(text),'_blank','noopener,noreferrer');document.querySelector('#biziLeadStatus').textContent='Finish by tapping Send in WhatsApp. Your enquiry has not been sent yet.'});
  dialog.querySelector('[name="phone"]').addEventListener('input',e=>e.target.setCustomValidity(''));
  document.querySelector('#guideNext')?.addEventListener('click',()=>{if(!document.querySelector('#demoGuide')?.classList.contains('dismissed'))return;card.scrollIntoView({behavior:'smooth',block:'center'});document.querySelector('#biziConversionTitle').focus({preventScroll:true})});
})();
