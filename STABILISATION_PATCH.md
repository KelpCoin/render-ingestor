ATOMIC LOOP STABILISATION PATCH

1. Frontend fetch invariant

async function loadListings() {
  const res = await fetch('/api/listings?ts=' + Date.now(), {
    cache: 'no-store'
  });
  return await res.json();
}

2. Cache disabling middleware

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

3. Truth endpoint

app.get('/api/truth', async (req, res) => {
  const { data: listings } = await supabase.from('listings').select('*');
  const { data: last } = await supabase
    .from('margin_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  res.json({
    listing_count: listings?.length || 0,
    last_sale: last?.[0]?.created_at || null,
    sample_listing: listings?.[0] || null,
    server_time: new Date().toISOString()
  });
});

4. Health loop

setInterval(async () => {
  try {
    const { data } = await supabase
      .from('margin_events')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      console.log('NO EVENTS DETECTED');
    }
  } catch (e) {
    console.error('HEALTH CHECK FAILED', e.message);
  }
}, 30000);

5. System rule
Stripe -> Supabase -> API -> UI must remain single source of truth
