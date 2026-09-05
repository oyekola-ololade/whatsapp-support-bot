import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const N8N_URL = String(process.env.N8N_URL ?? '').replace(/\/$/, '');
const N8N_API_KEY = String(process.env.N8N_API_KEY ?? '');

if (!N8N_URL) throw new Error('N8N_URL is required');
if (!N8N_API_KEY) throw new Error('N8N_API_KEY is required');

async function api(endpoint, { method = 'GET', body } = {}) {
  const res = await fetch(`${N8N_URL}/api/v1${endpoint}`, {
    method,
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    throw new Error(`${method} ${endpoint} failed (${res.status}): ${typeof data === 'string' ? data.slice(0, 400) : JSON.stringify(data).slice(0, 400)}`);
  }
  return data;
}

function writableWorkflow(spec) {
  return {
    name: spec.name,
    nodes: spec.nodes,
    connections: spec.connections ?? {},
    settings: spec.settings ?? {},
  };
}

async function syncWorkflow(spec) {
  const list = await api('/workflows?limit=100');
  const current = (list?.data ?? []).find((w) => w.name === spec.name);
  let saved;

  if (current) {
    saved = await api(`/workflows/${current.id}`, {
      method: 'PUT',
      body: writableWorkflow(spec),
    });
    console.log(`UPDATED ${spec.name} ${current.id}`);
  } else {
    saved = await api('/workflows', {
      method: 'POST',
      body: writableWorkflow(spec),
    });
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

for (const file of files) {
  const raw = await fs.readFile(path.join(workflowDir, file), 'utf8');
  const spec = JSON.parse(raw);
  await syncWorkflow(spec);
}

console.log(`SYNC_COMPLETE count=${files.length}`);
