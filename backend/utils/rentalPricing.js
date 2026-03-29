// [SECTION] PRICING CONSTANTS
const DAY_IN_MS = 24 * 60 * 60 * 1000;

// [SECTION] DATE HELPER FUNCTIONS
/** 
 * [INFO] Sanitizes a date to local midnight (00:00:00.000).
 * [LOGIC] Extracts Year, Month, Day from a Date object to create a fresh local instance.
 */
const toLocalMidnight = (dateValue) => {
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// [SECTION] PRICING CALCULATIONS
/** 
 * [INFO] Calculates the number of days between two dates, inclusive.
 * [LOGIC] 
 * 1. Resets both dates to local midnight.
 * 2. Calculates difference in milliseconds and converts to days.
 * 3. Adds 1 to include both start and end dates (e.g., Fri-Sun = 3 days).
 */
export const daysInclusiveLocal = (startDate, endDate) => {
  const s = toLocalMidnight(startDate);
  const e = toLocalMidnight(endDate);
  if (!s || !e) return 0;
  const diffDays = Math.round((e.getTime() - s.getTime()) / DAY_IN_MS);
  return Math.max(1, diffDays + 1);
};

/** 
 * [INFO] Retrieves the penalty fee for exceeding the standard rental period.
 * [FLOW] Defaults to ₱50 if the `EXTRA_DAY_FEE` environment variable is missing or invalid.
 */
export const getExtraDayFee = () => {
  const raw = process.env.EXTRA_DAY_FEE;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 50;
};

/** 
 * [INFO] Main algorithm for calculating total rental cost.
 * [LOGIC] 
 * 1. Counts total days in the reservation.
 * 2. Standard 3-day rental is included in the base price.
 * 3. Applies `extraDayFee` for every day beyond the initial 3.
 */
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

