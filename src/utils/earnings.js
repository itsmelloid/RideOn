// Summaries for the rider Earnings screen, calculated from trip rows in the database.
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

export const PERIOD_START = { Daily: startOfToday, Weekly: () => daysAgo(7), Monthly: () => daysAgo(30) };

export const summarize = (rows, period) => {
  const from = PERIOD_START[period]();
  const done = rows.filter((r) => r.status === 'completed' && new Date(r.created_at) >= from);
  const sum = (list, key) => Math.round(list.reduce((a, r) => a + Number(r[key] || 0), 0) * 100) / 100;
  const byStatus = (s) => sum(done.filter((r) => r.commission_status === s), 'commission');
  return {
    share: sum(done, 'rider_share'),
    rides: done.length,
    fares: sum(done, 'fare'),
    commission: sum(done, 'commission'),
    paid: byStatus('paid'),
    pending: byStatus('pending'),
    disputed: byStatus('disputed'),
  };
};
