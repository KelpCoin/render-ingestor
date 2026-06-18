// adaptive-mutation.js
// Darwinian mutation policy: locked = freeze, exploring = high mutation, dormant = periodic boost

const MUTATION_RATES = {
  locked: 0,           // 0% movement — profit basin frozen
  exploring: 0.05,     // 5% per cycle — aggressive discovery
  dormant: 0.02        // 2% when awakened — gentle re‑entry
};

const BOOST_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
const DORMANT_AWAKEN_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days idle → boost

function getMutationRate(sku, now = Date.now()) {
  if (sku.status === 'locked') return MUTATION_RATES.locked;
  if (sku.status === 'dormant') {
    const dormantDuration = now - new Date(sku.updated_at).getTime();
    if (dormantDuration > DORMANT_AWAKEN_THRESHOLD) {
      // Wake up dormant SKU with a gentle boost
      return MUTATION_RATES.dormant;
    }
    return 0;
  }
  // exploring
  return MUTATION_RATES.exploring;
}

async function applyAdaptiveMutation(supabase, sku, globalAction) {
  const now = Date.now();
  const rate = getMutationRate(sku, now);
  if (rate === 0) return; // frozen

  const direction = globalAction === 'increase' ? 1 : -1;
  const delta = rate * direction;
  const newPrice = Math.max(0.50, sku.price * (1 + delta));

  await supabase
    .from('listings')
    .update({ price: newPrice })
    .eq('id', sku.id);
}

module.exports = { applyAdaptiveMutation };