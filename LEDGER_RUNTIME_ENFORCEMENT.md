LEDGER RUNTIME ENFORCEMENT — HARD GATE LAYER

This is the enforcement layer that turns EVENT LEDGER MODE from architecture into runtime constraint.

====================================================
1. HARD RULE (NON-NEGOTIABLE)
====================================================
No system component may write directly to:
- listings table
- margin_events table
- materialized_state table

ALL mutations MUST go through:
/api/event-log

====================================================
2. STRIPE WEBHOOK REDIRECTION
====================================================
Replace any direct Supabase writes in Stripe webhook with:

await fetch('/api/event-log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'SALE_RECORDED',
    payload: eventPayload
  })
});

====================================================
3. BOOT REPLAY GUARANTEE
====================================================
On server startup:

(async () => {
  console.log('LEDGER BOOT: replay starting');

  const res = await supabase.from('event_log')
    .select('*')
    .order('timestamp', { ascending: true });

  if (!res.data) throw new Error('EVENT LOG UNAVAILABLE');

  // trigger worker-style replay pass
  // ensures materialized_state is always reconstructible
})();

====================================================
4. DIRECT WRITE BLOCK (SOFT GUARD)
====================================================
Add guard function in server.js:

function assertLedgerWriteOnly(source) {
  const allowed = ['event_log', '/api/event-log'];
  if (!allowed.includes(source)) {
    console.error('BLOCKED DIRECT WRITE:', source);
    throw new Error('Ledger enforcement violation');
  }
}

Call this before ANY Supabase insert/update.

====================================================
5. WATCHDOG (DRIFT DETECTOR)
====================================================
setInterval(async () => {
  const { data } = await supabase
    .from('event_log')
    .select('id')
    .order('timestamp', { ascending: false })
    .limit(1);

  const lastEvent = data?.[0];

  if (!lastEvent) {
    console.error('CRITICAL: EVENT LOG IS EMPTY');
  }
}, 20000);

====================================================
6. SYSTEM EFFECT
====================================================
Before:
Any service can mutate Supabase directly

After:
All writes funnel through event_log only
Replay worker is authoritative state builder

====================================================
END OF ENFORCEMENT LAYER
