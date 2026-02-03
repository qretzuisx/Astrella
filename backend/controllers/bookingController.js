import Booking from "../models/booking.js";
import Gown from "../models/Gown.js";
import imageKit from "../configs/imagekit.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

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
    // Add each laundry day after return date
    for (let i = 1; i <= laundryDays; i++) {
      const laundryDate = new Date(returnDate);
      laundryDate.setDate(laundryDate.getDate() + i);
      // Convert to YYYY-MM-DD format
      const dateString = laundryDate.toISOString().split('T')[0];
      laundryDateSet.add(dateString);
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
    const dateString = d.toISOString().split('T')[0];
    if (blockedDateSet.has(dateString)) {
      return true;
    }
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
      blockedDates.add(d.toISOString().split('T')[0]);
    }

    // Add laundry days after return
    if (laundryDays > 0) {
      for (let i = 1; i <= laundryDays; i++) {
        const laundryDate = new Date(BookingEnd);
        laundryDate.setDate(laundryDate.getDate() + i);
        blockedDates.add(laundryDate.toISOString().split('T')[0]);
      }
    }
  });

  // Check if requested date range overlaps with any blocked dates
  const requestedStartString = start.toISOString().split('T')[0];
  const requestedEndString = end.toISOString().split('T')[0];
  
  // Check each day in the requested range
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split('T')[0];
    if (blockedDates.has(dateString)) {
      return false; // Date is blocked
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

    if (!gown || !pickupDate || !returnDate || !pickupTime) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

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

    const effectiveReturnTime = returnTime || pickupTime;

    if (!isWithinBusinessHours(pickupTime) || (!isTrial && !isWithinBusinessHours(effectiveReturnTime))) {
      return res.status(400).json({ success: false, message: "Selected times must be between 09:00 and 19:00 in 15-minute intervals." });
    }

    const pickupDateTime = combineDateAndTime(pickupDate, pickupTime);
    let returnDateTime = combineDateAndTime(returnDate, effectiveReturnTime);

    if (!pickupDateTime || !returnDateTime) {
      return res.status(400).json({ success: false, message: "Invalid pickup or return date." });
    }

    // Trial bookings always reserve a 2-day in-store fitting window starting at pickup.
    if (isTrial) {
      returnDateTime = new Date(pickupDateTime.getTime() + 2 * DAY_IN_MS);
    }

    if (returnDateTime <= pickupDateTime) {
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
      { laundryDays: gownData.laundryDays }
    );
    if (!isAvailable) {
      // Check if it's specifically a laundry day conflict by checking if any date in range is a laundry day
      const laundryDateSet = await getLaundryDates(gown, gownData.laundryDays);
      let isLaundryConflict = false;
      
      // Check each day in the requested range
      for (let d = new Date(pickupDateTime); d <= returnDateTime; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().split('T')[0];
        if (laundryDateSet.has(dateString)) {
          isLaundryConflict = true;
          break;
        }
      }
      
      if (isLaundryConflict) {
        return res.json({ success: false, message: "This gown is in laundry on one or more of your selected dates. Laundry days are fully blocked and cannot be booked." });
      }
      return res.json({ success: false, message: "This gown is already reserved during your selected dates." });
    }

    // Dynamic rental pricing based on number of days selected
    const msDiff = returnDateTime.getTime() - pickupDateTime.getTime();
    const rawDays = msDiff / DAY_IN_MS;
    const rentalDays = Math.max(1, Math.ceil(rawDays));
    const pricePerDay = gownData.pricePerDay || gownData.price || 0;
    const price = rentalDays * pricePerDay;

    // Determine booking type
    const finalBookingType = isTrial ? 'trial' : 'reservation';

    // For trial bookings, we always hold for 2 days (in-store fitting window)
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
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const validateBookingWindow = async (req, res) => {
  try {
    const { gownId, pickupDate, returnDate, pickupTime, returnTime } = req.body;
    const effectiveReturnTime = returnTime || pickupTime;
    if (!gownId || !pickupDate || !returnDate || !pickupTime) {
      return res.status(400).json({ success: false, message: "Please select pickup and return dates and a pickup time." });
    }

    if (!isWithinBusinessHours(pickupTime) || !isWithinBusinessHours(effectiveReturnTime)) {
      return res.status(400).json({ success: false, message: "Times must be between 09:00 and 19:00 in 15-minute increments." });
    }

    const pickupDateTime = combineDateAndTime(pickupDate, pickupTime);
    const returnDateTime = combineDateAndTime(returnDate, effectiveReturnTime);

    if (returnDateTime <= pickupDateTime) {
      return res.status(400).json({ success: false, message: "Return time cannot be earlier than pickup time." });
    }

    const gown = await Gown.findById(gownId).select('laundryDays name');
    if (!gown) {
      return res.status(404).json({ success: false, message: "Gown not found" });
    }

    const laundryDays = Number(gown.laundryDays || 0);
    
    // Build a set of all blocked dates (Booking dates + laundry days)
    const blockedDates = new Set();
    const now = new Date();
    const Bookings = await Booking.find({
      gown: gownId,
      status: { $ne: "canceled" },
      $or: [
        { status: { $ne: 'trial' } },
        { status: 'trial', trialExpiresAt: { $gt: now } },
        { status: 'trial', trialExpiresAt: { $exists: false } },
      ]
    })
      .populate("user", "name")
      .populate("gown", "name");
    
    // Add all Booking dates (pickup through return)
    Bookings.forEach((Booking) => {
      const BookingStart = new Date(Booking.pickupDate);
      const BookingEnd = new Date(Booking.returnDate);
      for (let d = new Date(BookingStart); d <= BookingEnd; d.setDate(d.getDate() + 1)) {
        blockedDates.add(d.toISOString().split('T')[0]);
      }
    
      // Add laundry days after return (fully blocked)
      if (laundryDays > 0) {
        for (let i = 1; i <= laundryDays; i++) {
          const laundryDate = new Date(BookingEnd);
          laundryDate.setDate(laundryDate.getDate() + i);
          blockedDates.add(laundryDate.toISOString().split('T')[0]);
        }
      }
    });

    // Check if requested date range overlaps with any blocked dates
    const requestedStartString = pickupDateTime.toISOString().split('T')[0];
    const requestedEndString = returnDateTime.toISOString().split('T')[0];
    
    // Check each day in the requested range
    const conflictingDates = [];
    for (let d = new Date(pickupDateTime); d <= returnDateTime; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0];
      if (blockedDates.has(dateString)) {
        conflictingDates.push(dateString);
      }
    }

    if (conflictingDates.length > 0) {
      // Find which Booking caused the conflict
      const conflict = Bookings.find((existing) => {
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
            if (laundryDate.toISOString().split('T')[0] === dateStr) {
              return true;
            }
          }
          return false;
        });
      });

      return res.status(409).json({
        success: false,
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

    return res.json({ success: true, message: "Selected schedule is available." });
  } catch (error) {
    console.log(error.message);
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
    console.log(error.message);
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
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
}

// API change Booking status
export const changeBookingStatus = async (req, res) => {
  try {
    const { _id } = req.user;
    const { BookingId, status } = req.body;

    if (!BookingId || !status) {
      return res.status(400).json({ success: false, message: "Missing BookingId or status" });
    }

    const Booking = await Booking.findById(BookingId);
    if (!Booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (Booking.owner.toString() !== _id.toString()) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const prevStatus = Booking.status;

    // Track owner confirmations for Manage Booking
    if (status === 'confirmed' && !Booking.pickupConfirmedAt) {
      Booking.pickupConfirmedAt = new Date();
    }
    if (status === 'completed' && !Booking.returnConfirmedAt) {
      Booking.returnConfirmedAt = new Date();
    }

    Booking.status = status;
    await Booking.save();

    // Keep a simple gown-level availability flag in sync for listing visibility.
    try {
      const gown = await Gown.findById(Booking.gown);
    
      // When a Booking is confirmed (pickup), ensure the gown is generally not
      // listed as freely available, as it is now in active use.
      if (status === 'confirmed') {
        gown.available = false;
        await gown.save();
      }
    
      // If Booking is canceled or completed and was previously confirmed,
      // try to make the gown available again if there is no other confirmed Booking.
      if ((status === 'canceled' || status === 'completed') && prevStatus === 'confirmed') {
        const overlapping = await Booking.findOne({
          gown: Booking.gown,
          status: 'confirmed',
        });
        if (!overlapping) {
          gown.available = true;
          await gown.save();
        }
      }
    } catch (err) {
      console.error('Failed to update gown availability on status change:', err.message);
    }

    res.json({ success: true, message: "Status Updated" });

  } catch (error) {
    console.log(error.message);
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
        const laundryDays = Math.max(gown.laundryDays || 0, 0);
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

      const populated = await Booking.findById(booking._id)
        .populate('gown')
        .populate('owner', 'name')
        .populate('user', 'name email');

      return res.json({ success: true, message: 'Trial finalized as reservation', booking: populated });
    }

    if (action !== 'reschedule') {
      return res.status(400).json({ success: false, message: 'Invalid action. Use cancel, reschedule, or convert_to_reservation.' });
    }

    // Only allow reschedule on pending/trial bookings
    if (!['pending', 'trial'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Only pending or trial bookings can be rescheduled.' });
    }

    if (!pickupDate || !returnDate || !pickupTime || !returnTime) {
      return res.status(400).json({ success: false, message: 'pickupDate, returnDate, pickupTime, returnTime are required for reschedule.' });
    }

    if (!isWithinBusinessHours(pickupTime) || !isWithinBusinessHours(returnTime)) {
      return res.status(400).json({ success: false, message: 'Times must be between 09:00 and 19:00 in 15-minute increments.' });
    }

    const newPickupDateTime = combineDateAndTime(pickupDate, pickupTime);
    let newReturnDateTime = combineDateAndTime(returnDate, returnTime);

    if (!newPickupDateTime || !newReturnDateTime) {
      return res.status(400).json({ success: false, message: 'Invalid pickup or return date.' });
    }

    const isTrial = booking.status === 'trial' || booking.bookingType === 'trial';
    if (isTrial) {
      newReturnDateTime = new Date(newPickupDateTime.getTime() + 2 * DAY_IN_MS);
    }

    if (newReturnDateTime <= newPickupDateTime) {
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
        blockedDates.add(d.toISOString().split('T')[0]);
      }
      const laundryDays = Math.max(gown.laundryDays || 0, 0);
      for (let i = 1; i <= laundryDays; i++) {
        const ld = new Date(e);
        ld.setDate(ld.getDate() + i);
        blockedDates.add(ld.toISOString().split('T')[0]);
      }
    });

    const overlaps = dateRangeOverlapsBlocked(newPickupDateTime, newReturnDateTime, blockedDates);
    if (overlaps) {
      return res.status(409).json({ success: false, message: 'Selected schedule overlaps an existing booking/trial/laundry hold.' });
    }

    booking.pickupDate = newPickupDateTime;
    booking.returnDate = newReturnDateTime;
    booking.pickupTime = pickupTime;
    booking.returnTime = returnTime;

    if (isTrial) {
      booking.trialExpiresAt = newReturnDateTime;
    }

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('gown')
      .populate('owner', 'name')
      .populate('user', 'name email');

    return res.json({ success: true, message: 'Booking updated', booking: populated });

  } catch (error) {
    console.log(error.message);
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
      if (dateObj < today || dateObj > horizon) {
        return;
      }
      targetSet.add(dateObj.toISOString().split('T')[0]);
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
          // unavailableDates = confirmed reservations (red)
          if (booking.status === 'confirmed') {
            captureDate(new Date(cursor), unavailableDates);
          }
        }
      }

      // Laundry days are fully blocked - add to both sets
      const bufferDays = Math.max(gown.laundryDays || 0, 0);
      for (let i = 1; i <= bufferDays; i += 1) {
        const laundryDate = new Date(booking.returnDate);
        laundryDate.setDate(laundryDate.getDate() + i);
        const dateString = laundryDate.toISOString().split('T')[0];
        if (laundryDate >= today && laundryDate <= horizon) {
          laundryHoldDates.add(dateString);
        }
        // laundry days are blocked but should be surfaced separately (blue)
        // Do not add them into unavailableDates; frontend will block using laundryHoldDates.
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
    console.log(error.message);
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

    const Booking = await Booking.findById(BookingId);
    if (!Booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify owner authorization
    if (Booking.owner.toString() !== _id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Check if payment exists
    if (!Booking.payment) {
      return res.status(400).json({ success: false, message: "No payment information found" });
    }

    // Update payment status
    if (action === 'approve') {
      Booking.payment.status = 'verified';
      Booking.payment.verifiedAt = new Date();
      Booking.payment.verifiedBy = _id;
      // Keep status as 'pending' - owner still needs to confirm pickup separately
    } else {
      Booking.payment.status = 'rejected';
      Booking.payment.rejectionReason = rejectionReason || 'Payment verification failed';
      Booking.status = 'canceled'; // Cancel Booking if payment rejected
    }

    await Booking.save();

    res.json({
      success: true,
      message: `Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    });

  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
