import express from "express";
import { protect } from "../middleware/auth.js";
import { verifyAdmin } from "../middleware/verify.js";
import { 
    approveOwnerRequest, 
    rejectOwnerRequest, 
    getPendingOwnerRequests,
    getAllUsers,
    changeUserRole
} from "../controllers/adminController.js";

const adminRouter = express.Router();

// All routes require authentication and admin role
adminRouter.use(protect);
adminRouter.use(verifyAdmin);

adminRouter.get("/owner-requests", getPendingOwnerRequests);
adminRouter.post("/approve-owner-request", approveOwnerRequest);
adminRouter.post("/reject-owner-request", rejectOwnerRequest);
adminRouter.get("/users", getAllUsers);
adminRouter.put("/change-user-role", changeUserRole);

export default adminRouter;

