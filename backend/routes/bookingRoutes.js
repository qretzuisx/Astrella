import express from "express";
import { changeBookingStatus, createBooking, getGownCalendar, getOwnerBooking, getUserBooking, updateBooking, validateBookingWindow, verifyPayment } from "../controllers/bookingController.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/multer.js";


const bookingRouter = express.Router();

bookingRouter.post('/check-availability', validateBookingWindow)
bookingRouter.post('/create', protect, upload.single('paymentScreenshot'), createBooking)
bookingRouter.post('/user', protect, getUserBooking)
bookingRouter.post('/owner', protect, getOwnerBooking)
bookingRouter.put('/change-status', protect, changeBookingStatus)
bookingRouter.put('/verify-payment', protect, verifyPayment)
bookingRouter.put('/update', protect, updateBooking)
bookingRouter.get('/calendar/:gownId', getGownCalendar)

export default bookingRouter;
