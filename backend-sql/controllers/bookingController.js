import Booking from "../models/Booking.js";
import Gown from "../models/Gown.js";
import User from "../models/User.js";
// ImageKit removed for offline support
import { Op } from 'sequelize';

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

// Helper function to get all laundry dates for a gown
const getLaundryDates = async (gownId, laundryDays) => {
  if (!laundryDays || laundryDays <= 0) return new Set();
  
  const laundryDateSet = new Set();
  const bookings = await Booking.findAll({
    where: {
      gownId,
      status: { [Op.ne]: "canceled" }
    }
  });

  bookings.forEach((booking) => {
    const returnDate = new Date(booking.returnDate);
    for (let i = 1; i <= laundryDays; i++) {
      const laundryDate = new Date(returnDate);
      laundryDate.setDate(laundryDate.getDate() + i);
      const dateString = laundryDate.toISOString().split('T')[0];
      laundryDateSet.add(dateString);
    }
  });

  return laundryDateSet;
};

export const checkAvailability = async (gownId, pickupDate, returnDate, options = {}) => {
  const start = pickupDate instanceof Date ? pickupDate : new Date(pickupDate);
  const end = returnDate instanceof Date ? returnDate : new Date(returnDate);
  const laundryDays = Number(options.laundryDays || 0);
  
  const bookings = await Booking.findAll({
    where: {
      gownId,
      status: { [Op.ne]: "canceled" }
    }
  });

  const blockedDates = new Set();
  
  bookings.forEach((booking) => {
    const bookingStart = new Date(booking.pickupDate);
    const bookingEnd = new Date(booking.returnDate);
    for (let d = new Date(bookingStart); d <= bookingEnd; d.setDate(d.getDate() + 1)) {
      blockedDates.add(d.toISOString().split('T')[0]);
    }
    
    if (laundryDays > 0) {
      for (let i = 1; i <= laundryDays; i++) {
        const laundryDate = new Date(bookingEnd);
        laundryDate.setDate(laundryDate.getDate() + i);
        blockedDates.add(laundryDate.toISOString().split('T')[0]);
      }
    }
  });

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split('T')[0];
    if (blockedDates.has(dateString)) {
      return false;
    }
  }

  return true;
};

// API to create booking
export const createBooking = async (req, res) => {
  try {
    const { id } = req.user;
    const { gown, pickupDate, returnDate, pickupTime, returnTime, contactNumber } = req.body;

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

    const gownData = await Gown.findByPk(gown);
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
      const laundryDateSet = await getLaundryDates(gown, gownData.laundryDays);
      let isLaundryConflict = false;
      
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

    const msDiff = returnDateTime.getTime() - pickupDateTime.getTime();
    const rawDays = msDiff / DAY_IN_MS;
    const rentalDays = Math.max(1, Math.ceil(rawDays));
    const pricePerDay = gownData.pricePerDay || gownData.price || 0;
    const price = rentalDays * pricePerDay;

    // Store payment screenshot as base64 for offline support
    const screenshotUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Check for duplicate reference numbers
    const existingPayment = await Booking.findOne({ 
      where: { transactionRef: paymentInfo.transactionRef }
    });
    if (existingPayment) {
      return res.status(400).json({ 
        success: false, 
        message: "This reference number has already been used. Please check your transaction." 
      });
    }

    const newBooking = await Booking.create({
      gownId: gown,
      ownerId: gownData.ownerId,
      userId: id,
      pickupDate: pickupDateTime,
      returnDate: returnDateTime,
      pickupTime,
      returnTime,
      price,
      contactNumber: cleanContactNumber,
      waist: measurements.waist || null,
      hips: measurements.hips || null,
      measurementUnit: measurements.unit || 'inches',
      paymentMethod: 'gcash',
      depositAmount: paymentInfo.depositAmount || Math.round(price * 0.5),
      totalAmount: paymentInfo.totalAmount || price,
      remainingBalance: paymentInfo.remainingBalance || (price - Math.round(price * 0.5)),
      transactionRef: paymentInfo.transactionRef,
      paymentScreenshot: screenshotUrl,
      paymentStatus: 'pending'
    });

    // Populate for response
    const populatedBooking = await Booking.findByPk(newBooking.id, {
      include: [
        { model: Gown, as: 'gown' },
        { model: User, as: 'owner', attributes: ['id', 'name'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json({ success: true, message: "Booking Created - Payment pending verification", booking: populatedBooking });

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

    const gown = await Gown.findByPk(gownId, {
      attributes: ['id', 'name', 'laundryDays']
    });
    
    if (!gown) {
      return res.status(404).json({ success: false, message: "Gown not found" });
    }

    const laundryDays = Number(gown.laundryDays || 0);
    
    const blockedDates = new Set();
    const bookings = await Booking.findAll({
      where: {
        gownId,
        status: { [Op.ne]: "canceled" }
      },
      include: [
        { model: User, as: 'user', attributes: ['name'] },
        { model: Gown, as: 'gown', attributes: ['name'] }
      ]
    });

    bookings.forEach((booking) => {
      const bookingStart = new Date(booking.pickupDate);
      const bookingEnd = new Date(booking.returnDate);
      for (let d = new Date(bookingStart); d <= bookingEnd; d.setDate(d.getDate() + 1)) {
        blockedDates.add(d.toISOString().split('T')[0]);
      }
      
      if (laundryDays > 0) {
        for (let i = 1; i <= laundryDays; i++) {
          const laundryDate = new Date(bookingEnd);
          laundryDate.setDate(laundryDate.getDate() + i);
          blockedDates.add(laundryDate.toISOString().split('T')[0]);
        }
      }
    });

    const conflictingDates = [];
    for (let d = new Date(pickupDateTime); d <= returnDateTime; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0];
      if (blockedDates.has(dateString)) {
        conflictingDates.push(dateString);
      }
    }

    if (conflictingDates.length > 0) {
      const conflict = bookings.find((existing) => {
        const existingStart = new Date(existing.pickupDate);
        const existingEnd = new Date(existing.returnDate);
        return (pickupDateTime <= existingEnd && returnDateTime >= existingStart);
      });

      const isLaundryConflict = conflictingDates.some(dateStr => {
        return bookings.some(booking => {
          const returnDate = new Date(booking.returnDate);
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

// API to list user bookings
export const getUserBooking = async (req, res) => {
  try {
    const { id } = req.user;
    const bookings = await Booking.findAll({
      where: { userId: id },
      include: [
        { model: Gown, as: 'gown' },
        { model: User, as: 'owner', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, bookings });

  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
}

// API to get owner bookings
export const getOwnerBooking = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const bookings = await Booking.findAll({
      where: { ownerId: req.user.id },
      include: [
        { model: Gown, as: 'gown' },
        { model: User, as: 'user', attributes: { exclude: ['password'] } }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, bookings });

  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
}

// API change booking status
export const changeBookingStatus = async (req, res) => {
  try {
    const { id } = req.user;
    const { bookingId, status } = req.body;

    if (!bookingId || !status) {
      return res.status(400).json({ success: false, message: "Missing bookingId or status" });
    }

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.ownerId !== id) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const prevStatus = booking.status;

    // Track owner confirmations
    const updateData = { status };
    if (status === 'confirmed' && !booking.pickupConfirmedAt) {
      updateData.pickupConfirmedAt = new Date();
    }
    if (status === 'completed' && !booking.returnConfirmedAt) {
      updateData.returnConfirmedAt = new Date();
    }

    await booking.update(updateData);

    // Update gown availability
    try {
      const gown = await Gown.findByPk(booking.gownId);

      if (status === 'confirmed') {
        await gown.update({ available: false });
      }

      if ((status === 'canceled' || status === 'completed') && prevStatus === 'confirmed') {
        const overlapping = await Booking.findOne({
          where: {
            gownId: booking.gownId,
            status: 'confirmed'
          }
        });
        if (!overlapping) {
          await gown.update({ available: true });
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

    const gown = await Gown.findByPk(gownId, {
      attributes: ['laundryDays']
    });
    
    if (!gown) {
      return res.status(404).json({ success: false, message: "Gown not found" });
    }

    const bookings = await Booking.findAll({
      where: {
        gownId,
        status: { [Op.ne]: "canceled" }
      },
      order: [['pickupDate', 'ASC']]
    });

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

    bookings.forEach((booking) => {
      const bookingStart = new Date(booking.pickupDate);
      const bookingEnd = new Date(booking.returnDate);
      for (
        let cursor = new Date(bookingStart);
        cursor <= bookingEnd;
        cursor.setDate(cursor.getDate() + 1)
      ) {
        captureDate(new Date(cursor), unavailableDates);
      }

      const bufferDays = Math.max(gown.laundryDays || 0, 0);
      for (let i = 1; i <= bufferDays; i += 1) {
        const laundryDate = new Date(booking.returnDate);
        laundryDate.setDate(laundryDate.getDate() + i);
        const dateString = laundryDate.toISOString().split('T')[0];
        if (laundryDate >= today && laundryDate <= horizon) {
          laundryHoldDates.add(dateString);
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

// API to verify payment
export const verifyPayment = async (req, res) => {
  try {
    const { id } = req.user;
    const { bookingId, action, rejectionReason } = req.body;

    if (!bookingId || !action) {
      return res.status(400).json({ success: false, message: "Missing bookingId or action" });
    }

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ success: false, message: "Action must be 'approve' or 'reject'" });
    }

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.ownerId !== id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (!booking.paymentScreenshot) {
      return res.status(400).json({ success: false, message: "No payment information found" });
    }

    if (action === 'approve') {
      await booking.update({
        paymentStatus: 'verified',
        paymentVerifiedAt: new Date(),
        paymentVerifiedBy: id
      });
    } else {
      await booking.update({
        paymentStatus: 'rejected',
        rejectionReason: rejectionReason || 'Payment verification failed',
        status: 'canceled'
      });
    }

    res.json({ 
      success: true, 
      message: `Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully` 
    });

  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
