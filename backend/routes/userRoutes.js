import express from "express";
import { getUserData, loginUser, registerUser, requestOwnerRole, getOwnerRequestStatus, getRecommendations } from "../controllers/userController.js";
import { protect} from "../middleware/auth.js"

const userRouter = express.Router();

userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.get('/data', protect, getUserData)
userRouter.post('/request-owner', protect, requestOwnerRole)
userRouter.get('/owner-request-status', protect, getOwnerRequestStatus)
userRouter.get('/recommendations', getRecommendations)

export default userRouter