import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const N8N_URL = String(process.env.N8N_URL ?? '').replace(/\/$/, '');
const N8N_API_KEY = String(process.env.N8N_API_KEY ?? '');
const SYNC_ONLY = new Set(String(process.env.SYNC_ONLY ?? '').split('|').map((s) => s.trim()).filter(Boolean));
if (!N8N_URL) throw new Error('N8N_URL is required');
if (!N8N_API_KEY) throw new Error('N8N_API_KEY is required');

async function api(endpoint, { method = 'GET', body } = {}) {
  const res = await fetch(`${N8N_URL}/api/v1${endpoint}`, {
    method,
    headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${endpoint} failed (${res.status}): ${typeof data === 'string' ? data.slice(0,400) : JSON.stringify(data).slice(0,400)}`);
  return data;
}

function writableWorkflow(spec) {
  return { name: spec.name, nodes: spec.nodes, connections: spec.connections ?? {}, settings: spec.settings ?? {} };
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

async function syncWorkflow(spec) {
  const list = await api('/workflows?limit=100');
  const current = (list?.data ?? []).find((w) => w.name === spec.name);
  let saved;

  if (current) {
    const before = await api(`/workflows/${current.id}`);
    if (before.active) {
      await api(`/workflows/${current.id}/deactivate`, { method: 'POST' });
      console.log(`DEACTIVATED_FOR_UPDATE ${spec.name} ${current.id}`);
    }
    saved = await api(`/workflows/${current.id}`, { method: 'PUT', body: writableWorkflow(spec) });
    console.log(`UPDATED ${spec.name} ${current.id}`);
  } else {
    saved = await api('/workflows', { method: 'POST', body: writableWorkflow(spec) });
    console.log(`CREATED ${spec.name} ${saved.id}`);
  }

  const id = saved?.id ?? current?.id;
  if (!id) throw new Error(`No workflow ID returned for ${spec.name}`);

  if (spec.active !== false) {
    const refreshed = await api(`/workflows/${id}`);
    if (!refreshed.active) {
      await api(`/workflows/${id}/activate`, { method: 'POST' });
      console.log(`ACTIVATED ${spec.name} ${id}`);
    } else {
      console.log(`ALREADY_ACTIVE ${spec.name} ${id}`);
    }
  }
}

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
console.log(`SYNC_COMPLETE count=${count}${SYNC_ONLY.size ? ' filtered=true' : ''}`);
