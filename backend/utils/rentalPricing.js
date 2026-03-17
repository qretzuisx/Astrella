const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toLocalMidnight = (dateValue) => {
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const daysInclusiveLocal = (startDate, endDate) => {
  const s = toLocalMidnight(startDate);
  const e = toLocalMidnight(endDate);
  if (!s || !e) return 0;
  const diffDays = Math.round((e.getTime() - s.getTime()) / DAY_IN_MS);
  return Math.max(1, diffDays + 1);
};

export const getExtraDayFee = () => {
  const raw = process.env.EXTRA_DAY_FEE;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 50;
};

export const computeReservationPricing = ({ basePrice, pickupDate, returnDate }) => {
  const price = Number(basePrice) || 0;
  const totalReservedDays = daysInclusiveLocal(pickupDate, returnDate);
  const includedDays = 3;
  const extraDayFee = getExtraDayFee();
  const extraDays = Math.max(0, totalReservedDays - includedDays);
  const total = price + extraDays * extraDayFee;

  return {
    basePrice: price,
    totalReservedDays,
    includedDays,
    extraDays,
    extraDayFee,
    total,
  };
};

