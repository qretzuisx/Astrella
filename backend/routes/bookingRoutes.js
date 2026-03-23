import express from "express";
import { changeBookingStatus, cleanupExpiredTrials, createBooking, getGownCalendar, getOwnerBooking, getUserBooking, updateBooking, validateBookingWindow, verifyPayment } from "../controllers/bookingController.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/multer.js";


// Simple in-memory rate limiter for booking creation
const bookingRateLimit = new Map();
const bookingRateLimiter = (req, res, next) => {
  const userId = req.user?._id?.toString() || req.ip;
  const now = Date.now();
  const userLimit = bookingRateLimit.get(userId) || [];
  const activeRequests = userLimit.filter(time => now - time < 60000);
  if (activeRequests.length >= 5) {
    return res.status(429).json({ success: false, message: "Too many booking attempts. Please try again in 1 minute." });
  }
  activeRequests.push(now);
  bookingRateLimit.set(userId, activeRequests);
  next();
};

const bookingRouter = express.Router();

bookingRouter.post('/check-availability', validateBookingWindow)
bookingRouter.post('/create', protect, upload.single('paymentScreenshot'), bookingRateLimiter, createBooking)
bookingRouter.post('/user', protect, getUserBooking)
bookingRouter.post('/owner', protect, getOwnerBooking)
bookingRouter.put('/change-status', protect, changeBookingStatus)
bookingRouter.put('/verify-payment', protect, verifyPayment)
bookingRouter.put('/update', protect, updateBooking)
bookingRouter.get('/calendar/:gownId', getGownCalendar)
bookingRouter.post('/cleanup-expired-trials', cleanupExpiredTrials)

export default bookingRouter;
