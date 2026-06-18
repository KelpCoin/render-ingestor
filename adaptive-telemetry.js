// adaptive-telemetry.js
// Mutation telemetry + profit basin tracking layer
// Pure observability: no pricing decisions, only measurement + classification

const BASINS = {
  HIGH: 'high',
  MID: 'mid',
  DECAY: 'decay'
};

function classifyBasin({ marginPct }) {
  if (marginPct >= 0.35) return BASINS.HIGH;
  if (marginPct >= 0.15) return BASINS.MID;
  return BASINS.DECAY;
}

function calcMarginPct(beforePrice, afterPrice) {
  if (!beforePrice || beforePrice <= 0) return 0;
  return (afterPrice - beforePrice) / beforePrice;
}

async function logMutationEvent(supabase, payload) {
  // payload: { sku_id, before_price, after_price, status, rate, action }
  const marginPct = calcMarginPct(payload.before_price, payload.after_price);
  const basin = classifyBasin({ marginPct });

  const event = {
    sku_id: payload.sku_id,
    before_price: payload.before_price,
    after_price: payload.after_price,
    status: payload.status,
    mutation_rate: payload.rate,
    action: payload.action,
    margin_pct: marginPct,
    basin: basin,
    created_at: new Date().toISOString()
  };

  await supabase
    .from('mutation_events')
    .insert([event]);

  return event;
}

async function getPortfolioSignal(supabase) {
  const { data } = await supabase
    .from('mutation_events')
    .select('basin');

  if (!data || data.length === 0) {
    return { high: 0, mid: 0, decay: 0, health: 'unknown' };
  }

  const counts = { high: 0, mid: 0, decay: 0 };

  for (const e of data) {
    if (counts[e.basin] !== undefined) counts[e.basin]++;
  }

  const total = data.length;
  const healthScore = counts.high / total;

  let health = 'unstable';
  if (healthScore > 0.6) health = 'strong';
  else if (healthScore > 0.3) health = 'moderate';

  return {
    ...counts,
    total,
    health
  };
}

module.exports = {
  logMutationEvent,
  getPortfolioSignal,
  classifyBasin
};
