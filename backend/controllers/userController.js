import User from "../models/User.js"
import Gown from "../models/Gown.js"
import { calculateActualGownStatus } from "./bookingController.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import sendEmail from '../utils/email.js'
import Booking from "../models/booking.js"


// jwt token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// register user
export const registerUser = async (req, res) => {
    try {
        const { name, email, password, contactNumber, role, shopProfile } = req.body

        const cleanContactNumber = (contactNumber || "").toString().replace(/\D/g, "");
        const normalizedRole = (role || 'user').toString().toLowerCase();

        if (!name || !email || !password || password.length < 8) {
            return res.json({ success: false, message: 'Fill all the Fields !' })
        }

        if (!cleanContactNumber || cleanContactNumber.length !== 11) {
            return res.json({ success: false, message: 'Contact number must be exactly 11 digits.' });
        }

        if (normalizedRole !== 'user' && normalizedRole !== 'owner') {
            return res.json({ success: false, message: 'Role must be user or owner.' });
        }

        if (normalizedRole === 'owner') {
            const shopName = (shopProfile?.shopName || '').toString().trim();
            const address = (shopProfile?.address || '').toString().trim();
            const city = (shopProfile?.city || '').toString().trim();
            const operatingHours = (shopProfile?.operatingHours || '').toString().trim();
            if (!shopName) return res.status(400).json({ success: false, message: 'Shop name is required for owner sign-up.' });
            if (!address) return res.status(400).json({ success: false, message: 'Shop address is required for owner sign-up.' });
            if (!city) return res.status(400).json({ success: false, message: 'Shop city is required for owner sign-up.' });
            if (!operatingHours) return res.status(400).json({ success: false, message: 'Operating hours are required for owner sign-up.' });
        }

        const userExists = await User.findOne({ email })
        if (userExists) {
            return res.json({ success: false, message: 'User already exists' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        // If signing up as owner, allow capturing initial shop profile fields.
        const initialShopProfile = normalizedRole === 'owner' ? {
            shopName: shopProfile?.shopName || '',
            description: shopProfile?.description || '',
            address: shopProfile?.address || '',
            city: shopProfile?.city || '',
            contactNumber: cleanContactNumber,
            operatingHours: shopProfile?.operatingHours || '',
            businessPermit: '',
            dtiRegistration: '',
            verified: false,
            socialMedia: {
                facebook: shopProfile?.socialMedia?.facebook || shopProfile?.facebook || '',
                instagram: shopProfile?.socialMedia?.instagram || shopProfile?.instagram || ''
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
        res.json({ success: false, message: error.message })
    }
}

// login user
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email })
        if (!user) {
            return res.json({ success: false, message: "User not found" })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.json({ success: false, message: "Invalid Credentials" })
        }
        const token = generateToken(user._id.toString())
        res.json({ success: true, token })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// user data using jwt
export const getUserData = async (req, res) => {
    try {
        const { user } = req;
        res.json({ success: true, user })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Request to become owner (instant approval - no admin needed)
export const requestOwnerRole = async (req, res) => {
    try {
        const { _id } = req.user;

        // Check if user is already an owner
        const user = await User.findById(_id);
        if (user.role === 'owner') {
            return res.json({ success: false, message: "You already have owner privileges" });
        }

        // Grant owner role immediately
        await User.findByIdAndUpdate(_id, { role: 'owner' });

        res.json({ success: true, message: "Owner access granted! You can now access the owner dashboard." });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// AI Recommendation algorithm
const calculateRecommendationScore = (gown, preferences) => {
    let score = 0;
    const maxScore = 100;

    // Event Type Match (30 points) - STRICT MATCHING ONLY
    if (preferences.eventType) {
        const userEventType = preferences.eventType.toLowerCase().trim();

        // Handle both array and string eventType
        if (Array.isArray(gown.eventType)) {
            const gownEventTypes = gown.eventType.map(e => e.toLowerCase().trim());
            // Only give points if exact match found in the array
            if (gownEventTypes.includes(userEventType)) {
                score += 30;
            }
            // If no exact match, score remains 0 for event type
        } else {
            // Backward compatibility for old string format
            const gownEventType = gown.eventType?.toLowerCase().trim();
            // Only give points if exact match
            if (gownEventType === userEventType) {
                score += 30;
            }
            // If no exact match, score remains 0 for event type
        }
    }

    // Body Type Recommendations (25 points)
    const bodyTypeRecommendations = {
        'Hourglass': {
            colors: ['Navy', 'Black', 'Burgundy', 'Emerald'],
            fabrics: ['Satin', 'Silk', 'Chiffon'],
            styles: ['A-line', 'Mermaid', 'Fit and Flare']
        },
        'Pear': {
            colors: ['Dark', 'Navy', 'Black', 'Deep'],
            fabrics: ['Chiffon', 'Tulle', 'Organza'],
            styles: ['A-line', 'Ball Gown', 'Empire']
        },
        'Rectangle': {
            colors: ['All'],
            fabrics: ['Chiffon', 'Tulle', 'Organza', 'Satin'],
            styles: ['A-line', 'Ball Gown', 'Mermaid']
        },
        'Diamond': {
            colors: ['Dark', 'Navy', 'Black'],
            fabrics: ['Chiffon', 'Tulle'],
            styles: ['A-line', 'Empire']
        }
    };

    if (preferences.bodyType && bodyTypeRecommendations[preferences.bodyType]) {
        const rec = bodyTypeRecommendations[preferences.bodyType];
        const gownColor = gown.color?.toLowerCase();
        const gownFabric = gown.fabric?.toLowerCase();

        if (rec.colors.some(c => gownColor?.includes(c.toLowerCase()))) {
            score += 10;
        }
        if (rec.fabrics.some(f => gownFabric?.includes(f.toLowerCase()))) {
            score += 10;
        }
        score += 5; // Base score for body type consideration
    }

    // Skin Tone Color Recommendations (20 points)
    const skinToneColors = {
        'Warm': ['Gold', 'Peach', 'Coral', 'Ivory', 'Warm White', 'Blush', 'Cream'],
        'Cold': ['Silver', 'Blue', 'Pink', 'Cool White', 'Lavender', 'Mint'],
        'Neutral': ['All colors work well'],
        'Nuetral': ['All colors work well'] // Handle typo in assets
    };

    if (preferences.skinTone && skinToneColors[preferences.skinTone]) {
        const recommendedColors = skinToneColors[preferences.skinTone];
        const gownColor = gown.color?.toLowerCase();

        if (recommendedColors.some(c => gownColor?.includes(c.toLowerCase()))) {
            score += 20;
        } else if (recommendedColors[0] === 'All colors work well') {
            score += 15; // Neutral skin tone gets moderate score
        }
    }

    // Height Recommendations (15 points)
    if (preferences.height) {
        const gownFabric = gown.fabric?.toLowerCase();
        if (preferences.height === 'Small') {
            // Avoid heavy fabrics, prefer lighter ones
            if (['chiffon', 'tulle', 'organza'].some(f => gownFabric?.includes(f))) {
                score += 15;
            } else {
                score += 5;
            }
        } else if (preferences.height === 'Tall') {
            // Can handle heavier fabrics
            if (['satin', 'silk', 'velvet'].some(f => gownFabric?.includes(f))) {
                score += 15;
            } else {
                score += 10;
            }
        } else {
            // Medium height - flexible
            score += 12;
        }
    }

    // Face Shape Recommendations (10 points)
    const faceShapeRecommendations = {
        'Oval': { necklines: ['All'], accessories: 'Versatile' },
        'Square': { necklines: ['V-neck', 'Sweetheart', 'Round'], accessories: 'Soft' },
        'Round': { necklines: ['V-neck', 'Square', 'Off-shoulder'], accessories: 'Angular' },
        'Heart': { necklines: ['V-neck', 'Sweetheart'], accessories: 'Balanced' },
        'Diamond': { necklines: ['V-neck', 'Round', 'Sweetheart'], accessories: 'Soft' }
    };

    if (preferences.faceShape && faceShapeRecommendations[preferences.faceShape]) {
        score += 10; // Base score for face shape consideration
    }

    return Math.min(score, maxScore);
};

// Update user profile
export const updateProfile = async (req, res) => {
    try {
        const { _id } = req.user;
        const { name, contactNumber, address, bio } = req.body;

        // Validate required fields
        if (!name || name.trim().length === 0) {
            return res.json({ success: false, message: 'Name is required' });
        }

        const cleanContactNumber = (contactNumber || "").toString().replace(/\D/g, "");
        if (cleanContactNumber && cleanContactNumber.length !== 11) {
            return res.json({ success: false, message: 'Contact number must be exactly 11 digits' });
        }

        // Update user
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
        res.json({ success: false, message: error.message });
    }
}

// Change password
export const changePassword = async (req, res) => {
    try {
        const { _id } = req.user;
        const { currentPassword, newPassword } = req.body;

        // Validate inputs
        if (!currentPassword || !newPassword) {
            return res.json({ success: false, message: 'All fields are required' });
        }

        if (newPassword.length < 8) {
            return res.json({ success: false, message: 'New password must be at least 8 characters long' });
        }

        // Get user with password
        const user = await User.findById(_id);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

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

        const rawToken = Math.floor(10000 + Math.random() * 90000).toString(); // Secure 5-digit numeric code
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
        await user.save();

        res.json({
            success: true,
            message: 'Password reset code generated. Use it within 60 minutes.',
            resetToken: rawToken
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, resetToken, newPassword } = req.body;

        if (!email || !resetToken || !newPassword) {
            return res.status(400).json({ success: false, message: 'Email, reset token, and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
        }

        const user = await User.findOne({ email });
        if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
            return res.status(400).json({ success: false, message: 'Reset request not found or already used' });
        }

        if (user.resetPasswordExpires.getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: 'Reset token has expired. Start over.' });
        }

        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        if (hashedToken !== user.resetPasswordToken) {
            return res.status(400).json({ success: false, message: 'Invalid reset token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, message: 'Password reset successful. You can now log in.' });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// Get user statistics
export const getUserStatistics = async (req, res) => {
    try {
        const { _id } = req.user;

        // Get all user bookings
        const allBookings = await Booking.find({ user: _id });
        const completedBookings = allBookings.filter(b => b.status === 'confirmed');
        const pendingBookings = allBookings.filter(b => b.status === 'pending');

        // Get user join date
        const user = await User.findById(_id);

        const statistics = {
            totalBookings: allBookings.length,
            completedBookings: completedBookings.length,
            pendingBookings: pendingBookings.length,
            memberSince: user.createdAt
        };

        res.json({ success: true, statistics });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Delete user account
export const deleteAccount = async (req, res) => {
    try {
        const { _id } = req.user;
        const user = await User.findById(_id);

        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }


        // Check if user has any active bookings (as a customer)
        const activeBookings = await Booking.find({
            user: _id,
            status: { $in: ['pending', 'confirmed', 'trial'] }
        });

        const now = new Date();
        const hasValidTrial = activeBookings.some(b =>
            b.status === 'trial' && (!b.trialExpiresAt || new Date(b.trialExpiresAt) > now)
        );
        const hasActiveReservation = activeBookings.some(b =>
            ['pending', 'confirmed'].includes(b.status)
        );

        if (hasActiveReservation || hasValidTrial) {
            return res.json({
                success: false,
                message: 'Please cancel or complete all active reservations and trial holds before deleting your account'
            });
        }

        // Delete user's gowns
        await Gown.deleteMany({ owner: _id });

        // Delete user
        await User.findByIdAndDelete(_id);

        res.json({ success: true, message: 'Account deleted successfully' });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Get AI Recommendations
export const getRecommendations = async (req, res) => {
    try {
        const { bodyType, skinTone, height, eventType, faceShape, age, sex } = req.query;

        // Only exclude globally unavailable gowns (owner toggled off).
        // Reservation / In-Use / In-Laundry gowns are still shown so users can see them for future bookings.
        let allGowns = await Gown.find({ available: true })
            .populate('owner', 'name')
            .sort({ createdAt: -1 });

        // Filter out orphaned gowns (owner deleted)
        allGowns = allGowns.filter(gown => gown.owner !== null);

        // Recalculate dynamic status for each gown in parallel
        await Promise.all(allGowns.map(async (gown) => {
            if (gown.statusOverride) {
                gown.status = gown.statusOverride;
            } else {
                gown.status = await calculateActualGownStatus(gown._id);
            }
        }));

        if (allGowns.length === 0) {
            return res.json({
                success: true,
                recommendations: [],
                message: "No gowns available at the moment"
            });
        }

        // STRICT EVENT TYPE FILTERING - Filter gowns by event type FIRST
        if (eventType) {
            const userEventType = eventType.toLowerCase().trim();
            allGowns = allGowns.filter(gown => {
                if (Array.isArray(gown.eventType)) {
                    const gownEventTypes = gown.eventType.map(e => e.toLowerCase().trim());
                    return gownEventTypes.includes(userEventType);
                } else if (gown.eventType) {
                    const gownEventType = gown.eventType.toLowerCase().trim();
                    return gownEventType === userEventType;
                }
                return false;
            });

            // If no gowns match the event type, return empty
            if (allGowns.length === 0) {
                return res.json({
                    success: true,
                    recommendations: [],
                    preferences: { bodyType, skinTone, height, eventType, faceShape, age, sex },
                    message: `No gowns available for ${eventType} events`
                });
            }
        }

        // Filter by age group if provided
        if (age) {
            const userAge = age.toLowerCase().trim();
            allGowns = allGowns.filter(gown => {
                if (Array.isArray(gown.ageGroup)) {
                    return gown.ageGroup.some(a => a.toLowerCase().trim() === userAge);
                }
                const gownAge = (gown.ageGroup || '').toLowerCase().trim();
                return gownAge === userAge;
            });
        }

        // Filter by sex if provided
        if (sex) {
            const userSex = sex.toLowerCase().trim();
            allGowns = allGowns.filter(gown => {
                const gownSex = (gown.sex || '').toLowerCase().trim();
                // Also match Unisex gowns when user selects Male or Female
                return gownSex === userSex || gownSex === 'unisex';
            });
        }

        // If no preferences provided, return all filtered gowns
        if (!bodyType && !skinTone && !height && !eventType && !faceShape && !age && !sex) {
            return res.json({
                success: true,
                recommendations: allGowns.map(gown => ({
                    gown,
                    score: 50, // Default score
                    matchReason: "General recommendation"
                }))
            });
        }

        // Calculate scores for each gown (now only scoring the filtered gowns)
        const preferences = { bodyType, skinTone, height, eventType, faceShape, age, sex };
        const scoredGowns = allGowns.map(gown => {
            const score = calculateRecommendationScore(gown, preferences);
            return {
                gown,
                score,
                matchReason: score >= 70 ? "Excellent match" :
                    score >= 50 ? "Good match" :
                        score >= 30 ? "Fair match" : "Consider"
            };
        });

        // Sort by score (highest first)
        scoredGowns.sort((a, b) => b.score - a.score);

        // Return all matched gowns (already filtered by event type)
        res.json({
            success: true,
            recommendations: scoredGowns,
            preferences,
            totalMatches: scoredGowns.length
        });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}
// API to update shop profile (for owners)
export const updateShopProfile = async (req, res) => {
    try {
        const { _id } = req.user
        const { shopName, description, address, city, operatingHours, openingTime, closingTime, availableDays, facebook, instagram } = req.body

        const user = await User.findById(_id)

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" })
        }

        if (user.role !== 'owner') {
            return res.status(403).json({ success: false, message: "Only owners can update shop profile" })
        }

        // Handle file uploads
        let businessPermitUrl = user.shopProfile?.businessPermit || ''
        let dtiRegistrationUrl = user.shopProfile?.dtiRegistration || ''

        // Upload business permit if provided
        if (req.files && req.files.businessPermit) {
            const imageKit = (await import('../configs/imagekit.js')).default
            const fs = await import('fs')
            const file = req.files.businessPermit[0]

            // Read file from disk
            let fileBuffer
            if (file.buffer) {
                fileBuffer = file.buffer
            } else if (file.path) {
                fileBuffer = fs.readFileSync(file.path)
            }

            const uploadResponse = await imageKit.upload({
                file: fileBuffer.toString('base64'),
                fileName: `business_permit_${_id}_${Date.now()}.${file.mimetype.split('/')[1]}`,
                folder: '/business_documents'
            })
            businessPermitUrl = uploadResponse.url

            // Clean up temp file
            if (file.path) {
                fs.unlinkSync(file.path)
            }
        }

        // Upload DTI registration if provided
        if (req.files && req.files.dtiRegistration) {
            const imageKit = (await import('../configs/imagekit.js')).default
            const fs = await import('fs')
            const file = req.files.dtiRegistration[0]

            // Read file from disk
            let fileBuffer
            if (file.buffer) {
                fileBuffer = file.buffer
            } else if (file.path) {
                fileBuffer = fs.readFileSync(file.path)
            }

            const uploadResponse = await imageKit.upload({
                file: fileBuffer.toString('base64'),
                fileName: `dti_registration_${_id}_${Date.now()}.${file.mimetype.split('/')[1]}`,
                folder: '/business_documents'
            })
            dtiRegistrationUrl = uploadResponse.url

            // Clean up temp file
            if (file.path) {
                fs.unlinkSync(file.path)
            }
        }

        // Get contact number from request body
        const rawContactNumber = req.body.contactNumber || user.shopProfile?.contactNumber || user.contactNumber || ''
        const contactNumber = rawContactNumber.toString().replace(/\D/g, '').slice(0, 11)

        if (contactNumber && contactNumber.length !== 11) {
            return res.status(400).json({ success: false, message: "Shop contact number must be exactly 11 digits" })
        }

        // Build operatingHours string if separate time fields are provided
        let finalOperatingHours = operatingHours
        let finalOpeningTime = openingTime
        let finalClosingTime = closingTime

        if (openingTime && closingTime) {
            finalOperatingHours = `${openingTime}-${closingTime}`
            finalOpeningTime = openingTime
            finalClosingTime = closingTime
        }

        // Parse availableDays if it's a JSON string
        let parsedAvailableDays = availableDays
        if (typeof availableDays === 'string') {
            try {
                parsedAvailableDays = JSON.parse(availableDays)
            } catch (e) {
                parsedAvailableDays = user.shopProfile?.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            }
        }

        // Update shop profile
        user.shopProfile = {
            ...user.shopProfile,
            shopName: shopName || user.shopProfile?.shopName || '',
            description: description || user.shopProfile?.description || '',
            address: address || user.shopProfile?.address || '',
            city: city || user.shopProfile?.city || '',
            contactNumber: contactNumber,
            operatingHours: finalOperatingHours || user.shopProfile?.operatingHours || '',
            openingTime: finalOpeningTime || user.shopProfile?.openingTime || '09:00',
            closingTime: finalClosingTime || user.shopProfile?.closingTime || '19:00',
            availableDays: parsedAvailableDays || user.shopProfile?.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            socialMedia: {
                facebook: facebook || user.shopProfile?.socialMedia?.facebook || '',
                instagram: instagram || user.shopProfile?.socialMedia?.instagram || ''
            },
            verified: user.shopProfile?.verified || false,
            verifiedAt: user.shopProfile?.verifiedAt,
            businessPermit: businessPermitUrl,
            dtiRegistration: dtiRegistrationUrl
        }

        // Sync contact number to root level for easy access
        user.contactNumber = contactNumber

        await user.save()
        
        // Sync all gowns with the new shop info for "easy accessibility" and redundancy
        await Gown.updateMany(
            { owner: _id },
            { $set: { contactNumber: contactNumber, location: address || user.shopProfile.address } }
        )

        res.json({
            success: true,
            message: "Shop profile updated successfully",
            shopProfile: user.shopProfile
        })

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// API to get shop profile by owner ID
export const getShopProfile = async (req, res) => {
    try {
        const { ownerId } = req.params
        const owner = await User.findById(ownerId).select('name email contactNumber shopProfile createdAt role')

        if (!owner) {
            return res.status(404).json({ success: false, message: "Owner not found" })
        }

        res.json({
            success: true,
            shopProfile: owner.shopProfile,
            ownerName: owner.name,
            ownerEmail: owner.email,
            ownerContactNumber: owner.contactNumber,
            memberSince: owner.createdAt
        })

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}


// API to get shop operating hours for booking (openingTime, closingTime, availableDays)
export const getShopOperatingHours = async (req, res) => {
    try {
        const { ownerId } = req.params

        const owner = await User.findById(ownerId).select('shopProfile role')

        if (!owner || owner.role !== 'owner') {
            return res.status(404).json({ success: false, message: "Shop not found" })
        }

        const shopProfile = owner.shopProfile || {}

        // Return operating hours in a format useful for booking
        res.json({
            success: true,
            operatingHours: {
                openingTime: shopProfile.openingTime || '09:00',
                closingTime: shopProfile.closingTime || '19:00',
                availableDays: shopProfile.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                operatingHours: shopProfile.operatingHours || '09:00-19:00'
            }
        })

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}