// [SECTION] DATE FORMATTING UTILITIES
/** 
 * [INFO] Formats a Date object into a 'YYYY-MM-DD' string based on local server time.
 * [FLOW] Used for database queries and frontend display where timezone-agnostic dates are required.
 */
export const toLocalDateString = (dateObj) => {
  if (!dateObj) return "";
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  if (Number.isNaN(d.getTime())) return "";
  
  // Shift to UTC+8 to retrieve local date components reliably
  const localTime = new Date(d.getTime() + (8 * 60 * 60 * 1000));
  const yyyy = localTime.getUTCFullYear();
  const mm = String(localTime.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(localTime.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// [SECTION] DATE & TIME MANIPULATION
/** 
 * [INFO] Combines a calendar date (Date or string) with a time string ("HH:MM") into a Date object representation of local time in UTC+8.
 * [LOGIC] 
 * 1. Sanitizes input to extract a local YYYY-MM-DD string.
 * 2. Appends the time string to create a datetime string parsed in UTC+8.
 * 3. Returns a Date object representing the time slot shifted from UTC+8 to UTC.
 */
export const combineDateAndTime = (dateValue, timeValue) => {
  if (!dateValue) return null;
  const safeTime = timeValue || "09:00";

  let yyyy, mm, dd;
  if (typeof dateValue === 'string') {
    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      yyyy = parseInt(match[1], 10);
      mm = parseInt(match[2], 10) - 1;
      dd = parseInt(match[3], 10);
    }
  }

  if (yyyy === undefined) {
    const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(d.getTime())) return null;
    const localTime = new Date(d.getTime() + (8 * 60 * 60 * 1000));
    yyyy = localTime.getUTCFullYear();
    mm = localTime.getUTCMonth();
    dd = localTime.getUTCDate();
  }

  const [hours, minutes] = safeTime.split(":").map(Number);
  // Construct the Date in UTC, shifting from UTC+8
  return new Date(Date.UTC(yyyy, mm, dd, hours - 8, minutes));
};

/** 
 * [INFO] Calculates the precise end of a local day (23:59:59.999) in UTC+8.
 * [FLOW] Used for range-based booking queries to include the entire final day.
 */
export const endOfLocalDay = (dateValue) => {
  if (!dateValue) return null;

  let yyyy, mm, dd;
  if (typeof dateValue === 'string') {
    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      yyyy = parseInt(match[1], 10);
      mm = parseInt(match[2], 10) - 1;
      dd = parseInt(match[3], 10);
    }
  }

  if (yyyy === undefined) {
    const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(d.getTime())) return null;
    const localTime = new Date(d.getTime() + (8 * 60 * 60 * 1000));
    yyyy = localTime.getUTCFullYear();
    mm = localTime.getUTCMonth();
    dd = localTime.getUTCDate();
  }

  // 23:59:59.999 in UTC+8 is 15:59:59.999 in UTC
  return new Date(Date.UTC(yyyy, mm, dd, 15, 59, 59, 999));
};

/** 
 * [INFO] Parses shop operating hours string "HH:MM-HH:MM" to minutes since midnight. 
 * [LOGIC] Uses regex validation to ensure the input format is strictly HH:MM-HH:MM.
 */
export const parseOperatingHours = (ohString) => {
  if (!ohString || typeof ohString !== "string") return null;
  const trimmed = ohString.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const openMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  const closeMinutes = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);
  if (openMinutes < 0 || closeMinutes > 24 * 60) return null;
  return { openMinutes, closeMinutes };
};

/** 
 * [INFO] Determines if two time intervals on the same calendar day overlap.
 * [LOGIC] 
 * 1. Short-circuits FALSE if the dates are different.
 * 2. Returns TRUE if (Start1 < End2) AND (End1 > Start2).
 */
export const doTimeSlotsOverlap = (slot1Start, slot1End, slot2Start, slot2End) => {
  // Get calendar dates (YYYY-MM-DD)
  const slot1Date = toLocalDateString(slot1Start);
  const slot2Date = toLocalDateString(slot2Start);

  // Different dates = no time conflict possible
  if (slot1Date !== slot2Date) return false;

  // Same date - check time overlap
  return slot1Start < slot2End && slot1End > slot2Start;
};
