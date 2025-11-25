import express from "express";
import { changeBookingStatus, createBooking, getOwnerBooking, getUserBooking, validateBookingWindow } from "../controllers/bookingController.js";
import { protect } from "../middleware/auth.js";


const bookingRouter = express.Router();

bookingRouter.post('/check-availability', validateBookingWindow)
bookingRouter.post('/create', protect, createBooking)
bookingRouter.post('/user', protect, getUserBooking)
bookingRouter.post('/owner', protect, getOwnerBooking)
bookingRouter.put('/change-status', protect, changeBookingStatus)

export default bookingRouter;
