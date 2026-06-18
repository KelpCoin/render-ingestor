const { createClient } = require('@supabase/supabase-js');
const { applyAdaptiveMutation } = require('./adaptive-mutation');
const { logMutationEvent, getPortfolioSignal } = require('./adaptive-telemetry');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function recomputePortfolio() {
  try {
    const { data } = await supabase.from('listings').select('*');
    if (!data) return;

    const action = Math.random() > 0.5 ? 'increase' : 'decrease';

    for (const sku of data) {
      if (sku.status === 'locked') continue;

      const before_price = sku.price;

      await applyAdaptiveMutation(supabase, sku, action);

      const after_price = sku.price;

      await logMutationEvent(supabase, {
        sku_id: sku.id,
        before_price,
        after_price,
        status: sku.status,
        rate: sku.status === 'exploring' ? 0.05 : 0.02,
        action
      });
    }

    const signal = await getPortfolioSignal(supabase);
    console.log('[PORTFOLIO SIGNAL]', signal);

  } catch (err) {
    console.error('RECOMPUTE ERROR', err);
  }
}

setInterval(recomputePortfolio, 60000);

console.log('Portfolio loop running');