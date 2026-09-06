const b=$json.body??$json;const s=k=>String(b[k]??'').trim();
const action=s('action')||'chat',message=s('message'),session_id=(s('session_id')||`demo-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
const base={action,message,session_id,enquiry_id:s('enquiry_id'),contact_id:s('contact_id'),service_slug:s('service_slug'),service_name:s('service_name'),service_price:s('service_price'),full_name:s('full_name'),phone:s('phone'),email:s('email').toLowerCase(),date:s('date'),time:s('time')};
let history=[];try{history=JSON.parse(String(b.history??'[]'));if(!Array.isArray(history))history=[]}catch{history=[]}base.history=history;
let api_url,payload;
if(action==='chat'){api_url='https://shftukueyostzbyqxmqw.supabase.co/functions/v1/favfare-demo-assistant';payload={action:'chat',message,session_id,history,context:{service_slug:base.service_slug||null,service_name:base.service_name||null,selected_date:base.date||null,selected_time:base.time||null,full_name:base.full_name||null,phone:base.phone||null,email:base.email||null}}}
else if(action==='start_booking'||action==='browse_services'){api_url=$env.FAVFARE_DATA_GATEWAY_URL;payload={action:'catalogue'}}
else if(action==='service_selected'){api_url=$env.FAVFARE_DATA_GATEWAY_URL;payload={action:'quote_and_capture',service_slug:base.service_slug,message:message||`I am interested in ${base.service_name}`,full_name:'WhatsApp Patient',whatsapp_id:`favfare-${session_id}`,session_id}}
else if(action==='capture_name'||action==='capture_phone'){api_url='https://shftukueyostzbyqxmqw.supabase.co/functions/v1/favfare-demo-assistant';payload={action:'noop'}}
else if(action==='capture_email'){api_url='https://shftukueyostzbyqxmqw.supabase.co/functions/v1/favfare-demo-booking-intake';payload={contact_id:base.contact_id,full_name:base.full_name,phone:base.phone,email:base.email,session_id}}
else if(action==='calendar'||action==='change_time'){api_url=$env.FAVFARE_DATA_GATEWAY_URL;payload={action:'availability_window',days:14}}
else if(action==='confirm_booking'){api_url=$env.FAVFARE_DATA_GATEWAY_URL;payload={action:'request_booking',enquiry_id:base.enquiry_id,preferred_date:base.date,preferred_time:base.time,session_id}}
else{api_url='https://shftukueyostzbyqxmqw.supabase.co/functions/v1/favfare-demo-assistant';payload={action:'noop'}}
return[{json:{...base,api_url,payload}}];
