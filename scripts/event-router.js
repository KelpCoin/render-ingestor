// Cortex Event Router - minimal deterministic spine
// Routes events from GitHub, Stripe, Render into a single file-based ledger
// Idempotent + offline-first

const fs = require('fs');
const path = require('path');

const ROOT = process.env.CORTEX_ROOT || path.join(process.cwd(), '.cortex');
const LEDGER = path.join(ROOT, 'event-ledger.jsonl');
const STATE = path.join(ROOT, 'state.json');

function ensureDirs() {
  if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });
  if (!fs.existsSync(LEDGER)) fs.writeFileSync(LEDGER, '');
  if (!fs.existsSync(STATE)) fs.writeFileSync(STATE, JSON.stringify({ version: 1 }, null, 2));
}

function now() {
  return new Date().toISOString();
}

function appendEvent(event) {
  ensureDirs();
  const line = JSON.stringify({ ts: now(), ...event });
  fs.appendFileSync(LEDGER, line + "\n");
}

function loadState() {
  ensureDirs();
  try {
    return JSON.parse(fs.readFileSync(STATE, 'utf-8'));
  } catch (e) {
    return { version: 1 };
  }
}

function saveState(state) {
  ensureDirs();
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
}

function handleGitHubPush(payload) {
  const event = {
    type: 'github.push',
    repo: payload?.repository?.full_name,
    commit: payload?.after,
  };
  appendEvent(event);
  return event;
}

function handleStripeEvent(payload) {
  const event = {
    type: 'stripe.event',
    event: payload?.type,
    id: payload?.id,
  };
  appendEvent(event);
  return event;
}

function handleRenderEvent(payload) {
  const event = {
    type: 'render.event',
    service: payload?.service,
    status: payload?.status,
  };
  appendEvent(event);
  return event;
}

// main router entry
function route(source, payload) {
  let event;

  switch (source) {
    case 'github':
      event = handleGitHubPush(payload);
      break;
    case 'stripe':
      event = handleStripeEvent(payload);
      break;
    case 'render':
      event = handleRenderEvent(payload);
      break;
    default:
      event = { type: 'unknown', source };
      appendEvent(event);
  }

  const state = loadState();
  state.last_event = event;
  state.last_updated = now();
  saveState(state);

  return event;
}

module.exports = {
  route,
  appendEvent,
  loadState,
  saveState,
};

// CLI usage
if (require.main === module) {
  const [source, json] = process.argv.slice(2);
  const payload = json ? JSON.parse(json) : {};
  console.log(route(source, payload));
}
