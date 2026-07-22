import Booking from "../models/booking.js";
import Gown from "../models/Gown.js";
import User from "../models/User.js";
import imageKit from "../configs/imagekit.js";
import { computeReservationPricing } from "../utils/rentalPricing.js";
import { 
  toLocalDateString, 
  combineDateAndTime, 
  endOfLocalDay, 
  parseOperatingHours, 
  doTimeSlotsOverlap 
} from "../utils/dateUtils.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const DEFAULT_OPEN = 9 * 60;
const DEFAULT_CLOSE = 19 * 60;

const isWithinBusinessHours = (timeValue, shopHours = null) => {
  if (!timeValue) return false;
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return false;
  const totalMinutes = hours * 60 + minutes;
  const minMinutes = shopHours ? shopHours.openMinutes : DEFAULT_OPEN;
  const maxMinutes = shopHours ? shopHours.closeMinutes : DEFAULT_CLOSE;
  return totalMinutes >= minMinutes && totalMinutes <= maxMinutes && minutes % 15 === 0;
};

// Helper: Extract time in minutes since midnight for comparison (avoids timezone issues)

// Helper: Check if a single date falls within a booking's pickup-to-return date RANGE
// (ignoring time-of-day). Used to detect when a trial is scheduled during a multi-day reservation.
const isDateWithinBookingRange = (dateObj, bookingStart, bookingEnd) => {
  const dateStr = toLocalDateString(dateObj);
  const startStr = toLocalDateString(bookingStart);
  const endStr = toLocalDateString(bookingEnd);
  return dateStr >= startStr && dateStr <= endStr;
};

/**
 * [INFO] Retrieves all dates blocked by laundry/maintenance for a specific gown.
 * [LOGIC] 
 * 1. Finds all non-canceled bookings for the gown.
 * 2. For each reservation, adds X 'laundryDays' following the return date to a blocked set.
 */
const getLaundryDates = async (gownId, laundryDays) => {
    if (!laundryDays || laundryDays <= 0) return new Set();
    const laundryDateSet = new Set();
    const now = new Date();
    const Bookings = await Booking.find({
        gown: gownId,
        status: { $nin: ["canceled", "expired"] },
    });

    Bookings.forEach((booking) => {
        // [INFO] Trials do not trigger laundry cycles.
        if (booking.status === 'trial' || booking.bookingType === 'trial') return;
        const returnStr = toLocalDateString(new Date(booking.returnDate));
        const baseDate = new Date(returnStr + "T12:00:00Z");
        for (let i = 1; i <= laundryDays; i++) {
            const laundryDate = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
            laundryDateSet.add(toLocalDateString(laundryDate));
        }
    });
    return laundryDateSet;
};

// Helper function to check if a date range overlaps with any blocked dates (bookings or laundry days)
const dateRangeOverlapsBlocked = (startDate, endDate, blockedDateSet) => {
  const startStr = toLocalDateString(startDate);
  const endStr = toLocalDateString(endDate);

  let cur = new Date(startStr + "T12:00:00Z");
  const endLimit = new Date(endStr + "T12:00:00Z");

  while (cur <= endLimit) {
    if (blockedDateSet.has(toLocalDateString(cur))) return true;
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
  }
  return false;
};

/**
 * [INFO] CORE AVAILABILITY ENGINE
 * [LOGIC] Checks if a gown is available for a specific date/time range.
 * 1. Checks for exact time slot overlaps (Same-day turnarounds).
 * 2. For multi-day rentals, blocks the entire range [Pickup -> Return + Laundry].
 */
export const checkAvailability = async (gown, pickupDate, returnDate, options = {}) => {
    const start = pickupDate instanceof Date ? pickupDate : new Date(pickupDate);
    const end = returnDate instanceof Date ? returnDate : new Date(returnDate);
    const isTrial = options.isTrial || false;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const Bookings = await Booking.find({
        gown,
        status: { $nin: ["canceled", "expired"] },
        returnDate: { $gte: today }
    });
    // [INFO] overdue bookings are still active (gown is out) and must block availability

    const gownData = options.gownData || await Gown.findById(gown).select('laundryDays statusOverride');
    
    // [LOGIC] Check for manual status override (highest priority)
    // Any status other than 'Available' (or empty/null) blocks all new bookings.
    if (gownData?.statusOverride && gownData.statusOverride !== 'Available') {
      return false;
    }

    const laundryBuffer = Number(gownData?.laundryDays || options.laundryDays || 0);

    for (const existingBooking of Bookings) {
        const isExistingTrial = existingBooking.status === 'trial' || existingBooking.bookingType === 'trial';
        const existingStart = new Date(existingBooking.pickupDate);
        const existingEnd = new Date(existingBooking.returnDate);

        // [LOGIC] Conflict 1: Time-slot overlap
        if (doTimeSlotsOverlap(start, end, existingStart, existingEnd)) return false;

        // [LOGIC] Conflict 2: Multi-day range overlap
        if (!isTrial || !isExistingTrial) {
            const reqLaundry = isTrial ? 0 : laundryBuffer;
            const reqStartStr = toLocalDateString(start);
            const reqEndWithLaundry = new Date(end);
            reqEndWithLaundry.setDate(reqEndWithLaundry.getDate() + reqLaundry);
            const reqEndStr = toLocalDateString(reqEndWithLaundry);

            const existingLaundry = isExistingTrial ? 0 : laundryBuffer;
            const bStartStr = toLocalDateString(existingStart);
            const bEndWithLaundry = new Date(existingEnd);
            bEndWithLaundry.setDate(bEndWithLaundry.getDate() + existingLaundry);
            const bEndStr = toLocalDateString(bEndWithLaundry);

            if (reqStartStr <= bEndStr && reqEndStr >= bStartStr) return false;
        }
    }
    return true;
};

// [SECTION] BOOKING CREATION API
/**
 * [INFO] Main entry point for customers to reserve a gown or schedule a trial.
 * [FLOW]
 * 1. Validates inputs and operating hours.
 * 2. Checks availability (logic in `checkAvailability`).
 * 3. Calculates pricing using `rentalPricing.js`.
 * 4. Handles GCash screenshot uploads via ImageKit.
 * 5. Creates the Booking record and populates details for the response.
 */
export const createBooking = async (req, res) => {
    try {
        const { _id } = req.user;
        const { gown, pickupDate, returnDate, pickupTime, returnTime, bookingType } = req.body;
        
        let measurements = {};
        let paymentInfo = {};
        try {
            measurements = typeof req.body.measurements === 'string' ? JSON.parse(req.body.measurements) : (req.body.measurements || {});
            paymentInfo = typeof req.body.payment === 'string' ? JSON.parse(req.body.payment) : (req.body.payment || {});
        } catch (e) {
            return res.status(400).json({ success: false, message: "Invalid JSON format" });
        }

        const isTrial = (bookingType || paymentInfo.bookingType || 'reservation').toString().toLowerCase() === 'trial';

        // [LOGIC] Block booking creation if user has outstanding penalties
        const outstandingCount = await Booking.countDocuments({
            user: _id,
            'penalties': { $elemMatch: { status: 'outstanding' } }
        });
        if (outstandingCount > 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'You have outstanding penalty charges. Please settle them before making a new booking.',
                hasOutstandingPenalties: true
            });
        }
        
        // [LOGIC] Setup normalized dates/times
        const pickupDateTime = combineDateAndTime(pickupDate, pickupTime);
        let returnDateTime = isTrial ? new Date(pickupDateTime.getTime() + 30 * 60 * 1000) : endOfLocalDay(returnDate);

        // [VALIDATION] Availability check
        const gownData = await Gown.findById(gown).populate("owner", "shopProfile");
        const isAvailable = await checkAvailability(gown, pickupDateTime, returnDateTime, { laundryDays: isTrial ? 0 : gownData.laundryDays, isTrial });
        if (!isAvailable) return res.status(400).json({ success: false, message: "Dates are already reserved." });

        // [LOGIC] Pricing & Payment
        const pricing = isTrial ? { total: 0 } : computeReservationPricing({ basePrice: gownData.price, pickupDate: pickupDateTime, returnDate: returnDateTime });
        
        let screenshotUrl = '';
        if (!isTrial && paymentInfo.method === 'gcash' && req.file) {
            const uploadResponse = await imageKit.upload({
                file: (req.file.buffer || (await import('fs')).readFileSync(req.file.path)).toString('base64'),
                fileName: `payment_${_id}_${Date.now()}`,
                folder: '/payment_screenshots'
            });
            screenshotUrl = uploadResponse.url;
            if (req.file.path) (await import('fs')).unlinkSync(req.file.path);
        }

        // [FLOW] Save to Database
         const newBooking = await Booking.create({
            gown, owner: gownData.owner, user: _id,
            pickupDate: pickupDateTime, returnDate: returnDateTime,
            pickupTime, returnTime, price: pricing.total,
            bookingType: isTrial ? 'trial' : 'reservation',
            contactNumber: req.body.contactNumber || req.user.contactNumber || '',
            payment: {
                method: paymentInfo.method || 'gcash',
                depositAmount: isTrial ? 0 : Math.round(pricing.total * 0.5),
                totalAmount: pricing.total,
                screenshot: screenshotUrl,
                status: 'pending',
                transactionRef: paymentInfo.transactionRef || ''
            },
            status: isTrial ? 'trial' : 'pending'
        });

        const populated = await Booking.findById(newBooking._id).populate('gown owner user');
        res.json({ success: true, message: "Booking Created", booking: populated });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};


/**
 * [INFO] Pre-booking validation for the frontend calendar.
 * [LOGIC] 
 * 1. Checks if the requested time is within shop operating hours.
 * 2. Validates that the pickup date is not in the past.
 * 3. Identifies and returns specific conflicting bookings and laundry dates.
 */
export const validateBookingWindow = async (req, res) => {
  try {
    const { gownId, pickupDate, returnDate, pickupTime, returnTime, bookingType, excludeBookingId } = req.body;
    // Treat as trial when bookingType is 'trial' or when return date is omitted (trial only sends pickup date + time)
    const isTrial = (String(bookingType || '').toLowerCase() === 'trial') || (!returnDate && pickupDate && pickupTime);
    const effectiveReturnDate = isTrial ? pickupDate : returnDate;
    const effectiveReturnTime = returnTime || pickupTime;

    if (!gownId || !pickupDate || !pickupTime) {
      return res.status(400).json({ success: false, message: isTrial ? "Please select a trial date and pickup time." : "Please select pickup and return dates and a pickup time." });
    }
    if (!isTrial && !returnDate) {
      return res.status(400).json({ success: false, message: "Please select a return date for your reservation." });
    }

    const gownDoc = await Gown.findById(gownId).populate("owner", "shopProfile");
    if (!gownDoc) {
      return res.status(404).json({ success: false, message: "Gown not found" });
    }
    const ownerDoc = gownDoc.owner?.shopProfile ? gownDoc.owner : await User.findById(gownDoc.owner).select("shopProfile");
    const shopHours = parseOperatingHours(ownerDoc?.shopProfile?.operatingHours) || { openMinutes: DEFAULT_OPEN, closeMinutes: DEFAULT_CLOSE };

    if (!isWithinBusinessHours(pickupTime, shopHours) || !isWithinBusinessHours(effectiveReturnTime, shopHours)) {
      return res.status(400).json({ success: false, message: "Times must be within the shop's operating hours and in 15-minute increments." });
    }

    const pickupDateTime = combineDateAndTime(pickupDate, pickupTime);
    let returnDateTime = combineDateAndTime(effectiveReturnDate, effectiveReturnTime);

    if (isTrial) {
      returnDateTime = new Date(pickupDateTime.getTime() + 30 * 60 * 1000); // 30 minutes after pickup for trials
    }

    // For trials, return must be strictly after pickup (appointment has duration).
    // For reservations, return can equal pickup (same-day bookings allowed).
    if (returnDateTime < pickupDateTime) {
      return res.status(400).json({ success: false, message: "Return time cannot be earlier than pickup time." });
    }

    const now = new Date();
    if (pickupDateTime < now) {
      return res.status(400).json({ success: false, message: "Pickup date and time cannot be in the past." });
    }
    if (returnDateTime < now) {
      return res.status(400).json({ success: false, message: "Return date and time cannot be in the past." });
    }

    const gown = await Gown.findById(gownId).select('laundryDays statusOverride name');
    if (!gown) {
      return res.status(404).json({ success: false, message: "Gown not found" });
    }

    // [LOGIC] Check for manual status override (highest priority)
    if (gown.statusOverride && gown.statusOverride !== 'Available') {
      return res.status(400).json({ 
        success: false, 
        available: false,
        message: `This apparel is currently marked as '${gown.statusOverride}' by the boutique owner and is not available for new bookings at this time.`,
        statusOverride: gown.statusOverride
      });
    }

    const laundryDays = (String(bookingType || '').toLowerCase() === 'trial') ? 0 : Number(gown.laundryDays || 0);

    // Build query to exclude the current booking when rescheduling/extending
    const query = {
      gown: gownId,
      status: { $nin: ["canceled", "expired"] }
    };

    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }

    const Bookings = await Booking.find(query)
      .populate("user", "name")
      .populate("gown", "name");

    const laundryBuffer = Number(gown.laundryDays || 0);
    const conflictingDates = [];
    let hasTimeConflict = false;
    let timeConflict = null;

    // Unified Conflict Detection Loop
    for (const existing of Bookings) {
      const isExistingTrial = existing.status === 'trial' || existing.bookingType === 'trial';
      const existingStart = new Date(existing.pickupDate);
      let existingEnd = new Date(existing.returnDate);

      // [LOGIC] If booking is overdue (gown not returned), extend blocked range to today
      if (existing.status === 'overdue') {
        const today = new Date();
        if (today > existingEnd) {
          existingEnd = today;
        }
      }

      // Check for laundry days of EXISTING reservation
      const existingLaundry = isExistingTrial ? 0 : Number(gown.laundryDays || 0);
      const existingBlockedEnd = new Date(existingEnd);
      existingBlockedEnd.setDate(existingBlockedEnd.getDate() + existingLaundry);

      let conflictFound = false;

      // 1. Time-slot overlap (Same day handovers)
      if (doTimeSlotsOverlap(pickupDateTime, returnDateTime, existingStart, existingEnd)) {
        conflictFound = true;
      }
      // 2. Range overlap if either is a Reservation
      else if (!isTrial || !isExistingTrial) {
        // Effective range for Request
        const reqLaundry = isTrial ? 0 : laundryBuffer;
        const s1 = toLocalDateString(pickupDateTime);
        const e1_date = new Date(returnDateTime);
        e1_date.setDate(e1_date.getDate() + reqLaundry);
        const e1 = toLocalDateString(e1_date);

        // Effective range for Existing
        const s2 = toLocalDateString(existingStart);
        const e2 = toLocalDateString(existingBlockedEnd);

        if (s1 <= e2 && e1 >= s2) {
          conflictFound = true;
        }
      }

      if (conflictFound) {
        conflictingDates.push(toLocalDateString(existingStart));
        hasTimeConflict = true;
        timeConflict = existing;
      }
    }

    if (conflictingDates.length > 0) {
      // Find which Booking caused the conflict
      const conflict = timeConflict || Bookings.find((existing) => {
        const existingStart = new Date(existing.pickupDate);
        const existingEnd = new Date(existing.returnDate);
        // Check if dates overlap
        return (pickupDateTime <= existingEnd && returnDateTime >= existingStart);
      });

      // Check if conflict is due to laundry day
      const isLaundryConflict = conflictingDates.some(dateStr => {
        return Bookings.some(b => {
          const isOtherTrial = b.status === 'trial' || b.bookingType === 'trial';
          if (isOtherTrial) return false;
          
          const bEnd = new Date(b.returnDate);
          for (let i = 1; i <= Number(gown.laundryDays || 0); i++) {
            const laundryDate = new Date(bEnd);
            laundryDate.setDate(laundryDate.getDate() + i);
            if (toLocalDateString(laundryDate) === dateStr) return true;
          }
          return false;
        });
      });

      return res.json({
        success: true,
        available: false,
        message: isLaundryConflict
          ? "Apparel is not yet returned on one or more of your selected dates. Laundry/maintenance days are fully blocked and cannot be booked."
          : "This gown is already reserved during your selected dates.",
        conflict: conflict ? {
          pickupDate: conflict.pickupDate,
          returnDate: conflict.returnDate,
          pickupTime: conflict.pickupTime,
          returnTime: conflict.returnTime,
          laundryDays: laundryDays,
        } : null,
        conflictingDates: conflictingDates,
      });
    }

    return res.json({ success: true, available: true, message: "Available for selected dates" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// [SECTION] BOOKING RETRIEVAL
/**
 * [INFO] Retrieves all active and past bookings for the logged-in customer.
 * [LOGIC] Filters out expired trial holds to keep the personal "My Bookings" view clean.
 */
export const getUserBooking = async (req, res) => {
    try {
        const { _id } = req.user;
        const now = new Date();
        const allBookings = await Booking.find({ user: _id })
            .populate('gown', 'name image eventType')
            .populate('owner', 'name contactNumber shopProfile')
            .sort({ createdAt: -1 })
            .lean();

        const Bookings = allBookings;

        res.json({ success: true, bookings: Bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * [INFO] Retrieves all bookings for a boutique owner's dashboard.
 */
export const getOwnerBooking = async (req, res) => {
    try {
        if (req.user.role !== 'owner') return res.status(403).json({ success: false, message: "Unauthorized" });
        const now = new Date();

        // [FEATURE] Month/Year filter — default to current month if not provided
        const { month, year } = req.body || {};
        const filterYear = year != null ? Number(year) : now.getFullYear();
        let monthStart, monthEnd;
        if (month === null || month === undefined || month === -1 || month === 'all') {
            // Whole year range
            monthStart = new Date(Date.UTC(filterYear, 0, 1, -8, 0, 0));
            monthEnd = new Date(Date.UTC(filterYear + 1, 0, 1, -8, 0, 0));
        } else {
            const filterMonth = Number(month);
            monthStart = new Date(Date.UTC(filterYear, filterMonth, 1, -8, 0, 0));
            monthEnd = new Date(Date.UTC(filterYear, filterMonth + 1, 1, -8, 0, 0));
        }

        const allBookings = await Booking.find({
            owner: req.user._id,
            $or: [
                { pickupDate: { $gte: monthStart, $lt: monthEnd } },
                { status: 'overdue' },
                { status: 'not_returned' },
                { status: 'confirmed', returnDate: { $lt: now } }
            ]
        })
            .populate('gown')
            .populate('user', 'name email contactNumber')
            .sort({ createdAt: -1 })
            .lean();

        // [FEATURE] Auto-detect overdue bookings (confirmed past return date → overdue)
        const bulkOps = [];
          
        const Bookings = allBookings
            .map(booking => {
                const b = booking; // No need for toObject() with lean()
                
                // [FIX] Force profile number to take top priority if it exists and booking level is blank/N/A
                const profileNumber = (b.user?.contactNumber || '').toString().trim();
                const currentNumber = (b.contactNumber || '').toString().trim();
                
                if (profileNumber && profileNumber !== 'N/A' && (currentNumber === '' || currentNumber === 'N/A')) {
                    b.contactNumber = profileNumber;
                }
                
                // If it's still missing, ensure it defaults to empty/blank rather than a hardcoded 'N/A' string in the data
                if (!b.contactNumber) b.contactNumber = '';

                // [LOGIC] Migrate old 'not_returned' state to 'overdue' on the fly
                if (b.status === 'not_returned') {
                    b.status = 'overdue';
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: b._id },
                            update: { $set: { status: 'overdue' } }
                        }
                    });
                }

                // [LOGIC] Auto-detect overdue: confirmed booking with past return date → overdue
                if (b.status === 'confirmed' && b.returnDate) {
                    const returnEnd = endOfLocalDay(b.returnDate);
                    if (returnEnd && now > returnEnd) {
                        b.status = 'overdue';
                        bulkOps.push({
                            updateOne: {
                                filter: { _id: b._id },
                                update: { $set: { status: 'overdue' } }
                            }
                        });
                    }
                }

                // [LOGIC] Compute overdue days for overdue bookings
                if (b.status === 'overdue' && b.returnDate) {
                    const returnDateObj = new Date(b.returnDate);
                    const returnDateStr = toLocalDateString(returnDateObj);
                    const nowDateStr = toLocalDateString(now);
                    // Calculate difference in days
                    const returnMs = new Date(returnDateStr + 'T00:00:00Z').getTime();
                    const nowMs = new Date(nowDateStr + 'T00:00:00Z').getTime();
                    b.overdueDays = Math.max(0, Math.floor((nowMs - returnMs) / DAY_IN_MS));
                }
                
                return b;
            });

        // Persist overdue status changes in bulk (non-blocking)
        if (bulkOps.length > 0) {
            Booking.bulkWrite(bulkOps).catch(err => console.error('[OVERDUE] Bulk status update error:', err));
        }

        res.json({ success: true, bookings: Bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// [SECTION] BOOKING STATUS MANAGEMENT
/**
 * [INFO] Allows owners to manually update booking states (Pending -> Confirmed -> Completed).
 * [LOGIC] 
 * 1. Records official pickup and return timestamps for boutique tracking.
 * 2. Status changes automatically influence dynamic gown availability.
 */
export const changeBookingStatus = async (req, res) => {
    try {
        const { _id } = req.user;
        const { bookingId, status } = req.body;

        const booking = await Booking.findById(bookingId);
        if (booking.owner.toString() !== _id.toString()) return res.status(403).json({ success: false, message: "Unauthorized" });

        if (status === 'confirmed' && !booking.pickupConfirmedAt) booking.pickupConfirmedAt = new Date();
        // [LOGIC] "Confirm Return" from overdue or confirmed → completed
        if (status === 'completed' && !booking.returnConfirmedAt) booking.returnConfirmedAt = new Date();

        booking.status = status;
        await booking.save();

        res.json({ success: true, message: "Status Updated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// [SECTION] PENALTY MANAGEMENT
/**
 * [INFO] Allows owners to apply penalties (late return, damage/repair, full replacement).
 * [LOGIC] 
 * 1. late_return: Auto-calculated at ₱50/day from returnDate vs now
 * 2. damage_repair: Custom amount specified by owner
 * 3. full_replacement: Auto-populated from gown.replacementCost, owner can adjust
 * 
 * Penalties are stacked (multiple per booking). Each has its own settlement status.
 * Outstanding penalties block customers from creating new bookings.
 */
export const applyPenalty = async (req, res) => {
    try {
        const { _id } = req.user;
        const { bookingId, penaltyType, amount, description, customOverdueDays } = req.body;

        if (req.user.role !== 'owner') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (!penaltyType || !['late_return', 'damage_repair', 'full_replacement'].includes(penaltyType)) {
            return res.status(400).json({ success: false, message: 'Invalid penalty type. Must be: late_return, damage_repair, or full_replacement.' });
        }

        const booking = await Booking.findById(bookingId).populate('gown', 'name image price replacementCost');
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        if (booking.owner.toString() !== _id.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // [LOGIC] Allow penalties on overdue, confirmed, and completed bookings
        if (!['overdue', 'confirmed', 'completed'].includes(booking.status)) {
            return res.status(400).json({ success: false, message: 'Penalties can only be applied to confirmed, overdue, or completed bookings.' });
        }

        const now = new Date();
        let penaltyData = {
            type: penaltyType,
            description: description || '',
            status: 'outstanding',
            appliedAt: now,
            appliedBy: _id
        };

        if (penaltyType === 'late_return') {
            // [LOGIC] Auto-calculate or allow custom late return penalty
            const scheduledReturn = combineDateAndTime(booking.returnDate, booking.returnTime || booking.pickupTime || '09:00');
            if (!scheduledReturn || now <= scheduledReturn) {
                return res.status(400).json({ success: false, message: 'This reservation is not overdue yet.' });
            }

            // [LOGIC] Check if late_return penalty already exists
            const existingLateReturn = (booking.penalties || []).find(p => p.type === 'late_return');
            if (existingLateReturn) {
                return res.status(400).json({ success: false, message: 'A late return penalty has already been applied to this booking.' });
            }

            const overdueMs = now.getTime() - scheduledReturn.getTime();
            const calcOverdueDays = Math.max(1, Math.ceil(overdueMs / DAY_IN_MS));
            const overdueDays = (customOverdueDays !== undefined && customOverdueDays !== null && customOverdueDays !== '')
                ? Math.max(0, parseInt(customOverdueDays, 10))
                : calcOverdueDays;
            const PENALTY_RATE = 50; // ₱50 per day

            const finalAmount = (amount !== undefined && amount !== null && amount !== '') ? Number(amount) : (overdueDays * PENALTY_RATE);

            penaltyData.amount = Math.max(0, finalAmount);
            penaltyData.overdueDays = overdueDays;
            penaltyData.ratePerDay = PENALTY_RATE;
            penaltyData.description = description || (overdueDays > 0 
                ? `Late return: ${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue at ₱${PENALTY_RATE}/day`
                : `Late return fee waived / adjusted by owner`);

            // [LOGIC] Also update the legacy penalty field for backward compatibility
            booking.penalty = {
                amount: penaltyData.amount,
                overdueDays,
                ratePerDay: PENALTY_RATE,
                isApplied: true,
                appliedAt: now,
                appliedBy: _id
            };

        } else if (penaltyType === 'damage_repair') {
            // [LOGIC] Owner-set amount for fixable damage
            if (!amount || amount <= 0) {
                return res.status(400).json({ success: false, message: 'Please provide a valid penalty amount for damage/repair.' });
            }
            penaltyData.amount = Number(amount);

        } else if (penaltyType === 'full_replacement') {
            // [LOGIC] Auto-populate from gown's replacement cost, or fallback to rental price
            const gownData = booking.gown;
            const replacementCost = gownData?.replacementCost || gownData?.price || booking.price;
            penaltyData.amount = amount && amount > 0 ? Number(amount) : replacementCost;
            penaltyData.description = description || `Full replacement cost for gown: ${gownData?.name || 'Unknown'}`;
        }

        if (!booking.penalties) booking.penalties = [];

        // Ensure status is outstanding for amount > 0, or settled for 0
        penaltyData.status = (penaltyData.amount === 0) ? 'settled' : 'outstanding';

        booking.penalties.push(penaltyData);

        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('gown', 'name image price replacementCost')
            .populate('user', 'name email contactNumber')
            .populate('owner', 'name');

        const typeLabels = { late_return: 'Late Return', damage_repair: 'Damage/Repair', full_replacement: 'Full Replacement' };
        res.json({
            success: true,
            message: `${typeLabels[penaltyType]} penalty of ₱${penaltyData.amount.toLocaleString()} applied successfully.`,
            booking: populated
        });
    } catch (error) {
        console.error('[PENALTY] Error applying penalty:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * [INFO] Allows owners to mark a specific penalty as settled (customer paid offline).
 * [LOGIC] Updates the penalty status from 'outstanding' to 'settled' and records the settlement timestamp.
 * Settling a penalty DOES NOT automatically complete the booking — return must be explicitly confirmed by the owner.
 */
export const settlePenalty = async (req, res) => {
    try {
        const { _id } = req.user;
        const { bookingId, penaltyIndex, confirmReturn } = req.body;

        if (req.user.role !== 'owner') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        if (booking.owner.toString() !== _id.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (!booking.penalties || penaltyIndex < 0 || penaltyIndex >= booking.penalties.length) {
            return res.status(400).json({ success: false, message: 'Invalid penalty index.' });
        }

        const penalty = booking.penalties[penaltyIndex];
        if (penalty.status === 'settled') {
            return res.status(400).json({ success: false, message: 'This penalty has already been settled.' });
        }

        booking.penalties[penaltyIndex].status = 'settled';
        booking.penalties[penaltyIndex].settledAt = new Date();
        booking.markModified('penalties');

        let isCompleted = false;
        let missingLateReturn = false;

        // Default confirmReturn to true (unless explicitly false)
        const shouldConfirmReturn = confirmReturn !== false;
        if (shouldConfirmReturn && (booking.status === 'overdue' || booking.status === 'confirmed')) {
            const hasRemainingUnpaid = booking.penalties.some(p => p.status === 'outstanding');
            if (!hasRemainingUnpaid) {
                // Check if booking is overdue but late_return penalty was never applied
                const hasLateReturnPenalty = booking.penalties.some(p => p.type === 'late_return');
                const scheduledReturn = combineDateAndTime(booking.returnDate, booking.returnTime || booking.pickupTime || '09:00');
                const isOverdue = scheduledReturn && new Date() > scheduledReturn;

                if (booking.status === 'overdue' && isOverdue && !hasLateReturnPenalty) {
                    // Don't complete — late return penalty is still missing
                    missingLateReturn = true;
                } else {
                    booking.status = 'completed';
                    if (!booking.returnConfirmedAt) booking.returnConfirmedAt = new Date();
                    isCompleted = true;
                }
            }
        }

        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('gown', 'name image price replacementCost')
            .populate('user', 'name email contactNumber')
            .populate('owner', 'name');

        res.json({
            success: true,
            message: missingLateReturn
                ? `Penalty paid. Late return fee is still pending — please apply or waive it.`
                : isCompleted
                    ? `Penalty of ₱${penalty.amount.toLocaleString()} marked as paid and return confirmed!`
                    : `Penalty of ₱${penalty.amount.toLocaleString()} marked as paid.`,
            booking: populated,
            isCompleted,
            missingLateReturn
        });
    } catch (error) {
        console.error('[PENALTY] Error settling penalty:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * [INFO] Settles ALL outstanding penalties on a booking in one click.
 * [LOGIC] Marks every outstanding penalty as settled and completes the booking if eligible.
 */
export const settleAllPenalties = async (req, res) => {
    try {
        const { _id } = req.user;
        const { bookingId } = req.body;

        if (req.user.role !== 'owner') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        if (booking.owner.toString() !== _id.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (!booking.penalties || booking.penalties.length === 0) {
            return res.status(400).json({ success: false, message: 'No penalties to settle.' });
        }

        const now = new Date();
        let settledCount = 0;
        booking.penalties.forEach(p => {
            if (p.status === 'outstanding') {
                p.status = 'settled';
                p.settledAt = now;
                settledCount++;
            }
        });
        booking.markModified('penalties');

        if (settledCount === 0) {
            return res.status(400).json({ success: false, message: 'All penalties are already settled.' });
        }

        // Check for missing late return before completing
        let isCompleted = false;
        let missingLateReturn = false;
        if (booking.status === 'overdue' || booking.status === 'confirmed') {
            const hasLateReturnPenalty = booking.penalties.some(p => p.type === 'late_return');
            const scheduledReturn = combineDateAndTime(booking.returnDate, booking.returnTime || booking.pickupTime || '09:00');
            const isOverdue = scheduledReturn && new Date() > scheduledReturn;

            if (booking.status === 'overdue' && isOverdue && !hasLateReturnPenalty) {
                missingLateReturn = true;
            } else {
                booking.status = 'completed';
                if (!booking.returnConfirmedAt) booking.returnConfirmedAt = now;
                isCompleted = true;
            }
        }

        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('gown', 'name image price replacementCost')
            .populate('user', 'name email contactNumber')
            .populate('owner', 'name');

        const totalSettled = booking.penalties.filter(p => p.status === 'settled').reduce((sum, p) => sum + (p.amount || 0), 0);

        res.json({
            success: true,
            message: missingLateReturn
                ? `${settledCount} penalties paid (₱${totalSettled.toLocaleString()}). Late return fee still pending.`
                : isCompleted
                    ? `All ${settledCount} penalties paid (₱${totalSettled.toLocaleString()}) — return confirmed!`
                    : `${settledCount} penalties marked as paid.`,
            booking: populated,
            isCompleted,
            missingLateReturn
        });
    } catch (error) {
        console.error('[PENALTY] Error settling all penalties:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * [INFO] Allows owners to remove a penalty from a booking (only if still outstanding).
 * [LOGIC] Removes the penalty at the specified index from the penalties array.
 */
export const removePenalty = async (req, res) => {
    try {
        const { _id } = req.user;
        const { bookingId, penaltyIndex } = req.body;

        if (req.user.role !== 'owner') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        if (booking.owner.toString() !== _id.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (!booking.penalties || penaltyIndex < 0 || penaltyIndex >= booking.penalties.length) {
            return res.status(400).json({ success: false, message: 'Invalid penalty index.' });
        }

        const penalty = booking.penalties[penaltyIndex];
        if (penalty.status === 'settled') {
            return res.status(400).json({ success: false, message: 'Cannot remove a settled penalty.' });
        }

        // [LOGIC] If removing a late_return penalty, also clear the legacy penalty field
        if (penalty.type === 'late_return') {
            booking.penalty = { amount: 0, overdueDays: 0, ratePerDay: 50, isApplied: false };
        }

        booking.penalties.splice(penaltyIndex, 1);
        booking.markModified('penalties');
        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('gown', 'name image price replacementCost')
            .populate('user', 'name email contactNumber')
            .populate('owner', 'name');

        res.json({
            success: true,
            message: 'Penalty removed successfully.',
            booking: populated
        });
    } catch (error) {
        console.error('[PENALTY] Error removing penalty:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * [INFO] Checks if a user has any outstanding (unsettled) penalties across all bookings.
 * [LOGIC] Used to block customers from creating new bookings until penalties are settled.
 */
export const checkOutstandingPenalties = async (req, res) => {
    try {
        const userId = req.user._id;

        const bookingsWithPenalties = await Booking.find({
            user: userId,
            'penalties': { $elemMatch: { status: 'outstanding' } }
        }).populate('gown', 'name image').populate('owner', 'name shopProfile.shopName');

        const outstandingPenalties = [];
        let totalOutstanding = 0;

        bookingsWithPenalties.forEach(booking => {
            booking.penalties.forEach((penalty, index) => {
                if (penalty.status === 'outstanding') {
                    outstandingPenalties.push({
                        bookingId: booking._id,
                        penaltyIndex: index,
                        type: penalty.type,
                        amount: penalty.amount,
                        description: penalty.description,
                        appliedAt: penalty.appliedAt,
                        gownName: booking.gown?.name || 'Unknown',
                        shopName: booking.owner?.shopProfile?.shopName || booking.owner?.name || 'Unknown'
                    });
                    totalOutstanding += penalty.amount;
                }
            });
        });

        res.json({
            success: true,
            hasOutstanding: outstandingPenalties.length > 0,
            totalOutstanding,
            penalties: outstandingPenalties
        });
    } catch (error) {
        console.error('[PENALTY] Error checking outstanding penalties:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// Rules:
// - Users can only update their own bookings.
// - Owners can only update bookings where they are the owner.
// - Only bookings in status 'pending' or 'trial' can be rescheduled.
// - Cancel is allowed for pending/trial (and also for confirmed by owner, if needed).
// [SECTION] BOOKING MODIFICATIONS
/**
 * [INFO] Handles Rescheduling, Extensions, and Cancellations.
 * [LOGIC] 
 * 1. Validates that only pending/trial bookings can be rescheduled.
 * 2. Performs a fresh availability check before allowing a date change.
 * 3. Owners can convert trials into full reservations here.
 */
export const updateBooking = async (req, res) => {
    try {
        const actor = req.user;
        let { bookingId, action, pickupDate, returnDate, pickupTime, returnTime } = req.body;

    if (!bookingId || !action) {
      return res.status(400).json({ success: false, message: 'bookingId and action are required.' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const isUserActor = actor.role === 'user';
    const isOwnerActor = actor.role === 'owner';

    const actorId = actor._id.toString();
    const bookingUserId = booking.user?.toString();
    const bookingOwnerId = booking.owner?.toString();

    const canAct = (isUserActor && bookingUserId === actorId) || (isOwnerActor && bookingOwnerId === actorId);
    if (!canAct) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (action === 'cancel') {
      if (['canceled', 'completed'].includes(booking.status)) {
        return res.status(400).json({ success: false, message: 'Booking is already closed.' });
      }

      const { cancellationReason } = req.body;
      if (isOwnerActor) {
        if (!cancellationReason || !cancellationReason.trim()) {
          return res.status(400).json({ success: false, message: 'Cancellation reason is required.' });
        }
        booking.cancellationReason = cancellationReason.trim();
      }

      // Cancel should instantly release trial holds. Since calendar queries exclude canceled bookings,
      // setting status to canceled is enough.
      booking.status = 'canceled';
      await booking.save();
      return res.json({ success: true, message: 'Booking canceled', booking });
    }

    if (action === 'convert_to_reservation') {
      // Owner-managed in-store decision: trial -> reservation
      if (actor.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Only the owner can finalize a trial booking.' });
      }

      const isTrialBooking = booking.status === 'trial' || booking.bookingType === 'trial';
      if (!isTrialBooking) {
        return res.status(400).json({ success: false, message: 'Only trial bookings can be converted.' });
      }

      // Final conflict check before converting
      const gown = await Gown.findById(booking.gown).select('laundryDays');
      if (!gown) {
        return res.status(404).json({ success: false, message: 'Gown not found' });
      }

      const otherBookings = await Booking.find({
        gown: booking.gown,
        _id: { $ne: booking._id },
        status: { $nin: ['canceled', 'expired'] },
      });

      const blockedDates = new Set();
      otherBookings.forEach((b) => {
        const isOtherTrial = b.status === 'trial' || b.bookingType === 'trial';
        const s = new Date(b.pickupDate);
        const e = new Date(b.returnDate);

        // Only block dates for non-trial bookings
        if (!isOtherTrial) {
          for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
            blockedDates.add(d.toISOString().split('T')[0]);
          }
        }

        const laundryDays = isOtherTrial ? 0 : Math.max(gown.laundryDays || 0, 0);
        for (let i = 1; i <= laundryDays; i++) {
          const ld = new Date(e);
          ld.setDate(ld.getDate() + i);
          blockedDates.add(ld.toISOString().split('T')[0]);
        }
      });

      const overlaps = dateRangeOverlapsBlocked(booking.pickupDate, booking.returnDate, blockedDates);
      if (overlaps) {
        return res.status(409).json({ success: false, message: 'Cannot finalize: schedule now conflicts with another booking/hold.' });
      }

      // Conversion: trial -> reservation pending (or confirmed later by pickup confirmation)
      booking.bookingType = 'reservation';
      booking.status = 'pending';

      // Payment handling: allow in-store paid without GCash requirements
      booking.payment.method = 'in_store';
      booking.payment.status = 'paid';
      booking.payment.transactionRef = undefined;
      booking.payment.screenshot = undefined;
      booking.payment.verifiedAt = new Date();
      booking.payment.verifiedBy = actor._id;

      await booking.save();

      // NOTE: gown.status is calculated dynamically by calculateActualGownStatus().
      // No need to set it here — the next read will compute the correct status.

      const populated = await Booking.findById(booking._id)
        .populate('gown')
        .populate('owner', 'name')
        .populate('user', 'name email contactNumber');

      return res.json({ success: true, message: 'Trial finalized as reservation', booking: populated });
    }

    if (action !== 'reschedule' && action !== 'extend') {
      return res.status(400).json({ success: false, message: 'Invalid action. Use cancel, reschedule, extend, or convert_to_reservation.' });
    }

    // Only allow reschedule/extend on pending/trial bookings
    if (!['pending', 'trial'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Only pending or trial bookings can be rescheduled or extended.' });
    }

    const isTrial = booking.status === 'trial' || booking.bookingType === 'trial';

    // EXTEND VALIDATION: Special rules for extending bookings
    if (action === 'extend') {
      // For extend, pickup date/time must remain the same
      if (!returnDate || !returnTime) {
        return res.status(400).json({
          success: false,
          message: 'Return date and time are required for extend action.'
        });
      }

      // Parse original dates and times
      const originalPickupDate = new Date(booking.pickupDate);
      const originalReturnDate = new Date(booking.returnDate);
      const newReturnDate = combineDateAndTime(returnDate, returnTime);

      if (!newReturnDate) {
        return res.status(400).json({ success: false, message: 'Invalid return date or time.' });
      }

      // Extract date parts (YYYY-MM-DD) for comparison
      const originalPickupDay = toLocalDateString(originalPickupDate);
      const originalReturnDay = toLocalDateString(originalReturnDate);
      const newReturnDay = toLocalDateString(newReturnDate);

      // Parse times to minutes for comparison
      const parseTimeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const originalPickupTime = booking.pickupTime;
      const originalReturnTime = booking.returnTime;
      const newReturnTimeStr = returnTime;

      const originalPickupMinutes = parseTimeToMinutes(originalPickupTime);
      const originalReturnMinutes = parseTimeToMinutes(originalReturnTime);
      const newReturnMinutes = parseTimeToMinutes(newReturnTimeStr);

      // Rule 1: Same-day extension - return time cannot be earlier than original return time
      // Maximum 1 hour extension allowed
      if (originalReturnDay === newReturnDay) {
        if (newReturnMinutes < originalReturnMinutes) {
          return res.status(400).json({
            success: false,
            message: 'For same-day extension, the return time cannot be earlier than the original return time.'
          });
        }

        // Check max 1 hour extension
        const extensionMinutes = newReturnMinutes - originalReturnMinutes;
        if (extensionMinutes > 60) {
          return res.status(400).json({
            success: false,
            message: 'Maximum 1 hour extension allowed for same-day bookings.'
          });
        }
      }
      // Rule 2: Next-day (or later) extension - return time can be earlier but not more than 1 hour late from pickup
      else if (newReturnDate > originalReturnDate) {
        // For next-day extensions, return time can be earlier than the original return time
        // But the return time cannot be more than 1 hour later than the pickup time on the new return day

        // Check if return time is not more than 1 hour late from pickup time
        const timeDiffMinutes = newReturnMinutes - originalPickupMinutes;

        // Allow earlier times (negative diff), but not more than 1 hour late
        if (timeDiffMinutes > 60) {
          return res.status(400).json({
            success: false,
            message: 'For next-day extension, the return time cannot be more than 1 hour later than the pickup time.'
          });
        }
      } else {
        // New return date is before original return date - not allowed for extend
        return res.status(400).json({
          success: false,
          message: 'Extension cannot reduce the booking period. Use reschedule instead.'
        });
      }

      // Use original pickup values for extend
      pickupDate = toLocalDateString(originalPickupDate);
      pickupTime = originalPickupTime;
    }

    // Trials are single appointment bookings: require only pickupDate + pickupTime.
    if (!pickupDate || !pickupTime || (!isTrial && (!returnDate || !returnTime))) {
      return res.status(400).json({
        success: false,
        message: isTrial
          ? 'pickupDate and pickupTime are required for trial reschedule.'
          : 'pickupDate, returnDate, pickupTime, returnTime are required for reschedule.'
      });
    }

    const effectiveReturnTime = isTrial ? pickupTime : returnTime;
    const effectiveReturnDate = isTrial ? pickupDate : returnDate;

    const ownerDoc = await User.findById(booking.owner).select('shopProfile');
    const shopHours = parseOperatingHours(ownerDoc?.shopProfile?.operatingHours) || { openMinutes: DEFAULT_OPEN, closeMinutes: DEFAULT_CLOSE };

    // Pickup time must be within operating hours. Return time is flexible for reservations (any time within the return day).
    if (!isWithinBusinessHours(pickupTime, shopHours) || (isTrial && !isWithinBusinessHours(effectiveReturnTime, shopHours))) {
      return res.status(400).json({ success: false, message: 'Times must be within the shop\'s operating hours and in 15-minute increments.' });
    }

    const newPickupDateTime = combineDateAndTime(pickupDate, pickupTime);
    let newReturnDateTime = isTrial
      ? combineDateAndTime(effectiveReturnDate, effectiveReturnTime)
      : endOfLocalDay(effectiveReturnDate);

    if (!newPickupDateTime || !newReturnDateTime) {
      return res.status(400).json({ success: false, message: 'Invalid pickup or return date.' });
    }

    if (isTrial) {
      newReturnDateTime = new Date(newPickupDateTime.getTime() + 30 * 60 * 1000); // 30-minute trial slot
    }

    // For trials, return may equal pickup (single-day appointment).
    if (isTrial ? (newReturnDateTime < newPickupDateTime) : (newReturnDateTime <= newPickupDateTime)) {
      return res.status(400).json({ success: false, message: 'Return time cannot be earlier than pickup time.' });
    }

    const gown = await Gown.findById(booking.gown).select('laundryDays');
    if (!gown) {
      return res.status(404).json({ success: false, message: 'Gown not found' });
    }

    // Check for conflicts excluding the current booking
    const now = new Date();
    const otherBookings = await Booking.find({
      gown: booking.gown,
      _id: { $ne: booking._id },
      status: { $nin: ['canceled', 'expired'] },
    });

    // Unified Conflict Detection Loop (Airtight)
    for (const other of otherBookings) {
      const isOtherTrial = other.status === 'trial' || other.bookingType === 'trial';
      const otherStart = new Date(other.pickupDate);
      const otherEnd = new Date(other.returnDate);

      // Effective end for existing booking (respect laundry for non-trials)
      const otherLaundry = isOtherTrial ? 0 : Number(gown.laundryDays || 0);
      const otherBlockedEnd = new Date(otherEnd);
      otherBlockedEnd.setDate(otherBlockedEnd.getDate() + otherLaundry);

      let conflictFound = false;

      // 1. Time-slot overlap (Same day handovers)
      if (doTimeSlotsOverlap(newPickupDateTime, newReturnDateTime, otherStart, otherEnd)) {
        conflictFound = true;
      }
      // 2. Day-range overlap if either is a Reservation
      else if (!isTrial || !isOtherTrial) {
        // Effective range for Request (New)
        const reqLaundry = isTrial ? 0 : Number(gown.laundryDays || 0);
        const s1 = toLocalDateString(newPickupDateTime);
        const e1_date = new Date(newReturnDateTime);
        e1_date.setDate(e1_date.getDate() + reqLaundry);
        const e1 = toLocalDateString(e1_date);

        // Effective range for Existing (Other)
        const s2 = toLocalDateString(otherStart);
        const e2 = toLocalDateString(otherBlockedEnd);

        if (s1 <= e2 && e1 >= s2) {
          conflictFound = true;
        }
      }

      if (conflictFound) {
        return res.status(409).json({ 
          success: false, 
          message: isTrial 
            ? 'Selected date/time conflicts with another booking or laundry hold.' 
            : 'Selected schedule overlaps an existing booking/trial/laundry hold.' 
        });
      }
    }

    booking.pickupDate = newPickupDateTime;
    booking.returnDate = newReturnDateTime;
    booking.pickupTime = pickupTime;
    booking.returnTime = isTrial ? pickupTime : effectiveReturnTime;

    // Recalculate price based on new rental period (for non-trial bookings)
    if (!isTrial) {
      const gownData = await Gown.findById(booking.gown).select('price pricePerDay');
      const basePrice = gownData.pricePerDay || gownData.price || 0;
      const pricing = computeReservationPricing({
        basePrice,
        pickupDate: newPickupDateTime,
        returnDate: newReturnDateTime,
      });
      const newPrice = pricing.total;

      // Update booking price and payment details
      booking.price = newPrice;
      if (booking.payment) {
        booking.payment.totalAmount = newPrice;
        booking.payment.remainingBalance = newPrice - (booking.payment.depositAmount || 0);
      }
    }

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('gown')
      .populate('owner', 'name')
      .populate('user', 'name email contactNumber');

    return res.json({ success: true, message: 'Booking updated', booking: populated });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export const getGownCalendar = async (req, res) => {
  try {
    const { gownId } = req.params;
    if (!gownId) {
      return res.status(400).json({ success: false, message: "Missing gownId" });
    }

    const gown = await Gown.findById(gownId).select('laundryDays statusOverride name');
    if (!gown) {
      return res.status(404).json({ success: false, message: "Gown not found" });
    }

    const now = new Date();
    const todayStr = toLocalDateString(now);
    const today = new Date(todayStr + "T00:00:00Z");
    const horizon = new Date(today.getTime() + 180 * DAY_IN_MS);

    const unavailableDates = new Set();
    const trialTimeSlots = {}; 
    const laundryHoldDates = new Set();

    // [LOGIC] Check for manual status override (highest priority)
    // If the owner has manually set a blocking status, we show the entire calendar as unavailable.
    if (gown.statusOverride && gown.statusOverride !== 'Available') {
      const todayStrVal = toLocalDateString(today);
      const horizonStrVal = toLocalDateString(horizon);
      let cur = new Date(todayStrVal + "T12:00:00Z");
      const endLimit = new Date(horizonStrVal + "T12:00:00Z");
      while (cur <= endLimit) {
        unavailableDates.add(toLocalDateString(cur));
        cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
      }

      return res.json({
        success: true,
        calendar: {
          laundryDays: gown.laundryDays || 0,
          unavailableDates: Array.from(unavailableDates).sort(),
          trialTimeSlots: {},
          laundryHoldDates: [],
          statusOverride: gown.statusOverride,
          message: `This apparel is manually set to '${gown.statusOverride}' and is not available for bookings.`
        },
      });
    }

    // Include bookings whose return date is still relevant:
    // - Future bookings (returnDate >= today)
    // - Completed bookings within the laundry window (their laundry days may still be active)
    const laundryWindowMs = (gown.laundryDays || 0) * DAY_IN_MS;
    const laundryLookback = new Date(today.getTime() - laundryWindowMs - DAY_IN_MS);

    const Bookings = await Booking.find({
      gown: gownId,
      status: { $nin: ["canceled", "expired"] },
      returnDate: { $gte: laundryLookback }
    }).sort({ pickupDate: 1 });
    // [INFO] overdue bookings are included above (not in $nin) and treated like confirmed for calendar blocking

    const captureDate = (dateObj, targetSet) => {
      const dStr = toLocalDateString(dateObj);
      const todayStrVal = toLocalDateString(today);
      const horizonStrVal = toLocalDateString(horizon);
      if (dStr < todayStrVal || dStr > horizonStrVal) return;
      targetSet.add(dStr);
    };

    Bookings.forEach((booking) => {
      const bookingStart = new Date(booking.pickupDate);
      let bookingEnd = new Date(booking.returnDate);
      const isTrial = booking.status === 'trial' || booking.bookingType === 'trial';

      // [LOGIC] Overdue bookings: extend blocked range to today (gown not returned)
      if (booking.status === 'overdue') {
        const todayDate = new Date();
        if (todayDate > bookingEnd) {
          bookingEnd = todayDate;
        }
      }

      if (!isTrial) {
        const startStr = toLocalDateString(bookingStart);
        const endStr = toLocalDateString(bookingEnd);

        let cur = new Date(startStr + "T12:00:00Z");
        const endLimit = new Date(endStr + "T12:00:00Z");

        while (cur <= endLimit) {
          if (booking.status === 'confirmed' || booking.status === 'pending' || booking.status === 'overdue') {
            captureDate(cur, unavailableDates);
          }
          cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
        }
      } else {
        // Trial bookings: record specific time slots
        const dateStr = toLocalDateString(bookingStart);
        const pickupTime = booking.pickupTime || '09:00';
        const returnTime = booking.returnTime || '10:00';

        if (!trialTimeSlots[dateStr]) {
          trialTimeSlots[dateStr] = [];
        }

        trialTimeSlots[dateStr].push({
          start: pickupTime,
          end: returnTime,
          bookingId: booking._id.toString()
        });
      }

      // Laundry days are only after non-trial bookings that are actually returned
      const bufferDays = isTrial ? 0 : Math.max(gown.laundryDays || 0, 0);
      // Don't add laundry for overdue bookings (gown not returned yet)
      if (booking.status === 'overdue' || bufferDays === 0) return;
      // For completed bookings, use actual return date
      const laundryBase = (booking.status === 'completed' && booking.returnConfirmedAt)
        ? toLocalDateString(new Date(booking.returnConfirmedAt))
        : toLocalDateString(bookingEnd);
      for (let i = 1; i <= bufferDays; i += 1) {
        const baseDate = new Date(laundryBase + "T12:00:00Z");
        const laundryDate = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
        if (laundryDate >= today && laundryDate <= horizon) {
          laundryHoldDates.add(toLocalDateString(laundryDate));
        }
      }
    });

    res.json({
      success: true,
      calendar: {
        laundryDays: gown.laundryDays || 0,
        unavailableDates: Array.from(unavailableDates).sort(),
        trialTimeSlots: trialTimeSlots, // NEW: Show booked time slots for each date
        laundryHoldDates: Array.from(laundryHoldDates).sort(),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to verify payment (approve or reject) - Handles both GCash and In-Store methods
export const verifyPayment = async (req, res) => {
  try {
    const { _id } = req.user;
    const { BookingId, action, rejectionReason } = req.body;

    if (!BookingId || !action) {
      return res.status(400).json({ success: false, message: "Missing BookingId or action" });
    }

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ success: false, message: "Action must be 'approve' or 'reject'" });
    }

    const booking = await Booking.findById(BookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify owner authorization
    if (booking.owner.toString() !== _id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Check if payment exists
    if (!booking.payment) {
      return res.status(400).json({ success: false, message: "No payment information found" });
    }

    // Handle verification based on payment method and action
    if (action === 'approve') {
      if (booking.payment.method === 'in_store') {
        // For in-store, mark as paid immediately (full payment collected)
        booking.payment.status = 'paid';
      } else {
        // For GCash payments, handle as deposit (50%)
        booking.payment.status = 'verified';
      }
      booking.payment.verifiedAt = new Date();
      booking.payment.verifiedBy = _id;
    } else {
      // For Reject action (both GCash and In-Store)
      const reason = (rejectionReason || '').toString().trim();
      if (!reason) {
        return res.status(400).json({ success: false, message: 'Rejection reason is required when rejecting payment.' });
      }
      booking.payment.status = 'rejected';
      booking.payment.rejectionReason = reason;
      booking.status = 'canceled'; // Cancel booking if payment rejected
    }

    await booking.save();

    // NOTE: gown.status is calculated dynamically by calculateActualGownStatus().
    // No need to set it here — the next read will compute the correct status.
    // gown.available (the owner's manual toggle) is not modified by booking operations.

    res.json({
      success: true,
      message: `Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cleanup function (no-op since trial expiration has been removed)
export const cleanupExpiredTrials = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Trial expiration cleanup has been disabled."
    });

  } catch (error) {
    console.error('[CLEANUP_TRIALS] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// [SECTION] PAYMENT & STATUS ENGINE
/**
 * [INFO] Verification logic for booking payments and status updates.
 */
export const calculateActualGownStatus = async (gownId) => {
  try {
    const now = new Date();
    const currentTime = now.getTime();

    // Fetch gown to check for manual status override (highest priority)
    const gown = await Gown.findById(gownId).select('laundryDays statusOverride');
    if (!gown) return 'Available';

    // If owner has set a manual override, use it immediately
    if (gown.statusOverride) {
      return gown.statusOverride;
    }

    const laundryDays = gown.laundryDays || 0;
    const laundryWindowMs = laundryDays * 24 * 60 * 60 * 1000;

    // Query active bookings that could influence today's status
    // Use $or to always include overdue bookings (gown still out, regardless of original returnDate)
    const bookings = await Booking.find({
      gown: gownId,
      $or: [
        {
          status: { $in: ['pending', 'confirmed', 'completed', 'trial'] },
          pickupDate: { $lte: new Date(currentTime + laundryWindowMs + DAY_IN_MS) },
          returnDate: { $gte: new Date(currentTime - laundryWindowMs - DAY_IN_MS) }
        },
        { status: 'overdue' }
      ]
    }).sort({ pickupDate: 1 });

    for (const booking of bookings) {
      const pickupDateTime = combineDateAndTime(booking.pickupDate, booking.pickupTime || '09:00');
      const returnDateTime = combineDateAndTime(
        booking.returnDate,
        booking.returnTime || booking.pickupTime || '09:00'
      );

      if (!pickupDateTime || !returnDateTime) continue;

      const pickupTimeMs = pickupDateTime.getTime();
      const returnTimeMs = returnDateTime.getTime();

      // ── TRIAL booking = active try-on appointment ──
      if (booking.status === 'trial') {
        const returnTimeMs = new Date(booking.returnDate).getTime();
        if (currentTime >= pickupTimeMs && currentTime <= returnTimeMs) {
          return 'Reserved';
        }
        continue;
      }

      // ── OVERDUE booking = gown is overdue, still out with customer ──
      if (booking.status === 'overdue') {
        return 'In-Use';
      }

      // ── CONFIRMED booking = owner confirmed pickup ──
      if (booking.status === 'confirmed') {
        // Gown is "In-Use" if the pickup time has passed AND return time hasn't passed
        if (currentTime >= pickupTimeMs && currentTime <= returnTimeMs) {
          return 'In-Use';
        }
        // If pickup is today (even if in future), show as Reserved
        if (pickupDateTime.toDateString() === now.toDateString()) {
          return 'Reserved';
        }
      }

      // ── PENDING booking = reservation awaiting confirmation ──
      if (booking.status === 'pending') {
        // Only mark as Reserved if it starts TODAY or is active right now
        // Future reservations (e.g. tomorrow) shouldn't block today's status badge
        if (pickupDateTime.toDateString() === now.toDateString() || (currentTime >= pickupTimeMs && currentTime <= returnTimeMs)) {
          return 'Reserved';
        }
      }

      // ── CONFIRMED/COMPLETED/OVERDUE booking — check laundry window ──
      if (booking.status === 'confirmed' || booking.status === 'completed') {
        if (laundryDays > 0) {
          // For completed bookings, use actual return date (returnConfirmedAt), not original returnDate
          const laundryStartDate = (booking.status === 'completed' && booking.returnConfirmedAt)
            ? new Date(booking.returnConfirmedAt)
            : returnDateTime;
          const laundryEndDate = new Date(laundryStartDate);
          laundryEndDate.setDate(laundryEndDate.getDate() + laundryDays);
          laundryEndDate.setHours(23, 59, 59, 999);

          if (now > laundryStartDate && now <= laundryEndDate) {
            return 'In-Laundry';
          }
        }
      }
    }

    return 'Available';
  } catch (error) {
    console.error('Error calculating gown status:', error);
    return 'Available';
  }
};

/**
 * Batch update statuses for an array of gown objects.
 * This resolves N+1 query issues by fetching all relevant bookings in one go.
 * @param {Array} gowns - Array of Mongoose gown documents or objects.
 * @returns {Promise<Array>} - The same array with 'status' property set on each item.
 */
export const batchUpdateGownStatuses = async (gowns) => {
  if (!gowns || gowns.length === 0) return gowns;

  try {
    const now = new Date();
    const currentTime = now.getTime();
    
    // 1. Collect all gown IDs
    const gownIds = gowns.map(g => g._id);

    // 2. Fetch all potentially relevant bookings for these gowns in ONE query.
    // We look for active bookings (pending, confirmed, completed, trial) 
    // within a reasonable window (14 days before/after today).
    const maxLaundryMs = 14 * 24 * 60 * 60 * 1000;
    const relevantBookings = await Booking.find({
      gown: { $in: gownIds },
      status: { $in: ['pending', 'confirmed', 'completed', 'trial', 'overdue'] },
      pickupDate: { $lte: new Date(currentTime + maxLaundryMs + DAY_IN_MS) },
      returnDate: { $gte: new Date(currentTime - maxLaundryMs - DAY_IN_MS) }
    }).sort({ pickupDate: 1 });

    // 3. Group bookings by gownId for fast lookup
    const bookingsMap = {};
    relevantBookings.forEach(b => {
      const gid = b.gown.toString();
      if (!bookingsMap[gid]) bookingsMap[gid] = [];
      bookingsMap[gid].push(b);
    });

    // 4. Calculate status for each gown using the pre-fetched bookings
    gowns.forEach(gown => {
      // Handle both Mongoose documents and plain objects
      const g = typeof gown.toObject === 'function' ? gown : gown;
      const gid = g._id.toString();
      
      // Manual override check (highest priority)
      if (g.statusOverride) {
        gown.status = g.statusOverride;
        return;
      }

      const gBookings = bookingsMap[gid] || [];
      const laundryDays = g.laundryDays || 0;
      let finalStatus = 'Available';

      for (const booking of gBookings) {
        const pickupDateTime = combineDateAndTime(booking.pickupDate, booking.pickupTime || '09:00');
        const returnDateTime = combineDateAndTime(
          booking.returnDate,
          booking.returnTime || booking.pickupTime || '09:00'
        );

        if (!pickupDateTime || !returnDateTime) continue;

        const pickupTimeMs = pickupDateTime.getTime();
        const returnTimeMs = returnDateTime.getTime();

        // ── TRIAL booking ──
        if (booking.status === 'trial') {
          const returnTimeMs = new Date(booking.returnDate).getTime();
          if (currentTime >= pickupTimeMs && currentTime <= returnTimeMs) {
            finalStatus = 'Reserved';
            break; 
          }
          continue;
        }

        // ── OVERDUE booking = gown is overdue, still out ──
        if (booking.status === 'overdue') {
          finalStatus = 'In-Use';
          break;
        }

        // ── CONFIRMED booking ──
        if (booking.status === 'confirmed') {
          if (currentTime >= pickupTimeMs && currentTime <= returnTimeMs) {
            finalStatus = 'In-Use';
            break;
          }
          if (pickupDateTime.toDateString() === now.toDateString()) {
            finalStatus = 'Reserved';
          }
        } 
        
        // ── PENDING booking ──
        else if (booking.status === 'pending') {
          if (pickupDateTime.toDateString() === now.toDateString() || (currentTime >= pickupTimeMs && currentTime <= returnTimeMs)) {
            finalStatus = 'Reserved';
          }
        } 
        
        // ── LAUNDRY check (for confirmed/completed) — separate if, not else-if ──
        if ((booking.status === 'confirmed' || booking.status === 'completed') && laundryDays > 0) {
          // For completed bookings, use actual return date (returnConfirmedAt), not original returnDate
          const laundryStartDate = (booking.status === 'completed' && booking.returnConfirmedAt)
            ? new Date(booking.returnConfirmedAt)
            : returnDateTime;
          const laundryEndDate = new Date(laundryStartDate);
          laundryEndDate.setDate(laundryEndDate.getDate() + laundryDays);
          laundryEndDate.setHours(23, 59, 59, 999);

          if (now > laundryStartDate && now <= laundryEndDate) {
            finalStatus = 'In-Laundry';
          }
        }
      }

      gown.status = finalStatus;
    });

    return gowns;
  } catch (error) {
    console.error('Error in batchUpdateGownStatuses:', error);
    // Fallback to existing statuses or 'Available'
    return gowns;
  }
};

