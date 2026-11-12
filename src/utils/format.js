export const peso = (n, { sign = false } = {}) => {
  const value = Number(n) || 0;
  const abs = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const prefix = value < 0 ? '-' : sign && value > 0 ? '+' : '';
  return `${prefix}₱${abs}`;
};

export const km = (n) => `${(Number(n) || 0).toFixed(1)} km`;

export const pad = (n) => String(n).padStart(2, '0');

export const clock = (totalSeconds) => `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;

export const makeTripId = () => `#RO-${Math.floor(1000 + Math.random() * 9000)}`;

export const shortDateTime = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
};
