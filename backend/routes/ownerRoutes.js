import express from "express";
import { protect } from "../middleware/auth.js";
import { addGown, DeleteGown, getAllGowns, getDashboardData, getGownById, getOwnersGowns, ToggleGownAvailability, updateLaundryDays, updateUserImage } from "../controllers/ownerController.js";
import upload from "../middleware/multer.js";
import { verifyOwner } from "../middleware/verify.js";

const ownerRouter = express.Router();

// Public routes for browsing
ownerRouter.get("/all-gowns", getAllGowns)
ownerRouter.get("/gowns/:id", getGownById)

ownerRouter.post("/add-gown", protect, verifyOwner, upload.single("image"), addGown)
ownerRouter.get("/gowns", protect, verifyOwner, getOwnersGowns)
ownerRouter.put("/toogle-gown", protect, verifyOwner, ToggleGownAvailability)
ownerRouter.put("/gown/laundry-days", protect, verifyOwner, updateLaundryDays)
ownerRouter.delete("/delete-gown", protect, verifyOwner, DeleteGown)
ownerRouter.get("/dashboard", protect, verifyOwner, getDashboardData)
ownerRouter.post("/update-image", protect, verifyOwner, upload.single("image"), updateUserImage)

export default ownerRouter;