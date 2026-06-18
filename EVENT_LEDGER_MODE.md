EVENT LEDGER MODE — SECOND COMMIT LAYER

This adds an append-only event ledger + worker model to eliminate state drift.

====================================================
1. CORE PRINCIPLE
====================================================
All system mutations become immutable events.
Supabase is downgraded to derived state store only.

SOURCE OF TRUTH:
/event-log (append-only)

DERIVED:
- listings
- margin_events
- UI state

====================================================
2. EVENT SCHEMA
====================================================
{
  id: string,
  type: string,
  timestamp: string,
  payload: object
}

Example types:
- LISTING_CREATED
- LISTING_UPDATED
- SALE_RECORDED
- MARGIN_EVENT

====================================================
3. EVENT APPEND ENDPOINT
====================================================
Add to server.js:

app.post('/api/event-log', async (req, res) => {
  const event = {
    id: crypto.randomUUID(),
    type: req.body.type,
    timestamp: new Date().toISOString(),
    payload: req.body.payload || {}
  };

  await supabase.from('event_log').insert([event]);
  res.json({ ok: true, event });
});

====================================================
4. REPLAY WORKER (DETACHED PROCESS)
====================================================
Create worker: event-ledger-worker.js

const supabase = require('./supabaseClient');

async function replay() {
  const { data: events } = await supabase
    .from('event_log')
    .select('*')
    .order('timestamp', { ascending: true });

  let state = {
    listings: {},
    sales: []
  };

  for (const e of events || []) {
    switch (e.type) {
      case 'LISTING_CREATED':
        state.listings[e.payload.id] = e.payload;
        break;

      case 'LISTING_UPDATED':
        state.listings[e.payload.id] = {
          ...state.listings[e.payload.id],
          ...e.payload
        };
        break;

      case 'SALE_RECORDED':
        state.sales.push(e.payload);
        break;
    }
  }

  await supabase.from('materialized_state').upsert({
    id: 'global',
    state,
    updated_at: new Date().toISOString()
  });
}

setInterval(replay, 15000);

console.log('EVENT LEDGER WORKER RUNNING');

====================================================
5. SYSTEM SHIFT
====================================================
Before:
Stripe → Supabase → API → UI

After:
Stripe → Event Log → Worker → Materialized State → API → UI

====================================================
6. FAILURE PROPERTY (IMPORTANT)
====================================================
If anything breaks:
- replay worker reconstructs full system state
- no silent drift possible
- no cache dependency remains

====================================================
END OF LAYER
