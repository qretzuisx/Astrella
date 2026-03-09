import Booking from "../models/booking.js";
import Gown from "../models/Gown.js";
import User from "../models/User.js";
import imageKit from "../configs/imagekit.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** Format a Date as YYYY-MM-DD in server local time (avoids UTC shift for calendar dates). */
const toLocalDateString = (dateObj) => {
  if (!dateObj) return "";
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const combineDateAndTime = (dateValue, timeValue) => {
  if (!dateValue) return null;

  // IMPORTANT: Avoid using toISOString() here.
  // toISOString() converts to UTC and can shift the date backward/forward depending on timezone,
  // which causes UI "today" selections to appear as past days for some users.
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

/** Parse shop operating hours string "HH:MM-HH:MM" to minutes since midnight. Returns null for invalid; use defaults 9*60, 19*60 when null. */
const parseOperatingHours = (ohString) => {
  if (!ohString || typeof ohString !== "string") return null;
  const trimmed = ohString.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const openMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  const closeMinutes = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);
  if (openMinutes < 0 || closeMinutes > 24 * 60) return null;
  return { openMinutes, closeMinutes };
};

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
const getMinutesSinceMidnight = (dateObj) => {
  if (!dateObj) return 0;
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  return d.getHours() * 60 + d.getMinutes();
};

// Helper: Check if two time slots overlap on the same calendar day
// Returns true if they conflict, false if they don't
const doTimeSlotsOverlap = (slot1Start, slot1End, slot2Start, slot2End) => {
  // Get calendar dates (YYYY-MM-DD)
  const slot1Date = toLocalDateString(slot1Start);
  const slot2Date = toLocalDateString(slot2Start);
  
  // Different dates = no time conflict possible
  if (slot1Date !== slot2Date) return false;
  
  // Same date - check time overlap
  // Overlap occurs if: start1 < end2 AND end1 > start2
  return slot1Start < slot2End && slot1End > slot2Start;
};

// Helper function to get all laundry dates for a gown (as date strings YYYY-MM-DD)
const getLaundryDates = async (gownId, laundryDays) => {
  if (!laundryDays || laundryDays <= 0) return new Set();

  const laundryDateSet = new Set();
  const now = new Date();
  const Bookings = await Booking.find({
    gown: gownId,
    status: { $ne: "canceled" },
    $or: [
      { status: { $ne: 'trial' } },
      { status: 'trial', trialExpiresAt: { $gt: now } },
      { status: 'trial', trialExpiresAt: { $exists: false } },
    ]
  });

  Bookings.forEach((booking) => {
    // Skip trial bookings - they don't have laundry days
    const isBookingTrial = booking.status === 'trial' || booking.bookingType === 'trial';
    if (isBookingTrial) return;

    const returnDate = new Date(booking.returnDate);
    for (let i = 1; i <= laundryDays; i++) {
      const laundryDate = new Date(returnDate);
      laundryDate.setDate(laundryDate.getDate() + i);
      laundryDateSet.add(toLocalDateString(laundryDate));
    }
  });

  return laundryDateSet;
};

// Helper function to check if a date range overlaps with any blocked dates (bookings or laundry days)
const dateRangeOverlapsBlocked = (startDate, endDate, blockedDateSet) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Check each day in the range
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (blockedDateSet.has(toLocalDateString(d))) return true;
  }
  return false;
};

export const checkAvailability = async (gown, pickupDate, returnDate, options = {}) => {
  const start = pickupDate instanceof Date ? pickupDate : new Date(pickupDate);
  const end = returnDate instanceof Date ? returnDate : new Date(returnDate);
  const laundryDays = Number(options.laundryDays || 0);
  const isTrial = options.isTrial || false; // NEW: support trial bookings
  
  // Get all Bookings
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const Bookings = await Booking.find({
    gown,
    status: { $ne: "canceled" },
    returnDate: { $gte: today }, // Only include bookings that haven't ended yet
    $or: [
      { status: { $ne: 'trial' } },
      { status: 'trial', trialExpiresAt: { $gt: now } },
      { status: 'trial', trialExpiresAt: { $exists: false } },
    ]
  });

  // Build a set of all blocked dates (Booking dates + laundry days)
  const blockedDates = new Set();

  // Add all Booking dates (pickup through return)
  // IMPORTANT: Trial bookings should ONLY check time-based conflicts, NOT day-based conflicts
  Bookings.forEach((Booking) => {
    const isBookingTrial = Booking.status === 'trial' || Booking.bookingType === 'trial';
    const BookingStart = new Date(Booking.pickupDate);
    const BookingEnd = new Date(Booking.returnDate);
    
    // CHANGED: Only add dates to blockedDates for non-trial reservations
    if (!isBookingTrial) {
      for (let d = new Date(BookingStart); d <= BookingEnd; d.setDate(d.getDate() + 1)) {
        blockedDates.add(toLocalDateString(d));
      }
    }
    
    // Laundry days only apply to non-trial bookings
    if (laundryDays > 0 && !isBookingTrial) {
      for (let i = 1; i <= laundryDays; i++) {
        const laundryDate = new Date(BookingEnd);
        laundryDate.setDate(laundryDate.getDate() + i);
        blockedDates.add(toLocalDateString(laundryDate));
      }
    }
  });

  // Check for date conflicts (only for non-trial bookings)
  if (!isTrial) {
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (blockedDates.has(toLocalDateString(d))) return false;
    }
  }

  // Check for time-based conflicts (both trial and non-trial)
  // Two time ranges overlap if: start1 < end2 AND end1 > start2
  for (const Booking of Bookings) {
    const bookingStart = new Date(Booking.pickupDate);
    const bookingEnd = new Date(Booking.returnDate);
    
    // Use robust time comparison that checks calendar date first
    if (doTimeSlotsOverlap(start, end, bookingStart, bookingEnd)) {
      return false; // Time conflict detected
    }
  }

  return true; // No conflicts
};

// API to create Booking
export const createBooking = async (req, res) => {
  try {
    const { _id } = req.user;
    const { gown, pickupDate, returnDate, pickupTime, returnTime, bookingType } = req.body;

    // Parse measurements and payment from JSON strings
    let measurements = {};
    let paymentInfo = {};
    
    try {
      if (req.body.measurements) {
        measurements = typeof req.body.measurements === 'string' 
          ? JSON.parse(req.body.measurements) 
          : req.body.measurements;
      }
      if (req.body.payment) {
        paymentInfo = typeof req.body.payment === 'string' 
          ? JSON.parse(req.body.payment) 
          : req.body.payment;
      }
    } catch (parseError) {
      return res.status(400).json({ success: false, message: "Invalid JSON format for measurements or payment" });
    }

    const normalizedBookingType = (bookingType || paymentInfo.bookingType || 'reservation').toString().toLowerCase();
    const isTrial = normalizedBookingType === 'trial';

    // Trials are single appointment bookings: require only pickupDate + pickupTime.
    // Reservations (rentals) require pickup + return dates.
    if (!gown || !pickupDate || !pickupTime || (!isTrial && !returnDate)) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // For trials, ignore/derive return fields (no separate return time/date).
    const normalizedReturnDate = isTrial ? pickupDate : returnDate;
    const normalizedReturnTime = isTrial ? pickupTime : (returnTime || pickupTime);

    // Trial flow: no payment required, no returnTime required.
    // Reservation flow: payment method controls requirements.
    const paymentMethod = isTrial
      ? 'in_store'
      : (paymentInfo.method || 'gcash').toString().toLowerCase();

    const isInStore = paymentMethod === 'in_store' || paymentMethod === 'pay_in_store';
    const isGcash = paymentMethod === 'gcash';

    if (!isTrial && !isInStore && !isGcash) {
      return res.status(400).json({ success: false, message: "Invalid payment method" });
    }

    // Validate payment information (reservation + gcash only)
    if (!isTrial && isGcash) {
      if (!paymentInfo.transactionRef || paymentInfo.transactionRef.length < 10) {
        return res.status(400).json({ success: false, message: "Valid GCash reference number is required" });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: "Payment screenshot is required" });
      }
    }

    const effectiveReturnTime = normalizedReturnTime;

    const gownData = await Gown.findById(gown).populate("owner", "shopProfile");
    if (!gownData) {
      return res.status(404).json({ success: false, message: "Gown not found" });
    }
    const ownerDoc = gownData.owner && gownData.owner.shopProfile ? gownData.owner : await User.findById(gownData.owner).select("shopProfile");
    const shopHours = parseOperatingHours(ownerDoc?.shopProfile?.operatingHours) || { openMinutes: DEFAULT_OPEN, closeMinutes: DEFAULT_CLOSE };

    if (!isWithinBusinessHours(pickupTime, shopHours) || (!isTrial && !isWithinBusinessHours(effectiveReturnTime, shopHours))) {
      return res.status(400).json({ success: false, message: "Selected times must be within the shop's operating hours and in 15-minute intervals." });
    }

    const pickupDateTime = combineDateAndTime(pickupDate, pickupTime);
    // For trials, return date is same as pickup date (single-day); use normalizedReturnDate so we don't rely on undefined returnDate.
    let returnDateTime = combineDateAndTime(normalizedReturnDate, effectiveReturnTime);

    if (!pickupDateTime || !returnDateTime) {
      return res.status(400).json({ success: false, message: "Invalid pickup or return date." });
    }

    const now = new Date();
    if (pickupDateTime < now) {
      return res.status(400).json({ success: false, message: "Pickup date and time cannot be in the past." });
    }
    if (returnDateTime < now) {
      return res.status(400).json({ success: false, message: "Return date and time cannot be in the past." });
    }

    // Trial bookings are 30-minute appointment slots (only block the time slot, not the entire day).
    if (isTrial) {
      returnDateTime = new Date(pickupDateTime.getTime() + 30 * 60 * 1000); // 30 minutes after pickup
    }

    // For trials, returnDateTime may equal pickupDateTime (single-day appointment).
    // For reservations, returnDateTime can equal pickupDateTime (same-day bookings allowed).
    if (returnDateTime < pickupDateTime) {
      return res.status(400).json({ success: false, message: "Return time cannot be earlier than pickup time." });
    }

    const cleanContactNumber = (req.user?.contactNumber || "").toString().replace(/\D/g, "");
    if (!cleanContactNumber || cleanContactNumber.length < 10 || cleanContactNumber.length > 13) {
      return res.status(400).json({ success: false, message: "Your profile contact number is missing or invalid. Please update your profile." });
    }

    const isAvailable = await checkAvailability(
      gown,
      pickupDateTime,
      returnDateTime,
      { laundryDays: isTrial ? 0 : gownData.laundryDays, isTrial }
    );
    if (!isAvailable) {
      // Laundry buffer days do not apply to trials.
      if (!isTrial && gownData.laundryDays > 0) {
        // Check if it's specifically a laundry day conflict by checking if any date in range is a laundry day
        const laundryDateSet = await getLaundryDates(gown, gownData.laundryDays);
        let isLaundryConflict = false;

        // Check each day in the requested range
        for (let d = new Date(pickupDateTime); d <= returnDateTime; d.setDate(d.getDate() + 1)) {
          if (laundryDateSet.has(toLocalDateString(d))) {
            isLaundryConflict = true;
            break;
          }
        }

        if (isLaundryConflict) {
          return res.json({ success: false, message: "This gown is in laundry on one or more of your selected dates. Laundry days are fully blocked and cannot be booked." });
        }
      }

      return res.json({ success: false, message: "This gown is already reserved during your selected dates." });
    }

    // Dynamic rental pricing based on number of days selected
    // Grace period: if return is within 1 hour of pickup time, still counts as same day (1 day)
    const msDiff = returnDateTime.getTime() - pickupDateTime.getTime();
    const hoursDiff = msDiff / (60 * 60 * 1000); // Convert to hours
    const rawDays = msDiff / DAY_IN_MS;
    
    // If return is within 1 hour of pickup, count as 1 day (grace period)
    // Otherwise, round up to the next day
    let rentalDays;
    if (hoursDiff <= 1) {
      rentalDays = 1; // 1-hour grace period = still 1 day
    } else {
      rentalDays = Math.max(1, Math.ceil(rawDays));
    }
    
    const pricePerDay = gownData.pricePerDay || gownData.price || 0;
    const price = rentalDays * pricePerDay;

    // Determine booking type
    const finalBookingType = isTrial ? 'trial' : 'reservation';

    // For trial bookings, the hold expires at the end of the 30-minute try-on slot.
    const finalReturnDateTime = returnDateTime;
    const trialExpiresAt = isTrial ? new Date(finalReturnDateTime) : undefined;

    // Upload payment screenshot to ImageKit (GCash only)
    let screenshotUrl = '';
    if (isGcash) {
      try {
        const fs = await import('fs');
        let fileBuffer;

        if (req.file?.buffer) {
          fileBuffer = req.file.buffer;
        } else if (req.file?.path) {
          fileBuffer = fs.readFileSync(req.file.path);
        } else {
          throw new Error('No file buffer or path available');
        }

        const uploadResponse = await imageKit.upload({
          file: fileBuffer.toString('base64'),
          fileName: `payment_${_id}_${Date.now()}.${req.file.mimetype.split('/')[1]}`,
          folder: '/payment_screenshots'
        });
        screenshotUrl = uploadResponse.url;

        if (req.file.path) {
          fs.unlinkSync(req.file.path);
        }
      } catch (uploadError) {
        console.error('ImageKit upload error:', uploadError);
        return res.status(500).json({ success: false, message: "Failed to upload payment screenshot" });
      }

      // Check for duplicate reference numbers
      const existingPayment = await Booking.findOne({
        'payment.transactionRef': paymentInfo.transactionRef
      });
      if (existingPayment) {
        return res.status(400).json({
          success: false,
          message: "This reference number has already been used. Please check your transaction."
        });
      }
    }

    const newBooking = await Booking.create({
      gown,
      owner: gownData.owner,
      user: _id,
      pickupDate: pickupDateTime,
      returnDate: finalReturnDateTime,
      pickupTime,
      returnTime: effectiveReturnTime,
      price: isTrial ? 0 : price,
      bookingType: finalBookingType,
      trialExpiresAt,
      contactNumber: cleanContactNumber,
      measurements: measurements || {},
      payment: {
        method: isInStore || isTrial ? 'in_store' : 'gcash',
        depositAmount: isTrial ? 0 : (paymentInfo.depositAmount || Math.round(price * 0.5)),
        totalAmount: isTrial ? 0 : (paymentInfo.totalAmount || price),
        remainingBalance: isTrial ? 0 : (paymentInfo.remainingBalance || (price - Math.round(price * 0.5))),
        transactionRef: isGcash ? paymentInfo.transactionRef : undefined,
        screenshot: isGcash ? screenshotUrl : undefined,
        status: isGcash ? 'pending' : 'pending'
      },
      status: isTrial ? 'trial' : 'pending'
    });

    // Do NOT toggle gown.available here; availability is per-date.
    // The gown will be marked unavailable when a booking is confirmed.

    // Populate gown and owner for the response
    const populatedBooking = await Booking.findById(newBooking._id)
      .populate('gown')
      .populate('owner', 'name')
      .populate('user', 'name email')
    
    res.json({ success: true, message: "Booking Created", booking: populatedBooking, Booking: populatedBooking });

  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

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

    const gown = await Gown.findById(gownId).select('laundryDays name');
    if (!gown) {
      return res.status(404).json({ success: false, message: "Gown not found" });
    }

    const laundryDays = (String(bookingType || '').toLowerCase() === 'trial') ? 0 : Number(gown.laundryDays || 0);
    
    // Build a set of all blocked dates (Booking dates + laundry days)
    const blockedDates = new Set();
    // Reuse the existing `now` declared above for past-time checks
    
    // Build query to exclude the current booking when rescheduling/extending
    const query = {
      gown: gownId,
      status: { $ne: "canceled" },
      $or: [
        { status: { $ne: 'trial' } },
        { status: 'trial', trialExpiresAt: { $gt: now } },
        { status: 'trial', trialExpiresAt: { $exists: false } },
      ]
    };
    
    // Exclude the booking being edited from conflict check
    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }
    
    const Bookings = await Booking.find(query)
      .populate("user", "name")
      .populate("gown", "name");
    
    // Add all Booking dates (pickup through return)
    // IMPORTANT: Trial bookings should ONLY check time-based conflicts, NOT day-based conflicts
    Bookings.forEach((Booking) => {
      const isBookingTrial = Booking.status === 'trial' || Booking.bookingType === 'trial';
      const BookingStart = new Date(Booking.pickupDate);
      const BookingEnd = new Date(Booking.returnDate);
      
      // Only add dates to blockedDates for non-trial bookings
      if (!isBookingTrial) {
        for (let d = new Date(BookingStart); d <= BookingEnd; d.setDate(d.getDate() + 1)) {
          blockedDates.add(toLocalDateString(d));
        }
      }
      
      // Laundry days only apply to non-trial bookings
      if (laundryDays > 0 && !isBookingTrial) {
        for (let i = 1; i <= laundryDays; i++) {
          const laundryDate = new Date(BookingEnd);
          laundryDate.setDate(laundryDate.getDate() + i);
          blockedDates.add(toLocalDateString(laundryDate));
        }
      }
    });

    const conflictingDates = [];
    
    // For trial bookings, skip day-based checking and only do time-based
    const skipDayBasedCheck = isTrial;
    
    if (!skipDayBasedCheck) {
      for (let d = new Date(pickupDateTime); d <= returnDateTime; d.setDate(d.getDate() + 1)) {
        const dateString = toLocalDateString(d);
        if (blockedDates.has(dateString)) conflictingDates.push(dateString);
      }
    }

    // Also check for time-based conflicts on the same day
    let hasTimeConflict = false;
    let timeConflict = null;
    for (const existing of Bookings) {
      const existingStart = new Date(existing.pickupDate);
      const existingEnd = new Date(existing.returnDate);
      
      // Check if there's a time overlap using robust comparison
      if (doTimeSlotsOverlap(pickupDateTime, returnDateTime, existingStart, existingEnd)) {
        conflictingDates.push(toLocalDateString(pickupDateTime)); // Add the conflicting date
        hasTimeConflict = true;
        timeConflict = existing;
        break;
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
        return Bookings.some(Booking => {
          const returnDate = new Date(Booking.returnDate);
          for (let i = 1; i <= laundryDays; i++) {
            const laundryDate = new Date(returnDate);
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
          ? "This gown is in laundry on one or more of your selected dates. Laundry days are fully blocked and cannot be booked."
          : "This gown is already reserved during your selected dates.",
        conflict: conflict ? {
          pickupDate: conflict.pickupDate,
          returnDate: conflict.returnDate,
          pickupTime: conflict.pickupTime,
          returnTime: conflict.returnTime,
          customer: conflict.user?.name,
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

// API to list user Bookings
export const getUserBooking = async (req, res) => {
  try {
    const { _id } = req.user;
    const now = new Date();
    
    // Fetch all bookings for the user
    const allBookings = await Booking.find({ user: _id })
      .populate('gown')
      .populate('owner', 'name')
      .sort({ createdAt: -1 });

    // Filter out expired trial bookings from the list
    const Bookings = allBookings.filter(booking => {
      const isTrial = booking.status === 'trial' || booking.bookingType === 'trial';
      
      // If it's not a trial, include it
      if (!isTrial) return true;
      
      // If it's a trial, only include if it hasn't expired
      if (booking.trialExpiresAt && new Date(booking.trialExpiresAt) < now) {
        return false; // Expired trial, exclude it
      }
      
      return true; // Active trial, include it
    });

    res.json({ success: true, bookings: Bookings });

  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
}

// API to get owner Bookings
export const getOwnerBooking = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const Bookings = await Booking.find({ owner: req.user._id })
      .populate('gown')
      .populate('user', '-password')
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings: Bookings });

  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
}

// API change Booking status
export const changeBookingStatus = async (req, res) => {
  try {
    const { _id } = req.user;
    const { bookingId, status } = req.body;

    if (!bookingId || !status) {
      return res.status(400).json({ success: false, message: "Missing bookingId or status" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.owner.toString() !== _id.toString()) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const prevStatus = booking.status;

    // Track owner confirmations for Manage Booking
    if (status === 'confirmed' && !booking.pickupConfirmedAt) {
      booking.pickupConfirmedAt = new Date();
    }
    if (status === 'completed' && !booking.returnConfirmedAt) {
      booking.returnConfirmedAt = new Date();
    }

    booking.status = status;
    await booking.save();

    // NOTE: Gown status is now calculated dynamically by calculateActualGownStatus()
    // based on current date and active bookings. No need to update DB.
    // This keeps status always accurate without manual updates.

    res.json({ success: true, message: "Status Updated" });

  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
}

// Unified endpoint for both users and owners to cancel or reschedule bookings.
// Rules:
// - Users can only update their own bookings.
// - Owners can only update bookings where they are the owner.
// - Only bookings in status 'pending' or 'trial' can be rescheduled.
// - Cancel is allowed for pending/trial (and also for confirmed by owner, if needed).
export const updateBooking = async (req, res) => {
  try {
    const actor = req.user;
    const { bookingId, action, pickupDate, returnDate, pickupTime, returnTime } = req.body;

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

      const now = new Date();
      const otherBookings = await Booking.find({
        gown: booking.gown,
        _id: { $ne: booking._id },
        status: { $ne: 'canceled' },
        $or: [
          { status: { $ne: 'trial' } },
          { status: 'trial', trialExpiresAt: { $gt: now } },
          { status: 'trial', trialExpiresAt: { $exists: false } },
        ]
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
      booking.trialExpiresAt = undefined;

      // Payment handling: allow in-store paid without GCash requirements
      booking.payment.method = 'in_store';
      booking.payment.status = 'paid';
      booking.payment.transactionRef = undefined;
      booking.payment.screenshot = undefined;
      booking.payment.verifiedAt = new Date();
      booking.payment.verifiedBy = actor._id;

      await booking.save();

      // Update gown status to Reserved when trial is converted to reservation
      try {
        const gown = await Gown.findById(booking.gown);
        if (gown) {
          gown.status = 'Reserved';
          // DO NOT set gown.available = false; availability is date-based, not global
          await gown.save();
        }
      } catch (err) {
        console.error('Failed to update gown status on trial conversion:', err.message);
      }

      const populated = await Booking.findById(booking._id)
        .populate('gown')
        .populate('owner', 'name')
        .populate('user', 'name email');

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

    if (!isWithinBusinessHours(pickupTime, shopHours) || (!isTrial && !isWithinBusinessHours(effectiveReturnTime, shopHours))) {
      return res.status(400).json({ success: false, message: 'Times must be within the shop\'s operating hours and in 15-minute increments.' });
    }

    const newPickupDateTime = combineDateAndTime(pickupDate, pickupTime);
    let newReturnDateTime = combineDateAndTime(effectiveReturnDate, effectiveReturnTime);

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
      status: { $ne: 'canceled' },
      $or: [
        { status: { $ne: 'trial' } },
        { status: 'trial', trialExpiresAt: { $gt: now } },
        { status: 'trial', trialExpiresAt: { $exists: false } },
      ]
    });

    // Trial bookings: check time-slot overlap only (don't block entire days)
    // Reservation bookings: check day-level blocking + laundry days
    if (isTrial) {
      for (const b of otherBookings) {
        const existingStart = new Date(b.pickupDate);
        const existingEnd = new Date(b.returnDate);
        if (doTimeSlotsOverlap(newPickupDateTime, newReturnDateTime, existingStart, existingEnd)) {
          return res.status(409).json({ success: false, message: 'Selected time slot overlaps an existing booking. Please choose a different time.' });
        }
      }
    } else {
      const blockedDates = new Set();
      otherBookings.forEach((b) => {
        const isOtherTrial = b.status === 'trial' || b.bookingType === 'trial';
        const s = new Date(b.pickupDate);
        const e = new Date(b.returnDate);

        // Only block dates for non-trial bookings
        if (!isOtherTrial) {
          for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
            blockedDates.add(toLocalDateString(d));
          }
        }

        const laundryDays = isOtherTrial ? 0 : Math.max(gown.laundryDays || 0, 0);
        for (let i = 1; i <= laundryDays; i++) {
          const ld = new Date(e);
          ld.setDate(ld.getDate() + i);
          blockedDates.add(toLocalDateString(ld));
        }
      });

      const overlaps = dateRangeOverlapsBlocked(newPickupDateTime, newReturnDateTime, blockedDates);
      if (overlaps) {
        return res.status(409).json({ success: false, message: 'Selected schedule overlaps an existing booking/trial/laundry hold.' });
      }
    }

    booking.pickupDate = newPickupDateTime;
    booking.returnDate = newReturnDateTime;
    booking.pickupTime = pickupTime;
    booking.returnTime = isTrial ? pickupTime : effectiveReturnTime;

    if (isTrial) {
      booking.trialExpiresAt = newReturnDateTime; // 30 minutes after the appointment start
    }

    // Recalculate price based on new rental period (for non-trial bookings)
    if (!isTrial) {
      const msDiff = newReturnDateTime.getTime() - newPickupDateTime.getTime();
      const hoursDiff = msDiff / (60 * 60 * 1000);
      const rawDays = msDiff / DAY_IN_MS;
      
      // Apply 1-hour grace period for rental day calculation
      let rentalDays;
      if (hoursDiff <= 1) {
        rentalDays = 1;
      } else {
        rentalDays = Math.max(1, Math.ceil(rawDays));
      }
      
      const gownData = await Gown.findById(booking.gown).select('price pricePerDay');
      const pricePerDay = gownData.pricePerDay || gownData.price || 0;
      const newPrice = rentalDays * pricePerDay;
      
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
      .populate('user', 'name email');

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

    const gown = await Gown.findById(gownId).select('laundryDays');
    if (!gown) {
      return res.status(404).json({ success: false, message: "Gown not found" });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const Bookings = await Booking.find({
      gown: gownId,
      status: { $ne: "canceled" },
      returnDate: { $gte: today }, // Only include bookings that haven't ended yet
      $or: [
        { status: { $ne: 'trial' } },
        { status: 'trial', trialExpiresAt: { $gt: now } },
        { status: 'trial', trialExpiresAt: { $exists: false } },
      ]
    }).sort({ pickupDate: 1 });

    const unavailableDates = new Set();
    const trialTimeSlots = {}; // Maps dates to booked time slots
    const laundryHoldDates = new Set();
    const horizon = new Date(today.getTime() + 180 * DAY_IN_MS);

    const captureDate = (dateObj, targetSet) => {
      if (dateObj < today || dateObj > horizon) return;
      targetSet.add(toLocalDateString(dateObj));
    };

    Bookings.forEach((booking) => {
      const bookingStart = new Date(booking.pickupDate);
      const bookingEnd = new Date(booking.returnDate);
      const isTrial = booking.status === 'trial' || booking.bookingType === 'trial';

      if (!isTrial) {
        // Non-trial bookings block entire days
        for (
          let cursor = new Date(bookingStart);
          cursor <= bookingEnd;
          cursor.setDate(cursor.getDate() + 1)
        ) {
          // unavailableDates = reserved (pending or confirmed) for calendar highlight
          if (booking.status === 'confirmed' || booking.status === 'pending') {
            captureDate(new Date(cursor), unavailableDates);
          }
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

      // Laundry days are only after non-trial bookings
      const bufferDays = isTrial ? 0 : Math.max(gown.laundryDays || 0, 0);
      for (let i = 1; i <= bufferDays; i += 1) {
        const laundryDate = new Date(booking.returnDate);
        laundryDate.setDate(laundryDate.getDate() + i);
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

// API to verify payment (approve or reject)
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

    // For in-store (cash) payments, only allow approve action
    if (booking.payment.method === 'in_store') {
      if (action !== 'approve') {
        return res.status(400).json({ success: false, message: "Cash payments can only be approved, not rejected" });
      }
      // For in-store, mark as paid immediately (full payment collected)
      booking.payment.status = 'paid';
      booking.payment.verifiedAt = new Date();
      booking.payment.verifiedBy = _id;
    } else {
      // For GCash payments, handle as deposit (50%)
      if (action === 'approve') {
        booking.payment.status = 'verified';
        booking.payment.verifiedAt = new Date();
        booking.payment.verifiedBy = _id;
      } else {
        const reason = (rejectionReason || '').toString().trim();
        if (!reason) {
          return res.status(400).json({ success: false, message: 'Rejection reason is required when rejecting payment.' });
        }
        booking.payment.status = 'rejected';
        booking.payment.rejectionReason = reason;
        booking.status = 'canceled'; // Cancel booking if payment rejected
      }
    }

    await booking.save();

    // Update gown status when payment is approved
    // NOTE: gown.available is a global flag (owner's manual toggle) and should NOT be changed by booking status.
    // Only the gown.status field should reflect temporary booking states.
    if (action === 'approve') {
      try {
        const gown = await Gown.findById(booking.gown);
        if (gown) {
          gown.status = 'Reserved';
          // DO NOT set gown.available = false; availability is date-based, not global
          await gown.save();
        }
      } catch (err) {
        console.error('Failed to update gown status on payment approval:', err.message);
      }
    } else if (action === 'reject') {
      // If payment rejected, revert gown to Available
      try {
        const gown = await Gown.findById(booking.gown);
        if (gown) {
          gown.status = 'Available';
          // DO NOT modify gown.available; it's the owner's manual toggle
          await gown.save();
        }
      } catch (err) {
        console.error('Failed to revert gown status on payment rejection:', err.message);
      }
    }

    res.json({
      success: true,
      message: `Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to clean up expired trial bookings (can be called periodically or by maintainer)
export const cleanupExpiredTrials = async (req, res) => {
  try {
    const now = new Date();
    
    // Find expired trial bookings
    const expiredTrials = await Booking.find({
      status: 'trial',
      trialExpiresAt: { $lt: now }
    });

    if (expiredTrials.length === 0) {
      return res.json({ success: true, message: "No expired trials to clean up", cleanedCount: 0 });
    }

    // Mark them as expired
    const result = await Booking.updateMany(
      {
        status: 'trial',
        trialExpiresAt: { $lt: now }
      },
      {
        $set: { status: 'expired' }
      }
    );

    res.json({
      success: true,
      message: `Cleaned up ${result.modifiedCount} expired trial bookings`,
      cleanedCount: result.modifiedCount
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Calculate actual gown status based on current time and bookings
// Status rules (non-trial bookings only):
// - Before pickupDateTime: "Reserved"
// - Between pickupDateTime and returnDateTime: "In-Use"
// - After returnDateTime but booking not completed: "In-Use" (overdue)
// - Completed booking and now within laundryDays after returnDateTime: "In-Laundry"
// - Otherwise (no active bookings in window): "Available"
export const calculateActualGownStatus = async (gownId) => {
  try {
    const now = new Date();

    const gown = await Gown.findById(gownId).select('laundryDays');
    if (!gown) return 'Available';

    // Get only CONFIRMED bookings (not pending, trial, expired, or canceled)
    // Only confirmed bookings should block gown availability
    // Also filter to only include bookings within laundry window or future (ignore old unclosed bookings)
    const laundryWindowMs = (gown.laundryDays || 0) * 24 * 60 * 60 * 1000;
    const bookings = await Booking.find({
      gown: gownId,
      status: 'confirmed',
      returnDate: { $gte: new Date(Date.now() - laundryWindowMs) }
    }).sort({ pickupDate: 1 });

    // Only consider confirmed bookings - these are the only ones that affect gown availability
    for (const booking of bookings) {
      const pickupDateTime = combineDateAndTime(booking.pickupDate, booking.pickupTime || '09:00');
      const returnDateTime = combineDateAndTime(
        booking.returnDate,
        booking.returnTime || booking.pickupTime || '09:00'
      );

      if (!pickupDateTime || !returnDateTime) continue;

      // Upcoming booking: block as Reserved
      if (now < pickupDateTime) {
        return 'Reserved';
      }

      // During booking window
      if (now >= pickupDateTime && now <= returnDateTime) {
        return 'In-Use';
      }

      // After return time - check if overdue (confirmed but not marked completed)
      if (now > returnDateTime) {
        if (booking.status !== 'completed') {
          return 'In-Use'; // Overdue booking
        }

        // Completed booking – check laundry window
        const laundryDays = gown.laundryDays || 0;
        if (laundryDays > 0) {
          const laundryEndDate = new Date(returnDateTime);
          laundryEndDate.setDate(laundryEndDate.getDate() + laundryDays);
          if (now <= laundryEndDate) {
            return 'In-Laundry';
          }
        }
        // Past laundry window: continue checking other bookings
      }
    }

    // No active confirmed bookings affecting current time
    return 'Available';
  } catch (error) {
    console.error('Error calculating gown status:', error);
    return 'Available'; // Default to Available if error
  }
};
