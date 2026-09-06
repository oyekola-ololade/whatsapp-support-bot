import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const N8N_URL = String(process.env.N8N_URL ?? '').replace(/\/$/, '');
const N8N_API_KEY = String(process.env.N8N_API_KEY ?? '');
const N8N_EMAIL = String(process.env.N8N_EMAIL ?? '');
const N8N_PASSWORD = String(process.env.N8N_PASSWORD ?? '');
const SYNC_ONLY = new Set(String(process.env.SYNC_ONLY ?? '').split('|').map((s) => s.trim()).filter(Boolean));
if (!N8N_URL) throw new Error('N8N_URL is required');

let mode = 'public';
let sessionCookie = '';
const browserId = crypto.randomUUID();

function parse(text) {
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

function unwrap(data) {
  return data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'data') ? data.data : data;
}

async function publicApi(endpoint, { method = 'GET', body, allowError = false } = {}) {
  const res = await fetch(`${N8N_URL}/api/v1${endpoint}`, {
    method,
    headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = parse(await res.text());
  if (!res.ok && !allowError) throw new Error(`${method} ${endpoint} failed (${res.status}): ${typeof data === 'string' ? data.slice(0,400) : JSON.stringify(data).slice(0,400)}`);
  return { ok: res.ok, status: res.status, data };
}

async function loginSession() {
  if (!N8N_EMAIL || !N8N_PASSWORD) throw new Error('n8n API key is unauthorized and owner credentials are unavailable');
  const res = await fetch(`${N8N_URL}/rest/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'browser-id': browserId },
    body: JSON.stringify({ emailOrLdapLoginId: N8N_EMAIL, password: N8N_PASSWORD }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Owner session login failed (${res.status}): ${text.slice(0,400)}`);
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
  sessionCookie = cookies.map((c) => String(c).split(';')[0]).join('; ');
  if (!sessionCookie) throw new Error('Owner session login succeeded but no auth cookie was returned');
  mode = 'rest';
  console.log('AUTH_FALLBACK owner-session');
}

async function restApi(endpoint, { method = 'GET', body } = {}) {
  const res = await fetch(`${N8N_URL}/rest${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Cookie: sessionCookie, 'browser-id': browserId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = parse(await res.text());
  if (!res.ok) throw new Error(`${method} /rest${endpoint} failed (${res.status}): ${typeof data === 'string' ? data.slice(0,500) : JSON.stringify(data).slice(0,500)}`);
  return unwrap(data);
}

async function ensureAuth() {
  if (N8N_API_KEY) {
    const probe = await publicApi('/workflows?limit=1', { allowError: true });
    if (probe.ok) {
      mode = 'public';
      console.log('AUTH_MODE public-api');
      return;
    }
    console.log(`PUBLIC_API_UNAVAILABLE status=${probe.status}`);
  }
  await loginSession();
}

function writableWorkflow(spec) {
  return { name: spec.name, nodes: spec.nodes, connections: spec.connections ?? {}, settings: spec.settings ?? {} };
}

function workflowList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function hydrateWorkflow(spec, here) {
  const htmlFile = spec?.controller?.embed_html_file;
  if (htmlFile) {
    let html = await fs.readFile(path.join(here, htmlFile), 'utf8');

    if (spec.name === 'Favfare Demo — CRM UI V2') {
      const mobileCss = await fs.readFile(path.join(here, 'ui/crm-mobile.css'), 'utf8');
      const anchor = html.lastIndexOf('</style>');
      if (anchor < 0) throw new Error(`No style anchor found in ${spec.name}`);
      html = html.slice(0, anchor) + `\n${mobileCss}\n` + html.slice(anchor);
    }

    let injected = false;
    for (const node of spec.nodes ?? []) {
      if (node?.parameters?.responseBody === '__FAVFARE_EMBED_HTML__') {
        node.parameters.responseBody = html;
        injected = true;
      }
    }
    if (!injected) throw new Error(`No HTML placeholder found in ${spec.name}`);
  }

  if (spec.name === 'Favfare Demo — Patient Simulator') {
    const mobileCss = await fs.readFile(path.join(here, 'ui/patient-mobile.css'), 'utf8');
    const node = (spec.nodes ?? []).find((n) => n?.name === 'Render Initial Conversation');
    if (!node?.parameters?.jsCode) throw new Error(`Patient simulator render node not found in ${spec.name}`);
    const anchor = '</style></head>';
    if (!node.parameters.jsCode.includes(anchor)) throw new Error(`No patient style anchor found in ${spec.name}`);
    node.parameters.jsCode = node.parameters.jsCode.replace(anchor, `\n${mobileCss}\n${anchor}`);
  }

  const codeFiles = spec?.controller?.embed_code_files ?? {};
  for (const [nodeName, file] of Object.entries(codeFiles)) {
    const node = (spec.nodes ?? []).find((n) => n?.name === nodeName);
    if (!node) throw new Error(`Code target node not found: ${nodeName} in ${spec.name}`);
    if (!node.parameters) node.parameters = {};
    node.parameters.jsCode = await fs.readFile(path.join(here, String(file)), 'utf8');
  }
  return spec;
}

async function syncPublic(spec) {
  const list = (await publicApi('/workflows?limit=100')).data;
  const current = (list?.data ?? []).find((w) => w.name === spec.name);
  let saved;
  if (current) {
    const before = (await publicApi(`/workflows/${current.id}`)).data;
    if (before.active) {
      await publicApi(`/workflows/${current.id}/deactivate`, { method: 'POST' });
      console.log(`DEACTIVATED_FOR_UPDATE ${spec.name} ${current.id}`);
    }
    saved = (await publicApi(`/workflows/${current.id}`, { method: 'PUT', body: writableWorkflow(spec) })).data;
    console.log(`UPDATED ${spec.name} ${current.id}`);
  } else {
    saved = (await publicApi('/workflows', { method: 'POST', body: writableWorkflow(spec) })).data;
    console.log(`CREATED ${spec.name} ${saved.id}`);
  }
  const id = saved?.id ?? current?.id;
  if (!id) throw new Error(`No workflow ID returned for ${spec.name}`);
  if (spec.active !== false) {
    const refreshed = (await publicApi(`/workflows/${id}`)).data;
    if (!refreshed.active) {
      await publicApi(`/workflows/${id}/activate`, { method: 'POST' });
      console.log(`ACTIVATED ${spec.name} ${id}`);
    } else console.log(`ALREADY_ACTIVE ${spec.name} ${id}`);
  }
}

async function syncRest(spec) {
  const list = workflowList(await restApi('/workflows'));
  const current = list.find((w) => w.name === spec.name);
  let saved;
  if (current) {
    const before = await restApi(`/workflows/${current.id}`);
    if (before.active) {
      await restApi(`/workflows/${current.id}/deactivate`, { method: 'POST' });
      console.log(`DEACTIVATED_FOR_UPDATE ${spec.name} ${current.id}`);
    }
    saved = await restApi(`/workflows/${current.id}`, { method: 'PATCH', body: { ...writableWorkflow(spec), versionId: before.versionId } });
    console.log(`UPDATED ${spec.name} ${current.id}`);
  } else {
    saved = await restApi('/workflows', { method: 'POST', body: { ...writableWorkflow(spec), active: false } });
    console.log(`CREATED ${spec.name} ${saved.id}`);
  }
  const id = saved?.id ?? current?.id;
  if (!id) throw new Error(`No workflow ID returned for ${spec.name}`);
  if (spec.active !== false) {
    const refreshed = await restApi(`/workflows/${id}`);
    if (!refreshed.active) {
      await restApi(`/workflows/${id}/activate`, { method: 'POST', body: { versionId: refreshed.versionId } });
      console.log(`ACTIVATED ${spec.name} ${id}`);
    } else console.log(`ALREADY_ACTIVE ${spec.name} ${id}`);
  }
}

async function syncWorkflow(spec) {
  if (mode === 'rest') return syncRest(spec);
  return syncPublic(spec);
}

await ensureAuth();
const here = path.dirname(fileURLToPath(import.meta.url));
const workflowDir = path.join(here, 'workflows');
const files = (await fs.readdir(workflowDir)).filter((f) => f.endsWith('.json')).sort();
let count = 0;
for (const file of files) {
  const raw = await fs.readFile(path.join(workflowDir, file), 'utf8');
  const spec = JSON.parse(raw);
  if (SYNC_ONLY.size && !SYNC_ONLY.has(spec.name)) continue;
  await syncWorkflow(await hydrateWorkflow(spec, here));
  count += 1;
}
console.log(`SYNC_COMPLETE count=${count}${SYNC_ONLY.size ? ' filtered=true' : ''} auth=${mode}`);
