import Booking from "../models/booking.js";
import Gown from "../models/Gown.js";
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

const isWithinBusinessHours = (timeValue) => {
  if (!timeValue) return false;
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return false;
  const totalMinutes = hours * 60 + minutes;
  const minMinutes = 9 * 60; // 09:00
  const maxMinutes = 19 * 60; // 19:00 (7 PM)
  return totalMinutes >= minMinutes && totalMinutes <= maxMinutes && minutes % 15 === 0;
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
  
  // Get all Bookings
  const now = new Date();
  const Bookings = await Booking.find({
    gown,
    status: { $ne: "canceled" },
    $or: [
      { status: { $ne: 'trial' } },
      { status: 'trial', trialExpiresAt: { $gt: now } },
      { status: 'trial', trialExpiresAt: { $exists: false } },
    ]
  });

  // Build a set of all blocked dates (Booking dates + laundry days)
  const blockedDates = new Set();

  // Add all Booking dates (pickup through return)
  Bookings.forEach((Booking) => {
    const BookingStart = new Date(Booking.pickupDate);
    const BookingEnd = new Date(Booking.returnDate);
    for (let d = new Date(BookingStart); d <= BookingEnd; d.setDate(d.getDate() + 1)) {
      blockedDates.add(toLocalDateString(d));
    }
    if (laundryDays > 0) {
      for (let i = 1; i <= laundryDays; i++) {
        const laundryDate = new Date(BookingEnd);
        laundryDate.setDate(laundryDate.getDate() + i);
        blockedDates.add(toLocalDateString(laundryDate));
      }
    }
  });

  // Check for date conflicts
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (blockedDates.has(toLocalDateString(d))) return false;
  }

  // Check for time-based conflicts on the same day
  // Two time ranges overlap if: start1 < end2 AND end1 > start2
  for (const Booking of Bookings) {
    const bookingStart = new Date(Booking.pickupDate);
    const bookingEnd = new Date(Booking.returnDate);
    
    // Only check same-day time conflicts if both bookings are on the same date
    if (toLocalDateString(start) === toLocalDateString(bookingStart)) {
      if (start < bookingEnd && end > bookingStart) {
        return false; // Time conflict
      }
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

    if (!isWithinBusinessHours(pickupTime) || (!isTrial && !isWithinBusinessHours(effectiveReturnTime))) {
      return res.status(400).json({ success: false, message: "Selected times must be between 09:00 and 19:00 in 15-minute intervals." });
    }

    const pickupDateTime = combineDateAndTime(pickupDate, pickupTime);
    // For trials, return date is same as pickup date (single-day); use normalizedReturnDate so we don't rely on undefined returnDate.
    let returnDateTime = combineDateAndTime(normalizedReturnDate, effectiveReturnTime);

    if (!pickupDateTime || !returnDateTime) {
      return res.status(400).json({ success: false, message: "Invalid pickup or return date." });
    }

    // Trial bookings are 1-hour appointment slots (only block the time slot, not the entire day).
    if (isTrial) {
      returnDateTime = new Date(pickupDateTime.getTime() + 60 * 60 * 1000); // 1 hour after pickup
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

    const gownData = await Gown.findById(gown);
    if (!gownData) {
      return res.status(404).json({ success: false, message: "Gown not found" });
    }

    const isAvailable = await checkAvailability(
      gown,
      pickupDateTime,
      returnDateTime,
      { laundryDays: isTrial ? 0 : gownData.laundryDays }
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

    // For trial bookings, we hold only for the appointment date/time.
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

    if (!isWithinBusinessHours(pickupTime) || !isWithinBusinessHours(effectiveReturnTime)) {
      return res.status(400).json({ success: false, message: "Times must be between 09:00 and 19:00 in 15-minute increments." });
    }

    const pickupDateTime = combineDateAndTime(pickupDate, pickupTime);
    let returnDateTime = combineDateAndTime(effectiveReturnDate, effectiveReturnTime);

    if (isTrial) {
      returnDateTime = new Date(pickupDateTime.getTime() + 60 * 60 * 1000); // 1 hour after pickup for trials
    }

    // For trials, return must be strictly after pickup (appointment has duration).
    // For reservations, return can equal pickup (same-day bookings allowed).
    if (returnDateTime < pickupDateTime) {
      return res.status(400).json({ success: false, message: "Return time cannot be earlier than pickup time." });
    }

    const gown = await Gown.findById(gownId).select('laundryDays name');
    if (!gown) {
      return res.status(404).json({ success: false, message: "Gown not found" });
    }

    const laundryDays = (String(bookingType || '').toLowerCase() === 'trial') ? 0 : Number(gown.laundryDays || 0);
    
    // Build a set of all blocked dates (Booking dates + laundry days)
    const blockedDates = new Set();
    const now = new Date();
    
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
    Bookings.forEach((Booking) => {
      const BookingStart = new Date(Booking.pickupDate);
      const BookingEnd = new Date(Booking.returnDate);
      for (let d = new Date(BookingStart); d <= BookingEnd; d.setDate(d.getDate() + 1)) {
        blockedDates.add(toLocalDateString(d));
      }
      if (laundryDays > 0) {
        for (let i = 1; i <= laundryDays; i++) {
          const laundryDate = new Date(BookingEnd);
          laundryDate.setDate(laundryDate.getDate() + i);
          blockedDates.add(toLocalDateString(laundryDate));
        }
      }
    });

    const conflictingDates = [];
    for (let d = new Date(pickupDateTime); d <= returnDateTime; d.setDate(d.getDate() + 1)) {
      const dateString = toLocalDateString(d);
      if (blockedDates.has(dateString)) conflictingDates.push(dateString);
    }

    // Also check for time-based conflicts on the same day
    let hasTimeConflict = false;
    let timeConflict = null;
    for (const existing of Bookings) {
      const existingStart = new Date(existing.pickupDate);
      const existingEnd = new Date(existing.returnDate);
      
      // Check if there's a time overlap
      if (pickupDateTime < existingEnd && returnDateTime > existingStart) {
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
    const Bookings = await Booking.find({ user: _id })
      .populate('gown')
      .populate('owner', 'name')
      .sort({ createdAt: -1 });

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

    // Automatically update gown status based on booking lifecycle
    // NOTE: gown.available is a global flag (owner's manual toggle) and should NOT be changed by booking status.
    // Only the gown.status field should reflect temporary booking states.
    // Date-based availability is checked through booking conflict detection.
    try {
      const gown = await Gown.findById(booking.gown);
      if (gown) {
        // Set gown status based on booking status
        if (status === 'confirmed') {
          // Booking confirmed (picked up) → gown is In-Use
          gown.status = 'In-Use';
          // DO NOT set gown.available = false; availability is date-based, not global
        } else if (status === 'completed') {
          // Booking completed (returned) → gown is In-Laundry
          gown.status = 'In-Laundry';
          // DO NOT set gown.available = false; availability is date-based, not global
        } else if (status === 'canceled') {
          // Booking canceled → check if gown should go back to Available
          const overlapping = await Booking.findOne({
            gown: booking.gown,
            status: { $in: ['confirmed', 'completed'] },
            _id: { $ne: bookingId }
          });
          if (!overlapping) {
            gown.status = 'Available';
            // DO NOT modify gown.available; it's the owner's manual toggle
          }
        } else if (status === 'pending') {
          // Pending bookings don't affect status yet, keep as is or set to Reserved
          gown.status = 'Reserved';
          // DO NOT set gown.available = false; availability is date-based, not global
        } else if (status === 'trial') {
          // Trial hold → gown status becomes Reserved
          gown.status = 'Reserved';
          // DO NOT set gown.available = false; availability is date-based, not global
        }
        
        await gown.save();
      }
    } catch (err) {
      console.error('Failed to update gown status on booking status change:', err.message);
    }

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
        const s = new Date(b.pickupDate);
        const e = new Date(b.returnDate);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          blockedDates.add(d.toISOString().split('T')[0]);
        }
        const laundryDays = (b.status === 'trial' || b.bookingType === 'trial') ? 0 : Math.max(gown.laundryDays || 0, 0);
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

    if (!isWithinBusinessHours(pickupTime) || (!isTrial && !isWithinBusinessHours(effectiveReturnTime))) {
      return res.status(400).json({ success: false, message: 'Times must be between 09:00 and 19:00 in 15-minute increments.' });
    }

    const newPickupDateTime = combineDateAndTime(pickupDate, pickupTime);
    let newReturnDateTime = combineDateAndTime(effectiveReturnDate, effectiveReturnTime);

    if (!newPickupDateTime || !newReturnDateTime) {
      return res.status(400).json({ success: false, message: 'Invalid pickup or return date.' });
    }

    if (isTrial) {
      newReturnDateTime = new Date(newPickupDateTime);
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

    const blockedDates = new Set();
    otherBookings.forEach((b) => {
      const s = new Date(b.pickupDate);
      const e = new Date(b.returnDate);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        blockedDates.add(toLocalDateString(d));
      }
      const laundryDays = (b.status === 'trial' || b.bookingType === 'trial') ? 0 : Math.max(gown.laundryDays || 0, 0);
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

    booking.pickupDate = newPickupDateTime;
    booking.returnDate = newReturnDateTime;
    booking.pickupTime = pickupTime;
    booking.returnTime = isTrial ? pickupTime : effectiveReturnTime;

    if (isTrial) {
      booking.trialExpiresAt = newReturnDateTime;
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
    const Bookings = await Booking.find({
      gown: gownId,
      status: { $ne: "canceled" },
      $or: [
        { status: { $ne: 'trial' } },
        { status: 'trial', trialExpiresAt: { $gt: now } },
        { status: 'trial', trialExpiresAt: { $exists: false } },
      ]
    }).sort({ pickupDate: 1 });

    const unavailableDates = new Set();
    const trialHoldDates = new Set();
    const laundryHoldDates = new Set();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today.getTime() + 180 * DAY_IN_MS);

    const captureDate = (dateObj, targetSet) => {
      if (dateObj < today || dateObj > horizon) return;
      targetSet.add(toLocalDateString(dateObj));
    };

    Bookings.forEach((booking) => {
      const bookingStart = new Date(booking.pickupDate);
      const bookingEnd = new Date(booking.returnDate);
      const isTrial = booking.status === 'trial' || booking.bookingType === 'trial';

      for (
        let cursor = new Date(bookingStart);
        cursor <= bookingEnd;
        cursor.setDate(cursor.getDate() + 1)
      ) {
        if (isTrial) {
          captureDate(new Date(cursor), trialHoldDates);
        } else {
          // unavailableDates = reserved (pending or confirmed) for calendar highlight
          if (booking.status === 'confirmed' || booking.status === 'pending') {
            captureDate(new Date(cursor), unavailableDates);
          }
        }
      }

      // Laundry days are fully blocked - add to both sets
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
        trialHoldDates: Array.from(trialHoldDates).sort(),
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
        booking.payment.status = 'rejected';
        booking.payment.rejectionReason = rejectionReason || 'Payment verification failed';
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
