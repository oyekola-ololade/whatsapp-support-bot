const b = $json.body ?? $json;
const str = (k) => String(b[k] ?? '').trim();

const action = str('action') || 'chat';
const message = str('message');
const sessionId = (str('session_id') || `demo-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
const enquiryId = str('enquiry_id');
const contactId = str('contact_id');
const serviceSlug = str('service_slug');
const serviceName = str('service_name');
const servicePrice = str('service_price');
const fullName = str('full_name');
const phone = str('phone');
const email = str('email').toLowerCase();
const date = str('date');
const time = str('time');
let history = [];
try { history = JSON.parse(String(b.history ?? '[]')); if (!Array.isArray(history)) history = []; } catch { history = []; }

let api_url;
let payload;
if (action === 'chat') {
  api_url = 'https://shftukueyostzbyqxmqw.supabase.co/functions/v1/favfare-demo-assistant';
  payload = { action:'chat', message, session_id:sessionId, history, context:{ service_slug:serviceSlug||null, service_name:serviceName||null, selected_date:date||null, selected_time:time||null, full_name:fullName||null, phone:phone||null, email:email||null } };
} else if (action === 'start_booking' || action === 'browse_services') {
  api_url = $env.FAVFARE_DATA_GATEWAY_URL;
  payload = { action:'catalogue' };
} else if (action === 'service_selected') {
  api_url = $env.FAVFARE_DATA_GATEWAY_URL;
  payload = { action:'quote_and_capture', service_slug:serviceSlug, message:message||`I am interested in ${serviceName}`, full_name:'WhatsApp Patient', whatsapp_id:`favfare-${sessionId}`, session_id:sessionId };
} else if (action === 'capture_details') {
  api_url = 'https://shftukueyostzbyqxmqw.supabase.co/functions/v1/favfare-demo-booking-intake';
  payload = { contact_id:contactId, full_name:fullName, phone, email, session_id:sessionId };
} else if (action === 'calendar') {
  api_url = $env.FAVFARE_DATA_GATEWAY_URL;
  payload = { action:'availability_window', days:14 };
} else if (action === 'request_booking') {
  api_url = $env.FAVFARE_DATA_GATEWAY_URL;
  payload = { action:'request_booking', enquiry_id:enquiryId, preferred_date:date, preferred_time:time, session_id:sessionId };
} else {
  api_url = 'https://shftukueyostzbyqxmqw.supabase.co/functions/v1/favfare-demo-assistant';
  payload = { action:'noop' };
}

return [{json:{ action,message,session_id:sessionId,enquiry_id:enquiryId,contact_id:contactId,service_slug:serviceSlug,service_name:serviceName,service_price:servicePrice,full_name:fullName,phone,email,date,time,history,api_url,payload }}];
