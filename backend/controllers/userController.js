import User from "../models/User.js"
import Gown from "../models/Gown.js"
import { calculateRecommendationScore } from "../utils/recommendationUtils.js"
import { calculateActualGownStatus, batchUpdateGownStatuses } from "./bookingController.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import sendEmail from '../utils/email.js'
import Booking from "../models/booking.js"


// [SECTION] AUTHENTICATION UTILITIES
/**
 * [INFO] Generates a JSON Web Token for authenticated sessions.
 * [FLOW] Used during login and registration to provide access to protected routes.
 */
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// [SECTION] USER REGISTRATION
/**
 * [INFO] Handles new user sign-ups. Supports both regular customers and boutique owners.
 * [LOGIC] 
 * 1. Validates input fields and contact number format.
 */
export const registerUser = async (req, res) => {
    try {
        const { name, email, password, contactNumber, role, shopProfile } = req.body

        const cleanContactNumber = (contactNumber || "").toString().replace(/\D/g, "");
        const normalizedRole = (role || 'user').toString().toLowerCase();

        // [VALIDATION] Basic input checks
        if (!name || !email || !password || password.length < 8) {
            return res.status(400).json({ success: false, message: 'Fill all the Fields !' })
        }

        if (!cleanContactNumber || cleanContactNumber.length !== 11) {
            return res.status(400).json({ success: false, message: 'Contact number must be exactly 11 digits.' });
        }

        // [VALIDATION] Owner-specific requirements
        if (normalizedRole === 'owner') {
            const shopName = (shopProfile?.shopName || '').toString().trim();
            const address = (shopProfile?.address || '').toString().trim();
            const city = (shopProfile?.city || '').toString().trim();
            const operatingHours = (shopProfile?.operatingHours || '').toString().trim();
            if (!shopName || !address || !city || !operatingHours) {
                return res.status(400).json({ success: false, message: 'Shop details are required for owner sign-up.' });
            }
        }

        const userExists = await User.findOne({ email })
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        // [INFO] Initialize shop profile only if the user is an owner
        const initialShopProfile = normalizedRole === 'owner' ? {
            shopName: (shopProfile?.shopName || '').toString().trim(),
            description: (shopProfile?.description || '').toString().trim(),
            address: (shopProfile?.address || '').toString().trim(),
            city: (shopProfile?.city || '').toString().trim(),
            contactNumber: cleanContactNumber,
            operatingHours: (shopProfile?.operatingHours || '').toString().trim(),
            businessPermit: '',
            dtiRegistration: '',
            verified: false,
            socialMedia: {
                facebook: shopProfile?.socialMedia?.facebook || shopProfile?.facebook || ''
            }
        } : undefined;

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            contactNumber: cleanContactNumber,
            role: normalizedRole,
            ...(initialShopProfile ? { shopProfile: initialShopProfile } : {})
        })
        
        const token = generateToken(user._id.toString())
        res.json({ success: true, token })


    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// [SECTION] USER LOGIN & AUTHENTICATION
/**
 * [INFO] Authenticates users based on email and password.
 * [FLOW] Returns a JWT token that must be included in subsequent request headers.
 */
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid Credentials" })
        }
        const token = generateToken(user._id.toString())
        res.json({ success: true, token })

    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

/**
 * [INFO] Retrieves the profile of the currently authenticated user.
 * [FLOW] Data is populated by the 'protect' middleware before reaching this controller.
 */
export const getUserData = async (req, res) => {
    try {
        const { user } = req;
        res.json({ success: true, user })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// [SECTION] ROLE UPGRADES
/**
 * [INFO] Allows a regular user to become a Shop Owner.
 * [FLOW] Upgrades the 'role' and initializes a required shop profile.
 */
export const requestOwnerRole = async (req, res) => {
    try {
        const { _id } = req.user;

        const user = await User.findById(_id);
        if (user.role === 'owner') {
            return res.status(400).json({ success: false, message: "You already have owner privileges" });
        }

        const { shopName, address, city, operatingHours } = req.body;
        if (!shopName || !shopName.trim()) {
            return res.status(400).json({ success: false, message: "Shop name is required to become an owner." });
        }

        await User.findByIdAndUpdate(_id, {
            role: 'owner',
            shopProfile: {
                shopName: shopName.trim(),
                address: address.trim(),
                city: city.trim(),
                operatingHours: operatingHours || '',
                contactNumber: user.contactNumber || '',
                verified: false,
                socialMedia: { facebook: '' }
            }
        });

        res.json({ success: true, message: "Owner access granted! You can now access the owner dashboard." });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// AI Recommendation logic moved to backend/utils/recommendationUtils.js

// [SECTION] PROFILE MANAGEMENT
/**
 * [INFO] Updates basic customer details (Name, Bio, Contact).
 */
export const updateProfile = async (req, res) => {
    try {
        const { _id } = req.user;
        const { name, contactNumber, address, bio } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const cleanContactNumber = (contactNumber || "").toString().replace(/\D/g, "");
        if (cleanContactNumber && cleanContactNumber.length !== 11) {
            return res.status(400).json({ success: false, message: 'Contact number must be exactly 11 digits' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            _id,
            {
                name: name.trim(),
                contactNumber: contactNumber || '',
                address: address || '',
                bio: bio || ''
            },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * [INFO] Secured password update for active sessions.
 */
export const changePassword = async (req, res) => {
    try {
        const { _id } = req.user;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const user = await User.findById(_id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}

// [SECTION] PASSWORD RESET FLOW
/**
 * [INFO] Initiates the password reset process by sending a 5-digit code to the user's email.
 * [LOGIC] 
 * 1. Generates a random 5-digit numeric code.
 * 2. Hashes the code for secure database storage.
 * 3. Sends the raw code via email (valid for 10 minutes).
 */
export const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found with that email' });
        }

        const rawToken = Math.floor(10000 + Math.random() * 90000).toString();
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        await sendEmail({
            email: user.email,
            subject: 'Astrella — Password Reset Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 32px; border: 1px solid #eee; border-radius: 16px;">
                    <h2 style="color: #013E8D;">Password Reset Request</h2>
                    <p>Hello <strong>${user.name}</strong>,</p>
                    <p>You requested a password reset for your Astrella account. Use the code below within <strong>10 minutes</strong>:</p>
                    <div style="font-size: 36px; font-weight: 900; letter-spacing: 0.3em; color: #FF3B30; text-align: center; padding: 24px; background: #FFF5F5; border-radius: 12px; margin: 24px 0;">
                        ${rawToken}
                    </div>
                </div>
            `
        });

        res.json({
            success: true,
            message: 'A 5-digit reset code has been sent to your email.'
        });
    } catch (error) {
        console.error('[Reset Password] ERROR:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * [INFO] Validates the reset code and updates the user's password.
 */
export const resetPassword = async (req, res) => {
    try {
        const { email, resetToken, newPassword } = req.body;

        const user = await User.findOne({ email });
        if (!user || !user.resetPasswordToken || user.resetPasswordExpires.getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: 'Reset request expired or not found' });
        }

        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        if (hashedToken !== user.resetPasswordToken) {
            return res.status(400).json({ success: false, message: 'Invalid reset token' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, message: 'Password reset successful. You can now log in.' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// [SECTION] ACCOUNT METRICS & MAINTENANCE
/**
 * [INFO] Aggregates total, completed, and pending bookings for a user's dashboard.
 */
export const getUserStatistics = async (req, res) => {
    try {
        const { _id } = req.user;
        const allBookings = await Booking.find({ user: _id });
        const user = await User.findById(_id);

        res.json({
            success: true,
            statistics: {
                totalBookings: allBookings.length,
                completedBookings: allBookings.filter(b => b.status === 'completed').length,
                pendingBookings: allBookings.filter(b => b.status === 'pending').length,
                memberSince: user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * [INFO] Completely removes a user account and associated gown listings.
 * [LOGIC] 
 * 1. Blocks deletion if there are active reservations or valid trial holds.
 * 2. Deletes all gowns owned by the user.
 * 3. Removes the user from the database.
 */
export const deleteAccount = async (req, res) => {
    try {
        const { _id } = req.user;
        const activeBookings = await Booking.find({
            user: _id,
            status: { $in: ['pending', 'confirmed', 'trial'] }
        });

        const hasActiveWork = activeBookings.some(b => 
            ['pending', 'confirmed', 'trial'].includes(b.status)
        );

        if (hasActiveWork) {
            return res.status(400).json({
                success: false,
                message: 'Complete all active bookings and trial holds before deleting account.'
            });
        }

        await Gown.deleteMany({ owner: _id });
        await User.findByIdAndDelete(_id);

        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// [SECTION] AI RECOMMENDATION ENGINE
/**
 * [INFO] Fetches gowns tailored to user preferences (Body Type, Skin Tone, etc).
 * [LOGIC] 
 * 1. Filters initially by 'available: true'.
 * 2. Recalculates dynamic status (In-Laundry, Reserved) for all gowns.
 * 3. Applies strict 'Event Type' filtering (Wedding, Formal, etc).
 * 4. Ranks remaining gowns using the scoring utility in `recommendationUtils.js`.
 */
export const getRecommendations = async (req, res) => {
    try {
        const { bodyType, skinTone, height, eventType, faceShape, ageGroup, sex } = req.query;
        let allGowns = await Gown.find({ 
            available: true,
            statusOverride: { $ne: 'Sold Out' }
        }).populate('owner', 'name');

        // [LOGIC] Update dynamic statuses in batch for performance
        await batchUpdateGownStatuses(allGowns);

        // [LOGIC] Strict Filtering (Event Type, Age, Sex, Body Type Style Alignment)
        const selectedAgeGroup = ageGroup || req.query.age; // Support both naming conventions
        
        if (eventType) {
            allGowns = allGowns.filter(g => g.eventType.map(e => e.toLowerCase()).includes(eventType.toLowerCase()));
        }
        if (selectedAgeGroup) {
            allGowns = allGowns.filter(g => g.ageGroup.map(a => a.toLowerCase()).includes(selectedAgeGroup.toLowerCase()));
        }
        if (sex) {
            const selectedSex = sex.toLowerCase().trim();
            allGowns = allGowns.filter(g => {
                let gownSex = (g.sex || '').toLowerCase().trim();

                // If sex is untagged, infer from name keywords
                if (gownSex === '') {
                    const nameLower = (g.name || '').toLowerCase();
                    const maleKW = ['barong', 'tuxedo', 'suit', 'blazer', 'vest', 'polo', 'necktie', 'bowtie', 'groomsmen', 'groom'];
                    const femaleKW = ['gown', 'dress', 'ball gown', 'bridesmaid', 'bridal', 'corset', 'tiara', 'veil'];
                    if (maleKW.some(kw => nameLower.includes(kw))) {
                        gownSex = 'male';
                    } else if (femaleKW.some(kw => nameLower.includes(kw))) {
                        gownSex = 'female';
                    }
                    // If still untagged after keyword check, skip entirely
                    if (gownSex === '') return false;
                }

                if (selectedSex === 'male') {
                    return gownSex === 'male' || gownSex === 'unisex';
                } else if (selectedSex === 'female') {
                    return gownSex === 'female' || gownSex === 'unisex';
                } else {
                    return gownSex === selectedSex || gownSex === 'unisex';
                }
            });
        }

        // [LOGIC] Strict Body Type Alignment (Fabric & Color)
        if (bodyType) {
            const { calculateRecommendationScore } = await import("../utils/recommendationUtils.js");
            allGowns = allGowns.filter(gown => {
                // For Body Type, we want a minimum base score for stylistic alignment
                const styleScore = calculateRecommendationScore(gown, { bodyType });
                // If the gown doesn't match the recommended color family OR fabric for this body type, 
                // it won't meet the score threshold of 25 (10 color + 10 fabric + 5 base)
                return styleScore >= 10; // At least base + partial match
            });
        }

        // [LOGIC] Ranking based on AI Stylist logic
        const scoredGowns = allGowns.map(gown => {
            const score = calculateRecommendationScore(gown, { bodyType, skinTone, height, eventType, faceShape, ageGroup: selectedAgeGroup, sex });
            return {
                gown,
                score,
                matchReason: score >= 80 ? "Excellent match" : score >= 60 ? "Great match" : "Good match"
            };
        }).sort((a, b) => b.score - a.score);

        res.json({ success: true, recommendations: scoredGowns });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// [SECTION] SHOP PROFILE MANAGEMENT
/**
 * [INFO] Updates boutique details (Opening hours, documents, social media).
 * [LOGIC] 
 * 1. Handles ImageKit file uploads for Business Permits and DTI Registration.
 * 2. Formats operating hours for booking validation.
 * 3. Syncs the address and contact number to all owned gowns for retrieval speed.
 */
export const updateShopProfile = async (req, res) => {
    try {
        const { _id } = req.user
        const { shopName, description, address, city, operatingHours, openingTime, closingTime, availableDays, facebook } = req.body

        const user = await User.findById(_id)
        if (user.role !== 'owner') {
            return res.status(403).json({ success: false, message: "Unauthorized" })
        }

        // [LOGIC] Handle File Uploads (ImageKit)
        let businessPermitUrl = user.shopProfile?.businessPermit || ''
        let dtiRegistrationUrl = user.shopProfile?.dtiRegistration || ''

        if (req.files?.businessPermit) {
            const imageKit = (await import('../configs/imagekit.js')).default
            const fs = await import('fs')
            const file = req.files.businessPermit[0]
            const uploadResponse = await imageKit.upload({
                file: (file.buffer || fs.readFileSync(file.path)).toString('base64'),
                fileName: `permit_${_id}_${Date.now()}.${file.mimetype.split('/')[1]}`,
                folder: '/business_documents'
            })
            businessPermitUrl = uploadResponse.url
            if (file.path) fs.unlinkSync(file.path)
        }

        if (req.files?.dtiRegistration) {
            const imageKit = (await import('../configs/imagekit.js')).default
            const fs = await import('fs')
            const file = req.files.dtiRegistration[0]
            const uploadResponse = await imageKit.upload({
                file: (file.buffer || fs.readFileSync(file.path)).toString('base64'),
                fileName: `dti_${_id}_${Date.now()}.${file.mimetype.split('/')[1]}`,
                folder: '/business_documents'
            })
            dtiRegistrationUrl = uploadResponse.url
            if (file.path) fs.unlinkSync(file.path)
        }

        // [LOGIC] Sync Profile Data
        const contactNumber = (req.body.contactNumber || user.contactNumber).toString().replace(/\D/g, '').slice(0, 11)
        user.shopProfile = {
            ...user.shopProfile,
            shopName: shopName || user.shopProfile.shopName,
            description: description || user.shopProfile.description,
            address: address || user.shopProfile.address,
            city: city || user.shopProfile.city,
            contactNumber,
            operatingHours: operatingHours || user.shopProfile.operatingHours,
            openingTime: openingTime || user.shopProfile.openingTime,
            closingTime: closingTime || user.shopProfile.closingTime,
            availableDays: availableDays || user.shopProfile.availableDays,
            socialMedia: { facebook: facebook || user.shopProfile.socialMedia.facebook },
            businessPermit: businessPermitUrl,
            dtiRegistration: dtiRegistrationUrl
        }
        user.contactNumber = contactNumber
        await user.save()
        
        // [FLOW] Keep gown data synced with shop address/contact
        await Gown.updateMany({ owner: _id }, { $set: { contactNumber, location: address || user.shopProfile.address } })

        res.json({ success: true, shopProfile: user.shopProfile })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * [INFO] Publicly retrieves a shop's profile and operating hours.
 */
export const getShopProfile = async (req, res) => {
    try {
        const owner = await User.findById(req.params.ownerId).select('name email contactNumber shopProfile createdAt')
        if (!owner) {
            return res.status(404).json({ success: false, message: 'Shop not found' });
        }
        res.json({ success: true, shopProfile: owner.shopProfile, ownerName: owner.name })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export const getShopOperatingHours = async (req, res) => {
    try {
        const owner = await User.findById(req.params.ownerId).select('shopProfile')
        if (!owner) {
            return res.status(404).json({ success: false, message: 'Shop not found' });
        }
        res.json({ 
            success: true, 
            operatingHours: {
                openingTime: owner.shopProfile.openingTime || '09:00',
                closingTime: owner.shopProfile.closingTime || '18:00',
                availableDays: owner.shopProfile.availableDays
            }
        })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}