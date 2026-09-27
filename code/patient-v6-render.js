const d = $json ?? {};
const c = $('Normalize V6').first().json;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

let history = Array.isArray(c.history) ? [...c.history] : [];
const say = (who, text) => { if (text) history.push({ who, text: String(text) }); };

const effectiveEnquiry = c.action === 'service_selected' && d.enquiry_id ? String(d.enquiry_id) : c.enquiry_id;
const effectiveContact = c.action === 'service_selected' && d.contact_id ? String(d.contact_id) : c.contact_id;
const effectiveServiceName = c.action === 'service_selected' && d.service?.name ? String(d.service.name) : c.service_name;
const effectiveServiceSlug = c.action === 'service_selected' && d.service?.slug ? String(d.service.slug) : c.service_slug;
const effectiveServicePrice = c.action === 'service_selected' && d.service?.price_display ? String(d.service.price_display) : c.service_price;

const hidden = (name, value) => `<input type="hidden" name="${esc(name)}" value="${esc(value ?? '')}">`;
const state = (overrides = {}) => {
  const values = {
    session_id: c.session_id,
    enquiry_id: effectiveEnquiry,
    contact_id: effectiveContact,
    service_slug: effectiveServiceSlug,
    service_name: effectiveServiceName,
    service_price: effectiveServicePrice,
    full_name: c.full_name,
    email: c.email,
    date: c.date,
    time: c.time,
    ...overrides,
  };
  return hidden('history', JSON.stringify(history)) + Object.entries(values).map(([k, v]) => hidden(k, v)).join('');
};

const post = (action, label, overrides = {}, cls = 'wa-reply') => `
<form method="post" action="/webhook/favfare-demo/patient-action-v6">
  ${hidden('action', action)}${state(overrides)}
  <button class="${cls}">${esc(label)}</button>
</form>`;

const composer = () => `
<form class="composer" method="post" action="/webhook/favfare-demo/patient-action-v6">
  ${hidden('action', 'chat')}${state()}
  <input name="message" placeholder="Message" autocomplete="off" required>
  <button aria-label="send">➤</button>
</form>`;

const prettyDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'
});

const services = Array.isArray(d.services) ? d.services : [];
const serviceRows = (rows) => `<div class="service-list">${rows.map((s) => `
<form method="post" action="/webhook/favfare-demo/patient-action-v6">
  ${hidden('action', 'service_selected')}
  ${state({
    service_slug: s.slug,
    service_name: s.name,
    service_price: s.price_display,
    message: `I am interested in ${s.name}`,
  })}
  <button class="service-row">
    <span><b>${esc(s.name)}</b><small>${esc(s.display_group || '')}</small></span>
    <strong>${esc(s.price_display || '')}</strong>
  </button>
</form>`).join('')}</div>`;

let controls = '';
let allowComposer = true;

if (c.action === 'start_booking') {
  say('patient', 'I want to book an appointment.');
  say('assistant', 'Sure — choose the service you want to book.');
  const popular = services.filter((s) => s.popular);
  controls = serviceRows(popular.length ? popular : services.slice(0, 8));
  controls += `<div class="secondary">${post('browse_services', 'View all services')}</div>`;
  allowComposer = false;
}

else if (c.action === 'browse_services') {
  say('patient', 'Show me the services and prices.');
  say('assistant', 'Here are Favfare’s current services and website prices.');
  controls = serviceRows(services);
  allowComposer = false;
}

else if (c.action === 'chat') {
  say('patient', c.message);
  say('assistant', d.reply || 'Tell me a little more about what you need.');
  const choices = Array.isArray(d.choices) ? d.choices : [];
  if (choices.length) {
    controls = `<div class="wa-buttons">${choices.map((x) => post(
      'service_selected',
      `${x.label}${x.description ? ` · ${x.description}` : ''}`,
      {
        service_slug: x.slug,
        service_name: x.label,
        service_price: x.description,
        message: `I am interested in ${x.label}`,
      }
    )).join('')}</div>`;
  }
  if (d.handoff) controls += '<div class="human-note">This enquiry has been flagged for clinic staff review.</div>';
}

else if (c.action === 'service_selected') {
  say('patient', `I’d like ${effectiveServiceName}.`);
  if (d.ok && d.quote_allowed) {
    say('assistant', `${effectiveServiceName} is ${effectiveServicePrice}. Before I show available dates, I just need the booking details.`);
    controls = `
<form class="details-card" method="post" action="/webhook/favfare-demo/patient-action-v6">
  ${hidden('action', 'capture_details')}${state()}
  <label>Full name<input name="full_name" autocomplete="name" required></label>
  <label>Email address<input type="email" name="email" autocomplete="email" required></label>
  <div class="phone-note">Your WhatsApp number is captured automatically in the real channel.</div>
  <button>Continue to date & time</button>
</form>`;
    allowComposer = false;
  } else {
    say('assistant', 'I couldn’t retrieve that service from the current catalogue. Please choose another option.');
    controls = post('browse_services', 'View services');
    allowComposer = false;
  }
}

else if (c.action === 'capture_details' || c.action === 'calendar') {
  if (!d.ok) {
    say('assistant', 'I couldn’t save those booking details. Please check the name and email and try again.');
    controls = `
<form class="details-card" method="post" action="/webhook/favfare-demo/patient-action-v6">
  ${hidden('action', 'capture_details')}${state()}
  <label>Full name<input name="full_name" value="${esc(c.full_name)}" autocomplete="name" required></label>
  <label>Email address<input type="email" name="email" value="${esc(c.email)}" autocomplete="email" required></label>
  <button>Try again</button>
</form>`;
    allowComposer = false;
  } else {
    if (c.action === 'capture_details') {
      say('patient', `My booking details are ${c.full_name} · ${c.email}.`);
      const firstName = c.full_name.split(/\s+/)[0] || c.full_name;
      say('assistant', `Thanks, ${firstName}. Choose a date below. As soon as you select one, the available times for that date will appear underneath.`);
    } else {
      say('assistant', 'Choose another available date and time.');
    }

    const days = Array.isArray(d.days) ? d.days : [];
    const calendarData = JSON.stringify(days).replace(/</g, '\\u003c');

    controls = `
<div class="calendar-card">
  <div class="calendar-title">
    <b>Choose a date</b>
    <span>Closed or full dates are faded</span>
  </div>
  <div class="date-strip" id="date-strip">
    ${days.map((day) => `
      <button type="button"
        class="date-chip ${day.available_count > 0 ? '' : 'disabled'}"
        data-date="${esc(day.date)}"
        ${day.available_count > 0 ? '' : 'disabled'}>
        <span>${esc(prettyDate(day.date).split(' ')[0])}</span>
        <b>${esc(prettyDate(day.date).split(' ').slice(1).join(' '))}</b>
        <small>${day.available_count > 0 ? `${day.available_count} free` : 'Unavailable'}</small>
      </button>`).join('')}
  </div>

  <div class="time-head">
    <b id="selected-date-label">Choose a date above</b>
    <span>Unavailable times are faded</span>
  </div>
  <div class="time-grid" id="time-grid">
    <div class="empty-times">Select a date to see times.</div>
  </div>

  <form id="slot-form" method="post" action="/webhook/favfare-demo/patient-action-v6">
    ${hidden('action', 'request_booking')}${state({ date: '', time: '' })}
    <button id="book-slot" disabled>Book selected time</button>
  </form>
</div>
<script>
(() => {
  const CAL = ${calendarData};
  const strip = document.getElementById('date-strip');
  const grid = document.getElementById('time-grid');
  const label = document.getElementById('selected-date-label');
  const form = document.getElementById('slot-form');
  const book = document.getElementById('book-slot');

  function fullDate(date) {
    return new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
    });
  }

  function renderDate(date) {
    const day = CAL.find((x) => x.date === date);
    if (!day) return;

    form.elements.date.value = date;
    form.elements.time.value = '';
    book.disabled = true;
    label.textContent = fullDate(date);

    document.querySelectorAll('.date-chip').forEach((x) => {
      x.classList.toggle('selected', x.dataset.date === date);
    });

    grid.innerHTML = day.slots.map((slot) => {
      const disabled = slot.available ? '' : 'disabled';
      return '<button type="button" class="time-chip ' + disabled + '" data-time="' + slot.time + '" ' + disabled + '>' + slot.time + '</button>';
    }).join('');

    grid.querySelectorAll('.time-chip:not(.disabled)').forEach((btn) => {
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.time-chip').forEach((x) => x.classList.remove('selected'));
        btn.classList.add('selected');
        form.elements.time.value = btn.dataset.time;
        book.disabled = false;
      });
    });
  }

  strip.querySelectorAll('.date-chip:not(.disabled)').forEach((btn) => {
    btn.addEventListener('click', () => renderDate(btn.dataset.date));
  });
})();
</script>`;
    allowComposer = false;
  }
}

else if (c.action === 'request_booking') {
  say('patient', `Book ${prettyDate(c.date)} at ${c.time}.`);
  if (d.ok && d.booking_status === 'confirmed') {
    say('assistant', `Done — your appointment for ${effectiveServiceName} is confirmed for ${prettyDate(c.date)} at ${c.time}.`);
    say('assistant', 'The clinic team has been alerted.');
    controls = `
<div class="done-actions">
  <a href="/webhook/favfare-demo/crm-ui" target="_blank">Open staff CRM ↗</a>
  <a href="/webhook/favfare-demo/patient">Start new demo</a>
</div>`;
  } else {
    say('assistant', 'That slot is no longer available. Choose another date or time.');
    controls = post('calendar', 'Choose another date & time');
  }
  allowComposer = false;
}

const bubbles = history.map((x) => `
<div class="msg ${x.who === 'patient' ? 'out' : 'in'}">
  <div class="bubble">${esc(x.text)}</div>
</div>`).join('');

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Favfare WhatsApp Demo</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#dfe8e3;color:#111;min-height:100vh;display:grid;place-items:center;padding:20px}.stage{width:min(1020px,100%);display:grid;grid-template-columns:1fr 410px;gap:34px;align-items:center}.copy h1{font-size:40px;margin:8px 0}.copy p{color:#62706a;line-height:1.65;max-width:520px}.copy small{font-weight:800;letter-spacing:.14em;color:#47705e}.copy a{display:inline-block;margin-top:16px;color:#075e54;font-weight:800;text-decoration:none}.phone{height:790px;max-height:92vh;border-radius:26px;overflow:hidden;display:flex;flex-direction:column;background:#efeae2;box-shadow:0 25px 70px rgba(17,45,34,.22)}.bar{background:#075e54;color:white;padding:12px 14px;display:flex;gap:10px;align-items:center}.avatar{width:40px;height:40px;border-radius:50%;background:#fff;color:#075e54;display:grid;place-items:center;font-weight:900}.bar b{display:block}.bar span{font-size:11px;opacity:.8}.notice{font-size:10px;text-align:center;background:#fff6cb;color:#755d14;padding:6px}.chat{flex:1;overflow:auto;padding:15px 12px;background-image:radial-gradient(rgba(0,0,0,.025) 1px,transparent 1px);background-size:18px 18px}.msg{display:flex;margin:7px 0}.msg.out{justify-content:flex-end}.bubble{max-width:84%;padding:8px 10px;border-radius:8px;line-height:1.42;font-size:14px;box-shadow:0 1px 1px rgba(0,0,0,.1)}.in .bubble{background:#fff;border-top-left-radius:2px}.out .bubble{background:#d9fdd3;border-top-right-radius:2px}.controls{background:#f0f2f5;padding:8px;max-height:430px;overflow:auto}.wa-buttons,.service-list{background:#fff;border-radius:9px;overflow:hidden;margin-bottom:7px}.wa-buttons form,.service-list form{margin:0}.wa-reply{width:100%;border:0;border-top:1px solid #e7e9e8;background:#fff;color:#008069;padding:11px;font-weight:700}.service-row{width:100%;border:0;border-top:1px solid #eceeed;background:#fff;padding:11px 12px;display:flex;justify-content:space-between;gap:12px;text-align:left;align-items:center}.service-row span{display:grid;gap:2px}.service-row small{color:#718078}.service-row strong{color:#075e54;white-space:nowrap}.secondary{margin:8px 0}.composer{display:flex;gap:7px}.composer input,.details-card input{flex:1;border:0;background:#fff;border-radius:22px;padding:11px 14px;outline:none}.composer button{width:43px;height:43px;border:0;border-radius:50%;background:#00a884;color:#fff}.details-card{background:#fff;border-radius:10px;padding:12px;display:grid;gap:10px}.details-card label{font-size:12px;color:#52645b;display:grid;gap:5px}.details-card input{border:1px solid #dde4e0;border-radius:9px}.details-card button,#book-slot{border:0;background:#008069;color:#fff;padding:11px;border-radius:9px;font-weight:800}.phone-note{font-size:10px;color:#768079}.calendar-card{background:#fff;border-radius:10px;padding:12px}.calendar-title,.time-head{display:flex;justify-content:space-between;gap:8px;align-items:end}.calendar-title span,.time-head span{font-size:10px;color:#7d8782}.date-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:10px 0 12px}.date-chip{border:1px solid #dfe6e2;background:#fff;border-radius:10px;padding:8px 4px;display:grid;gap:2px;text-align:center}.date-chip span,.date-chip small{font-size:9px;color:#75827b}.date-chip.disabled,.time-chip.disabled{opacity:.28;filter:grayscale(1);cursor:not-allowed}.date-chip.selected,.time-chip.selected{border-color:#00a884;background:#e7f7f1}.time-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:9px 0 12px;min-height:42px}.time-chip{border:1px solid #dfe6e2;background:#fff;border-radius:8px;padding:8px 3px}.time-chip.selected{color:#006e58;font-weight:800}.empty-times{grid-column:1/-1;font-size:11px;color:#7b8580;padding:10px 2px}.calendar-card #slot-form button{width:100%}.calendar-card #slot-form button:disabled{opacity:.4}.done-actions{display:grid;gap:7px}.done-actions a{display:block;text-align:center;background:#fff;color:#008069;border-radius:8px;padding:10px;text-decoration:none;font-weight:700}.human-note{background:#fff3d8;color:#715616;padding:9px;border-radius:8px;font-size:11px}@media(max-width:860px){.stage{grid-template-columns:1fr}.copy{display:none}.phone{height:90vh}.date-strip{grid-template-columns:repeat(3,1fr)}}
</style>
</head>
<body>
<div class="stage">
  <div class="copy">
    <small>BIZI SYSTEMS · LIVE DEMO</small>
    <h1>Favfare Patient Assistant</h1>
    <p>Conversational sales, server-backed catalogue data, client details, and conflict-safe appointment booking.</p>
    <a href="/webhook/favfare-demo/crm-ui" target="_blank">Open staff CRM ↗</a>
  </div>
  <section class="phone">
    <div class="bar"><div class="avatar">F</div><div><b>Favfare The Clinic</b><span>online</span></div></div>
    <div class="notice">Demo · unavailable dates and times are disabled</div>
    <div class="chat">${bubbles}</div>
    <div class="controls">${controls}${allowComposer ? composer() : ''}</div>
  </section>
</div>
</body>
</html>`;

return [{ json: { html } }];
