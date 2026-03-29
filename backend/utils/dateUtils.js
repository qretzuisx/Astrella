// [SECTION] DATE FORMATTING UTILITIES
/** 
 * [INFO] Formats a Date object into a 'YYYY-MM-DD' string based on local server time.
 * [FLOW] Used for database queries and frontend display where timezone-agnostic dates are required.
 */
export const toLocalDateString = (dateObj) => {
  if (!dateObj) return "";
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// [SECTION] DATE & TIME MANIPULATION
/** 
 * [INFO] Combines a calendar date (Date or string) with a time string ("HH:MM") into a local Date object.
 * [LOGIC] 
 * 1. Sanitizes input to extract a local YYYY-MM-DD string.
 * 2. Appends the time string to create an ISO-like local datetime.
 * 3. Returns a Date object parsed as local time to avoid UTC shifts.
 */
export const combineDateAndTime = (dateValue, timeValue) => {
  if (!dateValue) return null;

  // IMPORTANT: Avoid using toISOString() here.
  // toISOString() converts to UTC and can shift the date backward/forward depending on timezone.
  const safeTime = timeValue || "09:00";

  // Accept either Date or string and extract the local calendar date (YYYY-MM-DD)
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const localDate = `${yyyy}-${mm}-${dd}`;

  // Create an ISO-like local datetime string and let JS parse it as local time.
  const dateTimeString = `${localDate}T${safeTime}`;
  return new Date(dateTimeString);
};

/** 
 * [INFO] Calculates the precise end of a local day (23:59:59.999). 
 * [FLOW] Used for range-based booking queries to include the entire final day.
 */
export const endOfLocalDay = (dateValue) => {
  if (!dateValue) return null;
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
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
