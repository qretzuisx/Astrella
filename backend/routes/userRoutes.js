import express from "express";
import { 
    getUserData, 
    loginUser, 
    registerUser, 
    requestOwnerRole, 
    getOwnerRequestStatus, 
    getRecommendations,
    updateProfile,
    changePassword,
    getUserStatistics,
    deleteAccount,
    requestPasswordReset,
    resetPassword
} from "../controllers/userController.js";
import { protect} from "../middleware/auth.js"

const userRouter = express.Router();

userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.post('/forgot-password', requestPasswordReset)
userRouter.post('/reset-password', resetPassword)
userRouter.get('/data', protect, getUserData)
userRouter.put('/update-profile', protect, updateProfile)
userRouter.put('/change-password', protect, changePassword)
userRouter.get('/statistics', protect, getUserStatistics)
userRouter.delete('/delete-account', protect, deleteAccount)
userRouter.post('/request-owner', protect, requestOwnerRole)
userRouter.get('/owner-request-status', protect, getOwnerRequestStatus)
userRouter.get('/recommendations', getRecommendations)

export default userRouter