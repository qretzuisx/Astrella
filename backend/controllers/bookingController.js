import Booking from "../models/booking.js";
import Gown from "../models/Gown.js";

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

export const checkAvailability = async (gown, pickupDate, returnDate, options = {}) => {
  const start = pickupDate instanceof Date ? pickupDate : new Date(pickupDate);
  const end = returnDate instanceof Date ? returnDate : new Date(returnDate);
  const laundryDays = Number(options.laundryDays || 0);
  const bufferMs = Math.max(laundryDays, 0) * DAY_IN_MS;
  const bookings = await Booking.find({
    gown,
    status: { $ne: "canceled" },
  });

  const newEndBuffered = new Date(end.getTime() + bufferMs);

  const conflict = bookings.some((booking) => {
    const bookingStart = booking.pickupDate;
    const bookingEndBuffered = new Date(booking.returnDate.getTime() + bufferMs);
    return bookingStart < newEndBuffered && start < bookingEndBuffered;
  });

  return !conflict;
};

// API to create booking
export const createBooking = async (req, res) => {
  try {
    const { _id } = req.user;
    const { gown, pickupDate, returnDate, pickupTime, returnTime, measurements, contactNumber } = req.body;

    if (!gown || !pickupDate || !returnDate || !pickupTime || !returnTime) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
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
      return res.json({ success: false, message: "This gown is still reserved or in laundry during your selected pickup time." });
    }

    // Dynamic rental pricing based on number of days selected
    const msDiff = returnDateTime.getTime() - pickupDateTime.getTime();
    const rawDays = msDiff / DAY_IN_MS;
    const rentalDays = Math.max(1, Math.ceil(rawDays));
    const pricePerDay = gownData.pricePerDay || gownData.price || 0;
    const price = rentalDays * pricePerDay;

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
      measurements: measurements || {}
    });

    // Do NOT toggle gown.available here; availability is per-date.
    // The gown will be marked unavailable when a booking is confirmed.

    // Populate gown and owner for the response
    const populatedBooking = await Booking.findById(newBooking._id)
      .populate('gown')
      .populate('owner', 'name')
      .populate('user', 'name email')

    res.json({ success: true, message: "Booking Created", booking: populatedBooking });

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

    const bookings = await Booking.find({
      gown: gownId,
      status: { $ne: "canceled" },
    })
      .populate("user", "name")
      .populate("gown", "name");

    const bufferMs = Math.max(gown.laundryDays || 0, 0) * DAY_IN_MS;
    const newEndBuffered = new Date(returnDateTime.getTime() + bufferMs);

    const conflict = bookings.find((existing) => {
      const existingEndBuffered = new Date(existing.returnDate.getTime() + bufferMs);
      return existing.pickupDate < newEndBuffered && pickupDateTime < existingEndBuffered;
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: gown.laundryDays
          ? "This gown is unavailable or in laundry during your selected pickup time."
          : "This gown is still reserved during your selected pickup time.",
        conflict: {
          pickupDate: conflict.pickupDate,
          returnDate: conflict.returnDate,
          pickupTime: conflict.pickupTime,
          returnTime: conflict.returnTime,
          customer: conflict.user?.name,
          laundryDays: gown.laundryDays || 0,
        },
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
    const { _id } = req.user;
    const bookings = await Booking.find({ user: _id })
      .populate('gown')
      .populate('owner', 'name')
      .sort({ createdAt: -1 });

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

    const bookings = await Booking.find({ owner: req.user._id })
      .populate('gown')
      .populate('user', '-password')
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });

  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
}

// API change booking status
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

    // Keep a simple gown-level availability flag in sync for listing visibility.
    try {
      const gown = await Gown.findById(booking.gown);

      // When a booking is confirmed (pickup), ensure the gown is generally not
      // listed as freely available, as it is now in active use.
      if (status === 'confirmed') {
        gown.available = false;
        await gown.save();
      }

      // If booking is canceled or completed and was previously confirmed,
      // try to make the gown available again if there is no other confirmed booking.
      if ((status === 'canceled' || status === 'completed') && prevStatus === 'confirmed') {
        const overlapping = await Booking.findOne({
          gown: booking.gown,
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

    const bookings = await Booking.find({
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
        captureDate(laundryDate, laundryHoldDates);
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
