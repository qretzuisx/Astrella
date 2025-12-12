import Booking from "../models/booking.js";
import Gown from "../models/Gown.js";
import imageKit from "../configs/imagekit.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const combineDateAndTime = (dateValue, timeValue) => {
  if (!dateValue) return null;
  const safeTime = timeValue || "09:00";
  const isoString = `${new Date(dateValue).toISOString().split("T")[0]}T${safeTime}`;
  return new Date(isoString);
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
  const Bookings = await Booking.find({
    gown: gownId,
    status: { $ne: "canceled" },
  });

  Bookings.forEach((Booking) => {
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
  const Bookings = await Booking.find({
    gown,
    status: { $ne: "canceled" },
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
    const { gown, pickupDate, returnDate, pickupTime, returnTime, contactNumber } = req.body;

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

    if (!gown || !pickupDate || !returnDate || !pickupTime || !returnTime) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Validate payment information
    if (!paymentInfo.transactionRef || paymentInfo.transactionRef.length < 10) {
      return res.status(400).json({ success: false, message: "Valid GCash reference number is required" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Payment screenshot is required" });
    }

    if (!isWithinBusinessHours(pickupTime) || !isWithinBusinessHours(returnTime)) {
      return res.status(400).json({ success: false, message: "Selected times must be between 09:00 and 19:00 in 15-minute intervals." });
    }

    const pickupDateTime = combineDateAndTime(pickupDate, pickupTime);
    const returnDateTime = combineDateAndTime(returnDate, returnTime);

    if (!pickupDateTime || !returnDateTime) {
      return res.status(400).json({ success: false, message: "Invalid pickup or return date." });
    }

    if (returnDateTime <= pickupDateTime) {
      return res.status(400).json({ success: false, message: "Return time cannot be earlier than pickup time." });
    }

    const cleanContactNumber = (contactNumber || "").toString().replace(/\D/g, "");
    if (!cleanContactNumber || cleanContactNumber.length < 10 || cleanContactNumber.length > 13) {
      return res.status(400).json({ success: false, message: "Contact number must be 10-13 digits." });
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

    // Upload payment screenshot to ImageKit
    let screenshotUrl = '';
    try {
      // Read file from disk (multer diskStorage)
      const fs = await import('fs');
      let fileBuffer;
      
      if (req.file.buffer) {
        // Memory storage
        fileBuffer = req.file.buffer;
      } else if (req.file.path) {
        // Disk storage
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
      
      // Clean up temporary file if using disk storage
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

    const newBooking = await Booking.create({
      gown,
      owner: gownData.owner,
      user: _id,
      pickupDate: pickupDateTime,
      returnDate: returnDateTime,
      pickupTime,
      returnTime,
      price,
      contactNumber: cleanContactNumber,
      measurements: measurements || {},
      payment: {
        method: 'gcash',
        depositAmount: paymentInfo.depositAmount || Math.round(price * 0.5),
        totalAmount: paymentInfo.totalAmount || price,
        remainingBalance: paymentInfo.remainingBalance || (price - Math.round(price * 0.5)),
        transactionRef: paymentInfo.transactionRef,
        screenshot: screenshotUrl,
        status: 'pending'
      }
    });

    // Do NOT toggle gown.available here; availability is per-date.
    // The gown will be marked unavailable when a booking is confirmed.

    // Populate gown and owner for the response
    const populatedBooking = await Booking.findById(newBooking._id)
      .populate('gown')
      .populate('owner', 'name')
      .populate('user', 'name email')
    
    res.json({ success: true, message: "Booking Created - Payment pending verification", Booking: populatedBooking });

  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const validateBookingWindow = async (req, res) => {
  try {
    const { gownId, pickupDate, returnDate, pickupTime, returnTime } = req.body;
    if (!gownId || !pickupDate || !returnDate || !pickupTime || !returnTime) {
      return res.status(400).json({ success: false, message: "Please select pickup and return dates and times." });
    }

    if (!isWithinBusinessHours(pickupTime) || !isWithinBusinessHours(returnTime)) {
      return res.status(400).json({ success: false, message: "Times must be between 09:00 and 19:00 in 15-minute increments." });
    }

    const pickupDateTime = combineDateAndTime(pickupDate, pickupTime);
    const returnDateTime = combineDateAndTime(returnDate, returnTime);

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
    const Bookings = await Booking.find({
      gown: gownId,
      status: { $ne: "canceled" },
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

    res.json({ success: true, Bookings });

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

    res.json({ success: true, Bookings });

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

    const Bookings = await Booking.find({
      gown: gownId,
      status: { $ne: "canceled" }
    }).sort({ pickupDate: 1 });

    const unavailableDates = new Set();
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

    Bookings.forEach((Booking) => {
      const BookingStart = new Date(Booking.pickupDate);
      const BookingEnd = new Date(Booking.returnDate);
      for (
        let cursor = new Date(BookingStart);
        cursor <= BookingEnd;
        cursor.setDate(cursor.getDate() + 1)
      ) {
        captureDate(new Date(cursor), unavailableDates);
      }
    
      // Laundry days are fully blocked - add to both sets
      const bufferDays = Math.max(gown.laundryDays || 0, 0);
      for (let i = 1; i <= bufferDays; i += 1) {
        const laundryDate = new Date(Booking.returnDate);
        laundryDate.setDate(laundryDate.getDate() + i);
        const dateString = laundryDate.toISOString().split('T')[0];
        // Add to laundryHoldDates for highlighting
        if (laundryDate >= today && laundryDate <= horizon) {
          laundryHoldDates.add(dateString);
        }
        // Also add to unavailableDates to fully block them
        if (laundryDate >= today && laundryDate <= horizon) {
          unavailableDates.add(dateString);
        }
      }
    });

    res.json({
      success: true,
      calendar: {
        laundryDays: gown.laundryDays || 0,
        unavailableDates: Array.from(unavailableDates).sort(),
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
