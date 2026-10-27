// Fare model shared by the passenger and rider flows. The prototype calculates fares on the device;
// in production the server must calculate and sign the fare (see README "Going to production").
export const FARE = { base: 15, includedKm: 2, perKm: 1.6, commissionRate: 0.1 };

const round2 = (n) => Math.round(n * 100) / 100;

export const calculateFare = (distanceKm) => {
  const extraKm = Math.max(0, distanceKm - FARE.includedKm);
  const distanceCharge = round2(extraKm * FARE.perKm);
  const total = round2(FARE.base + distanceCharge);
  const commission = round2(total * FARE.commissionRate);
  return { base: FARE.base, distanceCharge, total, commission, riderShare: round2(total - commission) };
};
