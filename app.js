const state = {
  level: 3,
  agency: "Cedarstone Properties",
  market: "Lagos",
  locations: "Lekki, Ikoyi, Victoria Island",
  businessPhone: "+234 803 555 0192",
  businessEmail: "hello@cedarstone.example",
  businessWebsite: "www.cedarstone.example",
  colour: "#7b4dff",
  takeover: false,
  step: 0,
  profile: {
    "Buyer": "Not captured",
    "Phone": "Not captured",
    "Email": "Not captured",
    "Budget": "Not captured",
    "Location": "Not captured",
    "Property": "Not captured",
    "Purpose": "Not captured",
    "Timeline": "Not captured",
    "Viewing": "Not captured"
  }
};

const flow = [
  {
    ask: "Good morning. Welcome to Cedarstone Properties. May I have your name so I can personalise the property search?",
    choices: ["Adaeze Nwosu"],
    field: "Buyer"
  },
  {
    ask: "Thank you, Adaeze. What phone or WhatsApp number should the property adviser use?",
    choices: ["0803 555 0147"],
    field: "Phone"
  },
  {
    ask: "And which email should receive the property brochure and documents?",
    choices: ["adaeze.nwosu@example.com"],
    field: "Email"
  },
  {
    ask: "Are you looking to buy a home, rent, or invest?",
    choices: ["Buy a home", "Invest", "Rent"],
    field: "Purpose",
    values: ["Personal home", "Investment", "Rental"]
  },
  {
    ask: "Which area would you like us to focus on?",
    choices: ["Lekki", "Ikoyi", "Victoria Island"],
    field: "Location"
  },
  {
    ask: "What budget range should I work with so I only show you relevant options?",
    choices: ["₦80m to ₦120m", "₦120m to ₦180m", "Above ₦180m"],
    field: "Budget"
  },
  {
    ask: "What kind of property would suit you best?",
    choices: ["3 bedroom apartment", "4 bedroom terrace", "Detached house"],
    field: "Property"
  },
  {
    ask: "How soon are you hoping to make a decision?",
    choices: ["Within 30 days", "1 to 3 months", "Still exploring"],
    field: "Timeline"
  },
  {
    ask: "I found two suitable options. Would you prefer a physical viewing or a virtual tour?",
    choices: ["Physical viewing", "Virtual tour", "Send options first"],
    field: "Viewing"
  }
];

const listings = [
  {title:"The Meridian Residences",location:"Lekki Phase 1",price:"₦115m",type:"3 bedroom apartment",status:"Available",image:"https://images.pexels.com/photos/30506378/pexels-photo-30506378/free-photo-of-modern-luxury-apartment-architecture.jpeg?auto=compress&dpr=1&h=750&w=1260"},
  {title:"Olive Court",location:"Ikoyi",price:"₦165m",type:"3 bedroom apartment",status:"Private viewing",image:"https://images.pexels.com/photos/18273275/pexels-photo-18273275/free-photo-of-interior-of-a-modern-luxury-house.jpeg?auto=compress&dpr=1&h=750&w=1260"},
  {title:"Atlantic Terraces",location:"Victoria Island",price:"₦210m",type:"4 bedroom terrace",status:"Available",image:"https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1200"},
  {title:"Cedar Grove",location:"Osapa",price:"₦92m",type:"3 bedroom apartment",status:"Available",image:"https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=1200"},
  {title:"The Pavilion",location:"Banana Island",price:"₦390m",type:"4 bedroom maisonette",status:"By appointment",image:"https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?auto=compress&cs=tinysrgb&w=1200"},
  {title:"Harbour View",location:"Oniru",price:"₦145m",type:"3 bedroom apartment",status:"Available",image:"https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200"}
];

const sampleLeads = [
  ["Tunde Adebayo", "₦150m", "Ikoyi", "Viewing booked", "Amaka", "Today 11:00"],
  ["Nneka Eze", "₦95m", "Lekki", "Property matched", "Femi", "Today 12:30"],
  ["David Okafor", "₦220m", "Victoria Island", "Documents", "Amaka", "Today 14:00"],
  ["Zainab Bello", "₦80m", "Lekki", "Qualified", "Tola", "Tomorrow"],
  ["Chidi Nwosu", "₦130m", "Ikoyi", "Follow up", "Femi", "Overdue"]
];

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();

function show(section) {
  ["landing", "setup", "experience"].forEach(id => $(`#${id}`).classList.toggle("hidden", id !== section));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}

$("[data-scroll-packages]").addEventListener("click", () => $("#packages").scrollIntoView({ behavior: "smooth" }));
const packageSetup = {
  1: {
    eyebrow: "CARE 1 CAPTURE EXPERIENCE",
    headline: "See every serious enquiry clearly.",
    description: "Personalise a simple buyer assistant and enquiry table for a small property team."
  },
  2: {
    eyebrow: "CARE 2 CONVERSION EXPERIENCE",
    headline: "Turn enquiries into booked viewings.",
    description: "Personalise the qualification, agent assignment, property matching, and follow up workflow."
  },
  3: {
    eyebrow: "CARE 3 COMPLETE EXPERIENCE",
    headline: "Put your agency inside the demo.",
    description: "Use sample business details. We will turn the next screen into your own property sales workspace."
  }
};

$$('[data-package]').forEach(button => button.addEventListener("click", () => {
  state.level = Number(button.dataset.package);
  const copy = packageSetup[state.level];
  $("#setupEyebrow").innerHTML = `<i></i>${copy.eyebrow}`;
  $("#setupHeadline").textContent = copy.headline;
  $("#setupDescription").textContent = copy.description;
  $("#enterDemoLabel").textContent = `Enter my Care ${state.level} demo`;
  show("setup");
}));
$("[data-custom]").addEventListener("click", () => toast("Custom begins with a process review. It has no public demo or fixed price."));
$$('[data-back]').forEach(button => button.addEventListener("click", () => show("landing")));
$("#brandColour").addEventListener("input", event => {
  $("#colourValue").textContent = event.target.value.toUpperCase();
  document.documentElement.style.setProperty("--client", event.target.value);
  document.documentElement.style.setProperty("--client-soft", `${event.target.value}2e`);
});

$("#setupForm").addEventListener("submit", event => {
  event.preventDefault();
  state.agency = $("#agencyName").value.trim();
  state.market = $("#market").value;
  state.locations = $("#locations").value.trim();
  state.businessPhone = $("#businessPhone").value.trim();
  state.businessEmail = $("#businessEmail").value.trim();
  state.businessWebsite = $("#businessWebsite").value.trim();
  state.colour = $("#brandColour").value;
  document.documentElement.style.setProperty("--client", state.colour);
  document.documentElement.style.setProperty("--client-soft", `${state.colour}2e`);
  $("#agencyLogo").textContent = initials(state.agency);
  $("#phoneLogo").textContent = initials(state.agency);
  $("#sideLogo").textContent = initials(state.agency);
  $("#agencyTitle").textContent = state.agency;
  $("#phoneAgency").textContent = state.agency;
  $("#sideAgency").textContent = state.agency.split(" ")[0];
  $("#siteLogo").textContent = initials(state.agency);
  $("#siteAgency").textContent = state.agency;
  $("#siteFooterAgency").textContent = state.agency;
  $("#siteFooterContact").textContent = `${state.businessPhone} · ${state.businessEmail}`;
  $("#siteFooterWebsite").textContent = state.businessWebsite || "Property website preview";
  $("#tenantName").textContent = state.agency;
  $("#websiteTenantName").textContent = state.agency;
  $("#siteLocations").textContent = `Carefully selected opportunities across ${state.locations}.`;
  $("#agencyMeta").textContent = `${state.market} · Care ${state.level} demo`;
  $$('[data-min-care]').forEach(button => button.hidden = Number(button.dataset.minCare) > state.level);
  $("#websiteViewTab").hidden = state.level < 3;
  show("experience");
  resetChat();
  renderWebsite();
  renderWorkspace("today");
});

function bubble(text, type) {
  const el = document.createElement("div");
  el.className = `bubble ${type}`;
  el.innerHTML = `${text}<time>9:${String(12 + $("#chatThread").children.length).padStart(2, "0")} ✓✓</time>`;
  $("#chatThread").appendChild(el);
  $("#chatThread").scrollTop = $("#chatThread").scrollHeight;
}

function renderProfile() {
  $("#buyerProfile").innerHTML = Object.entries(state.profile).map(([key, value]) => `<div class="profile-row ${value === "Not captured" ? "empty" : ""}"><span>${key}</span><strong>${value}</strong></div>`).join("");
}

function askCurrent() {
  const activeFlow = state.level === 1 ? flow.slice(0, 8) : flow;
  const current = activeFlow[state.step];
  if (!current) return completeQualification();
  setTimeout(() => {
    bubble(current.ask.replace("Cedarstone Properties", state.agency), "agent");
    $("#quickReplies").innerHTML = current.choices.map((choice, index) => `<button data-choice="${index}">${choice}</button>`).join("");
    $$('[data-choice]').forEach(button => button.addEventListener("click", () => selectChoice(Number(button.dataset.choice))));
  }, state.step === 0 ? 0 : 420);
}

function selectChoice(index) {
  const current = flow[state.step];
  const choice = current.choices[index];
  bubble(choice, "buyer");
  state.profile[current.field] = current.values ? current.values[index] : choice;
  state.step += 1;
  $("#quickReplies").innerHTML = "";
  renderProfile();
  updateAction();
  askCurrent();
}

function updateAction() {
  const progress = state.step;
  const actions = [
    ["Capture buyer identity", "The system begins with a person, not an anonymous chat."],
    ["Confirm the best contact number", "The buyer name is now attached to this enquiry."],
    ["Capture the document email", "The adviser can now continue on WhatsApp or by phone."],
    ["Understand the buying purpose", "The brochure and documents have a verified destination."],
    ["Confirm the preferred market", "The system now knows why this buyer is searching."],
    ["Find the buyer's price range", "The preferred location is ready for matching."],
    ["Understand the property need", "The system can exclude options outside the budget."],
    ["Confirm buying urgency", "A property match can now be prepared."],
    ["Arrange the right viewing", "This qualified lead is ready for an assigned agent."],
    ["Amaka to confirm Saturday viewing", "The buyer, property match, contact details, and next action are visible to the team."]
  ];
  if (state.level === 1 && progress >= 8) {
    $("#nextAction").textContent = "Staff to review and contact this buyer";
    $("#nextActionDetail").textContent = "Care 1 captures a clear enquiry and leaves matching and viewing coordination with the team.";
  } else {
    $("#nextAction").textContent = actions[progress][0];
    $("#nextActionDetail").textContent = actions[progress][1];
  }
}

function completeQualification() {
  const completion = state.level === 1
    ? "Thank you. I have organised your requirements and sent the enquiry to the property team. A staff member can continue without asking you to repeat the basic details."
    : "Perfect. I have matched two suitable properties and sent the full enquiry to Amaka. She can confirm your preferred viewing time without asking you to repeat these details.";
  bubble(completion, "agent");
  $("#quickReplies").innerHTML = '<button id="qualifiedOpen">Open team workspace</button>';
  $("#openWorkspace").disabled = false;
  $("#workspaceBadge").textContent = "2";
  $("#qualifiedOpen").addEventListener("click", () => switchView("workspace"));
}

function resetChat() {
  state.step = 0;
  state.takeover = false;
  state.profile = { Buyer: "Not captured", Phone: "Not captured", Email: "Not captured", Budget: "Not captured", Location: "Not captured", Property: "Not captured", Purpose: "Not captured", Timeline: "Not captured", Viewing: "Not captured" };
  $("#chatThread").innerHTML = "";
  $("#quickReplies").innerHTML = "";
  $("#openWorkspace").disabled = true;
  $("#workspaceBadge").textContent = "1";
  $("#phoneStatus").textContent = "typically replies instantly";
  $(".takeover-banner")?.remove();
  renderProfile();
  updateAction();
  askCurrent();
}

$("#resetChat").addEventListener("click", resetChat);
$("#openWorkspace").addEventListener("click", () => switchView("workspace"));
$$('[data-view]').forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));

function switchView(view) {
  window.scrollTo({top: 0, behavior: "auto"});
  $$('[data-view]').forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $$('[data-panel]').forEach(panel => panel.classList.toggle("active", panel.dataset.panel === view));
  if (view === "workspace") {
    $("#tourCount").textContent = "2 of 2";
    $("#tourKicker").textContent = "NOW SEE THE TEAM VIEW";
    $("#tourTitle").textContent = "The chat has already become owned work.";
    $("#tourText").textContent = "Open the lead, assign an agent, match a property, and protect the next action.";
    $("#tourNext").innerHTML = 'Back to buyer <span>←</span>';
  } else if (view === "website") {
    $("#tourCount").textContent = "3 of 3";
    $("#tourKicker").textContent = "CARE 3 WEBSITE";
    $("#tourTitle").textContent = "The website feeds the same sales operation.";
    $("#tourText").textContent = "Browse listings or submit a buyer brief, then see the enquiry enter the team workspace.";
    $("#tourNext").innerHTML = 'Back to buyer <span>←</span>';
  } else {
    $("#tourCount").textContent = "1 of 2";
    $("#tourKicker").textContent = "START AS THE BUYER";
    $("#tourTitle").textContent = "Watch one enquiry become organised work.";
    $("#tourText").textContent = "Choose a buyer answer below. Each response adds useful context for the sales team.";
    $("#tourNext").innerHTML = 'Next step <span>→</span>';
  }
}

$("#tourNext").addEventListener("click", () => switchView($("[data-panel=buyer]").classList.contains("active") ? "workspace" : "buyer"));

function currentLeadRow() {
  const completeAt = state.level === 1 ? 8 : 9;
  const buyer = state.profile.Buyer === "Not captured" ? "New website enquiry" : state.profile.Buyer;
  if (state.step < completeAt) return [buyer, state.profile.Budget, state.profile.Location, "Qualifying", "Unassigned", "Now"];
  if (state.level === 1) return [buyer, state.profile.Budget, state.profile.Location, "Ready for staff", "Unassigned", "Contact now"];
  return [buyer, state.profile.Budget, state.profile.Location, "Viewing requested", "Amaka", "Today 15:30"];
}

function todayPage() {
  const lead = currentLeadRow();
  const buyerName = state.profile.Buyer === "Not captured" ? "Adaeze Nwosu" : state.profile.Buyer;
  const premiumProfile = {
    Budget: state.profile.Budget === "Not captured" ? "₦120m to ₦180m" : state.profile.Budget,
    Location: state.profile.Location === "Not captured" ? "Lekki" : state.profile.Location,
    Property: state.profile.Property === "Not captured" ? "3 bedroom apartment" : state.profile.Property,
    Timeline: state.profile.Timeline === "Not captured" ? "Within 30 days" : state.profile.Timeline
  };
  return `
    <div class="metric-grid">
      <article class="metric"><small>New enquiries</small><strong>${state.step ? 13 : 12}</strong><span>3 need assignment</span></article>
      <article class="metric"><small>${state.level === 1 ? 'Ready for staff' : 'Viewings this week'}</small><strong>${state.level === 1 ? 4 : (state.step >= 6 ? 9 : 8)}</strong><span>${state.level === 1 ? '1 new from this demo' : '5 confirmed'}</span></article>
      <article class="metric"><small>${state.level === 1 ? 'Contact today' : 'Follow ups due'}</small><strong>5</strong><span>2 are overdue</span></article>
      <article class="metric"><small>${state.level === 1 ? 'Human handoffs' : 'Active offers'}</small><strong>${state.level === 1 ? '3' : '₦470m'}</strong><span>${state.level === 1 ? 'This week' : 'Across 4 buyers'}</span></article>
    </div>
    <div class="lead-command">
      <section class="panel"><div class="panel-head"><h3>Highest intent opportunity</h3><button data-page-link="leads">Open full record</button></div>
        <div class="identity-card"><span class="avatar">${initials(buyerName)}</span><div><strong>${buyerName}</strong><span>${state.profile.Phone === 'Not captured' ? '0803 555 0147' : state.profile.Phone} · ${state.profile.Email === 'Not captured' ? 'adaeze.nwosu@example.com' : state.profile.Email}</span><div class="identity-tags"><b>92% QUALIFIED</b><b>WHATSAPP</b><b>HIGH INTENT</b></div></div><span class="stage hot">Action due now</span></div>
        <div class="detail-grid"><div><small>Budget</small><strong>${premiumProfile.Budget}</strong></div><div><small>Location</small><strong>${premiumProfile.Location}</strong></div><div><small>Property</small><strong>${premiumProfile.Property}</strong></div><div><small>Timeline</small><strong>${premiumProfile.Timeline}</strong></div><div><small>Assigned adviser</small><strong>Amaka Okoro</strong></div><div><small>Next action</small><strong>Confirm Saturday viewing</strong></div></div>
      </section>
      <section class="panel"><div class="panel-head"><h3>Live activity</h3><button>Full history</button></div><div class="timeline"><div class="timeline-item"><i></i><div><strong>Buyer enquiry received</strong><small>WhatsApp · 2 minutes ago</small></div></div><div class="timeline-item"><i></i><div><strong>Contact details verified</strong><small>Name, phone and email captured</small></div></div><div class="timeline-item"><i></i><div><strong>Requirements qualified</strong><small>${premiumProfile.Budget} · ${premiumProfile.Location}</small></div></div><div class="timeline-item"><i></i><div><strong>Next action protected</strong><small>Amaka to confirm the viewing</small></div></div></div></section>
    </div>
    <div class="work-grid">
      <section class="panel"><div class="panel-head"><h3>Fresh opportunities</h3><button data-page-link="leads">View all leads</button></div>
        ${[lead,...sampleLeads.slice(0,3)].map((row,index)=>`<div class="lead-row" data-lead="${encodeURIComponent(row[0])}" tabindex="0"><span class="avatar">${initials(row[0])}</span><div><strong>${row[0]}</strong><small>${row[1]} · ${row[2]} · ${row[4]}</small></div><span class="stage ${index===0?'hot':''}">${row[3]}</span></div>`).join("")}
      </section>
      <section class="panel"><div class="panel-head"><h3>Needs attention</h3><button>Resolve</button></div><div class="attention">
        <div class="attention-item"><span>OVERDUE FOLLOW UP</span><strong>Chidi Nwosu has waited 19 hours</strong><small>Femi promised updated Ikoyi options.</small></div>
        <div class="attention-item"><span>UNASSIGNED LEAD</span><strong>${state.step ? "New demo buyer needs an owner" : "Two enquiries need an owner"}</strong><small>Route by area or current workload.</small></div>
        <div class="attention-item"><span>VIEWING TO CONFIRM</span><strong>Nneka requested Saturday morning</strong><small>Property contact has not confirmed.</small></div>
      </div></section>
    </div>`;
}

function leadsPage() {
  return `<div class="page-table"><div class="table-head"><span>BUYER</span><span>BUDGET</span><span>LOCATION</span><span>STAGE</span><span>OWNER</span><span>NEXT ACTION</span></div>${[currentLeadRow(),...sampleLeads].map(row=>`<div class="table-row" data-lead="${encodeURIComponent(row[0])}" tabindex="0"><strong>${row[0]}</strong><span>${row[1]}</span><span>${row[2]}</span><span class="stage">${row[3]}</span><span>${row[4]}</span><span>${row[5]}</span></div>`).join("")}</div>`;
}

function propertiesPage() {
  return `<div class="panel-head"><div><h3>Active portfolio</h3><small>${listings.length} listings · 14 interested buyers</small></div><button id="addListingButton">＋ Add new listing</button></div><div class="property-grid">${listings.map(p=>`<article class="property-card"><img class="property-image" src="${p.image}" alt="${p.title}"><div class="property-body"><span class="stage">${p.status}</span><strong>${p.title}</strong><span>${p.location}</span><div class="property-meta"><b>${p.price}</b><span>${p.type}</span></div></div></article>`).join("")}</div>`;
}

function pipelinePage() {
  const cols=[['Qualified',[['New demo buyer',state.profile.Budget],['Zainab Bello','₦80m']]],['Viewing booked',[['Tunde Adebayo','₦150m'],['Nneka Eze','₦95m']]],['Offer',[['Ada Williams','₦180m']]],['Documents',[['David Okafor','₦220m']]]];
  return `<div class="kanban">${cols.map(col=>`<div class="kanban-col"><h3>${col[0]} <span>${col[1].length}</span></h3>${col[1].map(deal=>`<div class="deal-card"><strong>${deal[0]}</strong><small>${deal[1]} · ${state.market}</small></div>`).join("")}</div>`).join("")}</div>`;
}

function managementPage() {
  return `<div class="metric-grid"><article class="metric"><small>Median first reply</small><strong>3m</strong><span>Within team target</span></article><article class="metric"><small>Enquiry to viewing</small><strong>31%</strong><span>Up 6% this month</span></article><article class="metric"><small>Overdue actions</small><strong>2</strong><span>Needs manager attention</span></article><article class="metric"><small>Closed value</small><strong>₦285m</strong><span>This month</span></article></div><div class="progress-wrap" style="margin-top:16px"><section class="chart-card"><div class="panel-head"><h3>Lead source performance</h3><button>Last 30 days</button></div><div class="bars">${[['WhatsApp',88],['Website',62],['Instagram',73],['Referral',52],['Portal',44]].map(x=>`<div class="bar" style="height:${x[1]}%"><span>${x[0]}</span></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><h3>Agent activity</h3><button>Full report</button></div>${[['Amaka Okoro','14 active leads','5 viewings'],['Femi Adeyemi','11 active leads','3 viewings'],['Tola Yusuf','8 active leads','2 viewings']].map(x=>`<div class="lead-row"><span class="avatar">${initials(x[0])}</span><div><strong>${x[0]}</strong><small>${x[1]}</small></div><span class="stage">${x[2]}</span></div>`).join('')}</section></div>`;
}

function genericPage(page) {
  if(page==='inbox') return `<div class="work-grid"><section class="panel"><div class="panel-head"><h3>All conversations</h3><button>Filter by channel</button></div>${[['Adaeze Nwosu','WhatsApp','Looking for a three bedroom apartment in Lekki','Now'],['Kemi Williams','Website','Requested the Ikoyi investment brochure','4m'],['Tunde Adebayo','Instagram','Can inspect Olive Court this afternoon','18m'],['Nneka Eze','Referral','Needs a payment plan for Cedar Grove','31m']].map((x,i)=>`<div class="lead-row"><span class="avatar">${initials(x[0])}</span><div><strong>${x[0]} · ${x[1]}</strong><small>${x[2]}</small></div><span class="stage ${i===0?'hot':''}">${x[3]}</span></div>`).join('')}</section><section class="panel"><div class="panel-head"><h3>Conversation intelligence</h3></div><div class="attention-item"><span>HIGH INTENT</span><strong>Adaeze shared budget, location and decision timeline.</strong><small>Suggested action: assign the Lekki adviser and offer two matching properties.</small></div><div class="detail-grid"><div><small>Open</small><strong>7</strong></div><div><small>Within target</small><strong>86%</strong></div><div><small>Need human</small><strong>3</strong></div></div></section></div>`;
  if(page==='viewings') return `<div class="page-table"><div class="table-head"><span>BUYER</span><span>PROPERTY</span><span>TYPE</span><span>TIME</span><span>OWNER</span><span>STATUS</span></div>${[['New demo buyer','Meridian Residences',state.profile.Viewing,'Sat 10:00','Amaka','Requested'],['Tunde Adebayo','Olive Court','Physical','Today 11:00','Amaka','Confirmed'],['Nneka Eze','Cedar Grove','Physical','Sat 09:30','Femi','Pending']].map(x=>`<div class="table-row">${x.map((v,i)=>i===0?`<strong>${v}</strong>`:`<span>${v}</span>`).join('')}</div>`).join('')}</div>`;
  if(page==='followups') return `<div class="work-grid"><section class="panel"><div class="panel-head"><h3>Due today</h3><button>Sort by urgency</button></div>${sampleLeads.slice(1).map(x=>`<div class="lead-row"><span class="avatar">${initials(x[0])}</span><div><strong>${x[0]}</strong><small>${x[2]} · Last contact yesterday</small></div><span class="stage ${x[5]==='Overdue'?'hot':''}">${x[5]}</span></div>`).join('')}</section><section class="panel"><div class="panel-head"><h3>Follow up promise</h3></div><div class="attention-item"><span>WHY THIS MATTERS</span><strong>No promising buyer disappears inside chat history.</strong><small>Each lead has an owner, reason, due time, and visible next action.</small></div></section></div>`;
  if(page==='diaspora') return `<div class="metric-grid"><article class="metric"><small>Remote buyers</small><strong>7</strong><span>Across 4 countries</span></article><article class="metric"><small>Virtual tours</small><strong>3</strong><span>2 awaiting confirmation</span></article><article class="metric"><small>Due diligence</small><strong>4</strong><span>1 needs a document</span></article><article class="metric"><small>Next update due</small><strong>2h</strong><span>UK buyer waiting</span></article></div><div class="work-grid"><section class="panel"><div class="panel-head"><h3>Diaspora buyer desk</h3><button>View all</button></div><div class="lead-row"><span class="avatar">KW</span><div><strong>Kemi Williams · United Kingdom</strong><small>₦180m · Ikoyi · Virtual tour completed</small></div><span class="stage hot">Title review</span></div><div class="lead-row"><span class="avatar">CE</span><div><strong>Chuka Eze · Canada</strong><small>₦130m · Lekki · Virtual tour requested</small></div><span class="stage">Confirm time</span></div></section><section class="panel"><div class="panel-head"><h3>Document progress</h3></div>${['Offer letter received','Identity verified','Title search in progress','Payment milestone pending'].map((x,i)=>`<div class="lead-row"><span class="avatar">${i<2?'✓':i+1}</span><div><strong>${x}</strong><small>${i<2?'Completed':'Visible to buyer and team'}</small></div></div>`).join('')}</section></div>`;
  if(page==='documents') return `<div class="metric-grid"><article class="metric"><small>Active deal rooms</small><strong>4</strong><span>₦470m combined value</span></article><article class="metric"><small>Documents pending</small><strong>6</strong><span>2 blocking progress</span></article><article class="metric"><small>Title reviews</small><strong>3</strong><span>1 completes today</span></article><article class="metric"><small>Payment milestones</small><strong>2</strong><span>Awaiting confirmation</span></article></div><div class="page-table" style="margin-top:16px"><div class="table-head"><span>DEAL</span><span>BUYER</span><span>DOCUMENT</span><span>STATUS</span><span>OWNER</span><span>DUE</span></div>${[['Olive Court','Tunde Adebayo','Offer letter','Signed','Amaka','Complete'],['The Pavilion','David Okafor','Title search','In review','Legal','Today'],['Harbour View','Kemi Williams','Identity check','Received','Amaka','Complete'],['Cedar Grove','Nneka Eze','Payment plan','Awaiting buyer','Femi','Tomorrow']].map(x=>`<div class="table-row">${x.map((v,i)=>i===0?`<strong>${v}</strong>`:`<span>${v}</span>`).join('')}</div>`).join('')}</div>`;
  return pipelinePage();
}

function renderWorkspace(page) {
  const titles={today:['MONDAY, 8 SEPTEMBER','Good morning, Amaka'],inbox:['UNIFIED CONVERSATIONS','Every enquiry in one place'],leads:['SALES PIPELINE','Every buyer has a next action'],properties:['LISTING PORTFOLIO','Manage properties and buyer interest'],viewings:['VIEWING OPERATIONS','Keep every appointment moving'],pipeline:['DEAL PIPELINE','See where opportunities are slowing'],followups:['FOLLOW UP QUEUE','Protect every promised next action'],documents:['DEAL DOCUMENTS','Keep every requirement visible'],diaspora:['REMOTE BUYER OPERATIONS','Build trust across distance'],management:['EXECUTIVE ANALYTICS','See the work behind every result']};
  $("#pageEyebrow").textContent=titles[page][0];$("#pageTitle").textContent=titles[page][1];
  $$('.sidebar [data-page]').forEach(button=>button.classList.toggle('active',button.dataset.page===page));
  const content=page==='today'?todayPage():page==='leads'?leadsPage():page==='properties'?propertiesPage():page==='pipeline'?pipelinePage():page==='management'?managementPage():genericPage(page);
  $("#workspaceContent").innerHTML=content;
  $$('[data-page-link]').forEach(button=>button.addEventListener('click',()=>renderWorkspace(button.dataset.pageLink)));
  $("#addListingButton")?.addEventListener("click", openListingModal);
  $$('[data-lead]').forEach(row => {
    const open = () => openLeadDrawer(decodeURIComponent(row.dataset.lead));
    row.addEventListener('click', open);
    row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') open(); });
  });
}

function renderWebsite() {
  $("#sitePropertyGrid").innerHTML = listings.slice(0, 6).map(property => `<article class="site-property"><img src="${property.image}" alt="${property.title}"><div class="site-property-copy"><small>${property.location.toUpperCase()}</small><h4>${property.title}</h4><div class="site-property-meta"><strong>${property.price}</strong><span>${property.type}</span></div></div></article>`).join("");
}

function openListingModal() {
  $("#listingModal").classList.remove("hidden");
}

function closeListingModal() {
  $("#listingModal").classList.add("hidden");
}

$("#closeListing").addEventListener("click", closeListingModal);
$("#saveDraft").addEventListener("click", () => {
  closeListingModal();
  toast("Listing saved as a private draft.");
});

let listingImageData = "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=1200";
$("#listingImage").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    listingImageData = String(reader.result || "");
    $("#imagePreview").style.backgroundImage = `url(${listingImageData})`;
    $("#imagePreview").classList.add("has-image");
    $("#uploadPath").textContent = `selected_uploads/${file.name}`;
  };
  reader.readAsDataURL(file);
});

$("#listingForm").addEventListener("submit", event => {
  event.preventDefault();
  listings.unshift({
    title: $("#listingTitle").value.trim(),
    location: $("#listingLocation").value.trim(),
    price: $("#listingPrice").value.trim(),
    type: `${$("#listingBeds").value} ${$("#listingType").value.toLowerCase()}`,
    status: "Just published",
    image: listingImageData
  });
  closeListingModal();
  renderWebsite();
  renderWorkspace("properties");
  toast("The new listing is live in the portfolio and website preview.");
});

$("#websiteLeadForm").addEventListener("submit", event => {
  event.preventDefault();
  state.profile.Buyer = $("#webLeadName").value.trim();
  state.profile.Phone = $("#webLeadPhone").value.trim();
  state.profile.Email = $("#webLeadEmail").value.trim();
  state.profile.Purpose = $("#webLeadInterest").value;
  state.profile.Location = $("#webLeadLocation").value;
  state.profile.Budget = $("#webLeadBudget").value;
  state.profile.Property = $("#webLeadType").value;
  state.profile.Timeline = $("#webLeadTimeline").value;
  $("#workspaceBadge").textContent = "3";
  toast("Website enquiry captured in the unified team inbox.");
  event.target.reset();
});

$("#browseHomes").addEventListener("click", () => $("#siteListings").scrollIntoView({behavior:"smooth"}));
$("#siteWhatsApp").addEventListener("click", () => switchView("buyer"));

$$('.sidebar [data-page]').forEach(button=>button.addEventListener('click',()=>renderWorkspace(button.dataset.page)));
$(".mobile-menu").addEventListener("click", () => $(".workspace-shell").classList.toggle("menu-open"));
$$('.sidebar [data-page]').forEach(button => button.addEventListener('click', () => $(".workspace-shell").classList.remove("menu-open")));
show("landing");

const leadRecords = {
  "Tunde Adebayo": {phone:"0802 440 1182",email:"tunde.adebayo@example.com",budget:"₦150m",location:"Ikoyi",property:"3 bedroom apartment",timeline:"This month",message:"Can we inspect Olive Court this afternoon?"},
  "Nneka Eze": {phone:"0806 321 7720",email:"nneka.eze@example.com",budget:"₦95m",location:"Lekki",property:"3 bedroom apartment",timeline:"1 to 3 months",message:"Does Cedar Grove have a payment plan?"},
  "David Okafor": {phone:"0704 882 1910",email:"david.okafor@example.com",budget:"₦220m",location:"Victoria Island",property:"4 bedroom terrace",timeline:"Within 30 days",message:"Please send the title documents for review."},
  "Zainab Bello": {phone:"0811 920 4418",email:"zainab.bello@example.com",budget:"₦80m",location:"Lekki",property:"2 bedroom apartment",timeline:"Still exploring",message:"I would like to compare the available options."},
  "Chidi Nwosu": {phone:"0903 552 8814",email:"chidi.nwosu@example.com",budget:"₦130m",location:"Ikoyi",property:"3 bedroom apartment",timeline:"Within 30 days",message:"I am still waiting for the updated Ikoyi options."}
};

function leadRecord(name) {
  if (leadRecords[name]) return leadRecords[name];
  return {
    phone: state.profile.Phone === "Not captured" ? "0803 555 0147" : state.profile.Phone,
    email: state.profile.Email === "Not captured" ? "adaeze.nwosu@example.com" : state.profile.Email,
    budget: state.profile.Budget === "Not captured" ? "₦120m to ₦180m" : state.profile.Budget,
    location: state.profile.Location === "Not captured" ? "Lekki" : state.profile.Location,
    property: state.profile.Property === "Not captured" ? "3 bedroom apartment" : state.profile.Property,
    timeline: state.profile.Timeline === "Not captured" ? "Within 30 days" : state.profile.Timeline,
    message: state.profile.Viewing === "Not captured" ? "I would prefer a physical viewing this Saturday." : `I would prefer a ${state.profile.Viewing.toLowerCase()} this Saturday.`
  };
}

function openLeadDrawer(name) {
  const record = leadRecord(name);
  $("#leadDrawerTitle").textContent = name;
  $("#leadContact").innerHTML = `<div><small>PHONE</small><strong>${record.phone}</strong></div><div><small>EMAIL</small><strong>${record.email}</strong></div><div><small>OWNER</small><strong>Amaka Okoro</strong></div>`;
  $("#drawerRequirements").innerHTML = [["Budget",record.budget],["Location",record.location],["Property",record.property],["Timeline",record.timeline]].map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join("");
  $("#drawerMatches").innerHTML = listings.slice(0,2).map(property=>`<article class="drawer-match"><img src="${property.image}" alt="${property.title}"><div><strong>${property.title}</strong><small>${property.location} · ${property.price}</small></div></article>`).join("");
  $("#drawerLastMessage").textContent = record.message;
  $("#leadDrawer").classList.remove("hidden");
}

function closeLeadDrawer() { $("#leadDrawer").classList.add("hidden"); }
$("#closeLeadDrawer").addEventListener("click", closeLeadDrawer);
$("#closeLeadDrawerButton").addEventListener("click", closeLeadDrawer);
$("#assignLead").addEventListener("click", () => toast("Lead assigned to Amaka Okoro."));
$("#scheduleViewing").addEventListener("click", () => toast("Saturday viewing held for confirmation."));

function startHumanTakeover() {
  state.takeover = true;
  closeLeadDrawer();
  switchView("buyer");
  $("#phoneStatus").textContent = "Amaka is handling this conversation";
  if (!$(".takeover-banner")) {
    const banner = document.createElement("div");
    banner.className = "takeover-banner";
    banner.innerHTML = '<i></i><strong>Human takeover active</strong><span>Amaka can see the full buyer context</span><button id="returnAssistant">Return assistant</button>';
    $(".security-note").after(banner);
    $("#returnAssistant").addEventListener("click", resetChat);
  }
  const buyerName = state.profile.Buyer === "Not captured" ? "Adaeze" : state.profile.Buyer.split(" ")[0];
  bubble(`Good afternoon, ${buyerName}. I’m Amaka from ${state.agency}. I can take it from here. Would Saturday morning or afternoon work better for the viewing?`, "staff");
  $("#quickReplies").innerHTML = '<div class="human-composer"><input id="humanReply" value="Saturday morning works for me." aria-label="Reply as buyer"><button id="sendHumanReply" aria-label="Send reply">→</button></div>';
  $("#sendHumanReply").addEventListener("click", () => {
    const value = $("#humanReply").value.trim();
    if (!value) return;
    bubble(value, "buyer");
    $("#humanReply").value = "";
    toast("Reply added to the shared conversation.");
  });
}

$("#takeOverConversation").addEventListener("click", startHumanTakeover);

