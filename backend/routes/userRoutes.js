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
    resetPassword,
    updateShopProfile,
    getShopProfile
} from "../controllers/userController.js";
import { protect} from "../middleware/auth.js"
import upload from "../middleware/multer.js"

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
userRouter.put('/shop-profile', protect, upload.fields([
    { name: 'businessPermit', maxCount: 1 },
    { name: 'dtiRegistration', maxCount: 1 }
]), updateShopProfile)
userRouter.get('/shop-profile/:ownerId', getShopProfile)

export default userRouter