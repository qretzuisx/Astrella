import Booking from "../models/booking.js";
import Gown from "../models/Gown.js";

export const checkAvailability = async (gown, pickupDate, returnDate) => {
  // ensure dates are Date objects in query
  const start = new Date(pickupDate);
  const end = new Date(returnDate);
  const bookings = await Booking.find({
    gown,
    pickupDate: { $lte: end },
    returnDate: { $gte: start },
  });
  return bookings.length === 0;
}

// API to create booking
export const createBooking = async (req, res) => {
  try {
    const { _id } = req.user;
    const { gown, pickupDate, returnDate, pickupTime, measurements } = req.body;

    // basic validation
    if (!gown || !pickupDate || !returnDate) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const isAvailable = await checkAvailability(gown, pickupDate, returnDate);
    if (!isAvailable) {
      return res.json({ success: false, message: "Gown is not available" });
    }

    const gownData = await Gown.findById(gown);
    if (!gownData) {
      return res.status(404).json({ success: false, message: "Gown not found" });
    }

    // compute price from gown data (adjust if you need per-day calculation)
    const price = gownData.price || 0;

    const newBooking = await Booking.create({
      gown,
      owner: gownData.owner,
      user: _id,
      pickupDate: new Date(pickupDate),
      returnDate: new Date(returnDate),
      pickupTime: pickupTime || null,
      price,
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
}

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

    const prevStatus = booking.status
    booking.status = status;
    await booking.save();

    // If booking is confirmed, mark the gown as unavailable for the booked period
    try {
      const gown = await Gown.findById(booking.gown)
      if (status === 'confirmed') {
        // simple approach: mark gown not available (owner UI still can override)
        gown.available = false
        await gown.save()
      }

      // If booking was canceled and previously confirmed, try to mark gown available.
      // Note: this simplistic approach assumes no overlapping confirmed bookings.
      if (status === 'canceled' && prevStatus === 'confirmed') {
        // check for other confirmed bookings that overlap this gown
        const overlapping = await Booking.findOne({
          gown: booking.gown,
          status: 'confirmed',
        })
        if (!overlapping) {
          gown.available = true
          await gown.save()
        }
      }
    } catch (err) {
      console.error('Failed to update gown availability on status change:', err.message)
    }

    res.json({ success: true, message: "Status Updated" });

  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
}
