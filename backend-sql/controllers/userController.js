import User from "../models/User.js";
import Gown from "../models/Gown.js";
import Booking from "../models/Booking.js";
import OwnerRequest from "../models/OwnerRequest.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';

// jwt token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// register user
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password || password.length < 8) {
            return res.json({ success: false, message: 'Fill all the Fields !' });
        }

        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.json({ success: false, message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword });
        const token = generateToken(user.id.toString());
        res.json({ success: true, token });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// login user
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Invalid Credentials" });
        }
        const token = generateToken(user.id.toString());
        res.json({ success: true, token });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// user data using jwt
export const getUserData = async (req, res) => {
    try {
        const { user } = req;
        res.json({ success: true, user });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Request to become owner
export const requestOwnerRole = async (req, res) => {
    try {
        const { id } = req.user;
        const { message } = req.body;

        // Check if user is already an owner
        const user = await User.findByPk(id);
        if (user.role === 'owner') {
            return res.json({ success: false, message: "You already have owner privileges" });
        }

        // Grant owner role immediately and store a record for history
        await user.update({ role: 'owner' });
        await OwnerRequest.create({
            userId: id,
            message: message || '',
            status: 'approved',
            systemNote: 'Owner access granted automatically',
        });

        res.json({ success: true, message: "Owner access granted immediately. You can now open the owner dashboard." });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Get user's owner request status
export const getOwnerRequestStatus = async (req, res) => {
    try {
        const { id } = req.user;

        const request = await OwnerRequest.findOne({
            where: { userId: id },
            order: [['createdAt', 'DESC']]
        });

        if (request) {
            return res.json({ success: true, request });
        }

        const user = await User.findByPk(id);
        if (user?.role === 'owner') {
            return res.json({
                success: true,
                request: {
                    id: user.id,
                    status: 'approved',
                    message: 'Owner access active',
                    systemNote: 'Owner access granted automatically',
                    createdAt: user.updatedAt,
                    updatedAt: user.updatedAt
                }
            });
        }

        res.json({ success: true, request: null });

    } catch (error) {
        console.log(error.message);
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
            if (gownEventTypes.includes(userEventType)) {
                score += 30;
            }
        } else if (typeof gown.eventType === 'string') {
            const gownEventType = gown.eventType?.toLowerCase().trim();
            if (gownEventType === userEventType) {
                score += 30;
            }
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
        score += 5;
    }

    // Skin Tone Color Recommendations (20 points)
    const skinToneColors = {
        'Warm': ['Gold', 'Peach', 'Coral', 'Ivory', 'Warm White', 'Blush', 'Cream'],
        'Cold': ['Silver', 'Blue', 'Pink', 'Cool White', 'Lavender', 'Mint'],
        'Neutral': ['All colors work well'],
        'Nuetral': ['All colors work well']
    };

    if (preferences.skinTone && skinToneColors[preferences.skinTone]) {
        const recommendedColors = skinToneColors[preferences.skinTone];
        const gownColor = gown.color?.toLowerCase();

        if (recommendedColors.some(c => gownColor?.includes(c.toLowerCase()))) {
            score += 20;
        } else if (recommendedColors[0] === 'All colors work well') {
            score += 15;
        }
    }

    // Height Recommendations (15 points)
    if (preferences.height) {
        const gownFabric = gown.fabric?.toLowerCase();
        if (preferences.height === 'Small') {
            if (['chiffon', 'tulle', 'organza'].some(f => gownFabric?.includes(f))) {
                score += 15;
            } else {
                score += 5;
            }
        } else if (preferences.height === 'Tall') {
            if (['satin', 'silk', 'velvet'].some(f => gownFabric?.includes(f))) {
                score += 15;
            } else {
                score += 10;
            }
        } else {
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
        score += 10;
    }

    return Math.min(score, maxScore);
};

// Update user profile
export const updateProfile = async (req, res) => {
    try {
        const { id } = req.user;
        const { name, contactNumber, address, bio } = req.body;

        if (!name || name.trim().length === 0) {
            return res.json({ success: false, message: 'Name is required' });
        }

        const user = await User.findByPk(id);
        await user.update({
            name: name.trim(),
            contactNumber: contactNumber || '',
        });

        // Return user without password
        const updatedUser = await User.findByPk(id, {
            attributes: { exclude: ['password'] }
        });

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
        const { id } = req.user;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.json({ success: false, message: 'All fields are required' });
        }

        if (newPassword.length < 8) {
            return res.json({ success: false, message: 'New password must be at least 8 characters long' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hashedPassword });

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

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found with that email' });
        }

        const rawToken = crypto.randomBytes(20).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        await user.update({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        });

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

        const user = await User.findOne({ where: { email } });
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
        await user.update({
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null
        });

        res.json({ success: true, message: 'Password reset successful. You can now log in.' });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// Get user statistics
export const getUserStatistics = async (req, res) => {
    try {
        const { id } = req.user;

        const allBookings = await Booking.findAll({ where: { userId: id } });
        const completedBookings = allBookings.filter(b => b.status === 'confirmed');
        const pendingBookings = allBookings.filter(b => b.status === 'pending');

        const user = await User.findByPk(id);

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
        const { id } = req.user;
        const user = await User.findByPk(id);

        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        const pendingBookings = await Booking.findAll({
            where: {
                userId: id,
                status: { [Op.in]: ['pending', 'confirmed'] }
            }
        });

        if (pendingBookings.length > 0) {
            return res.json({
                success: false,
                message: 'Please cancel or complete all active bookings before deleting your account'
            });
        }

        // Delete user's owner requests if any
        await OwnerRequest.destroy({ where: { userId: id } });

        // Delete user's bookings history
        await Booking.destroy({ where: { userId: id } });

        // Delete user
        await user.destroy();

        res.json({ success: true, message: 'Account deleted successfully' });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Get AI Recommendations
export const getRecommendations = async (req, res) => {
    try {
        const { bodyType, skinTone, height, eventType, faceShape } = req.query;

        let allGowns = await Gown.findAll({
            where: { available: true, verified: true },
            include: [{
                model: User,
                as: 'owner',
                attributes: ['id', 'name']
            }],
            order: [['createdAt', 'DESC']]
        });

        if (allGowns.length === 0) {
            return res.json({
                success: true,
                recommendations: [],
                message: "No gowns available at the moment"
            });
        }

        // STRICT EVENT TYPE FILTERING
        if (eventType) {
            const userEventType = eventType.toLowerCase().trim();
            allGowns = allGowns.filter(gown => {
                const gownData = gown.toJSON();
                if (Array.isArray(gownData.eventType)) {
                    const gownEventTypes = gownData.eventType.map(e => e.toLowerCase().trim());
                    return gownEventTypes.includes(userEventType);
                } else if (gownData.eventType) {
                    const gownEventType = gownData.eventType.toLowerCase().trim();
                    return gownEventType === userEventType;
                }
                return false;
            });

            if (allGowns.length === 0) {
                return res.json({
                    success: true,
                    recommendations: [],
                    preferences: { bodyType, skinTone, height, eventType, faceShape },
                    message: `No gowns available for ${eventType} events`
                });
            }
        }

        if (!bodyType && !skinTone && !height && !eventType && !faceShape) {
            return res.json({
                success: true,
                recommendations: allGowns.map(gown => ({
                    gown: gown.toJSON(),
                    score: 50,
                    matchReason: "General recommendation"
                }))
            });
        }

        const preferences = { bodyType, skinTone, height, eventType, faceShape };
        const scoredGowns = allGowns.map(gown => {
            const gownData = gown.toJSON();
            const score = calculateRecommendationScore(gownData, preferences);
            return {
                gown: gownData,
                score,
                matchReason: score >= 70 ? "Excellent match" :
                    score >= 50 ? "Good match" :
                        score >= 30 ? "Fair match" : "Consider"
            };
        });

        scoredGowns.sort((a, b) => b.score - a.score);

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
        const { id } = req.user;
        const { shopName, description, address, city, operatingHours, facebook, instagram, contactNumber } = req.body;

        console.log('Shop profile update request:', { shopName, address, city });
        console.log('Files received:', req.files ? Object.keys(req.files) : 'none');

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.role !== 'owner') {
            return res.status(403).json({ success: false, message: "Only owners can update shop profile" });
        }

        let businessPermitUrl = user.businessPermit || '';
        let dtiRegistrationUrl = user.dtiRegistration || '';

        // Upload business permit if provided
        if (req.files && req.files.businessPermit) {
            const file = req.files.businessPermit[0];
            // Store as base64 for offline support
            businessPermitUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        }

        // Upload DTI registration if provided
        if (req.files && req.files.dtiRegistration) {
            const file = req.files.dtiRegistration[0];
            // Store as base64 for offline support
            dtiRegistrationUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        }

        // Update user with shop profile information
        await user.update({
            shopName: shopName || user.shopName,
            shopDescription: description || user.shopDescription,
            shopAddress: address || user.shopAddress,
            shopCity: city || user.shopCity,
            shopContactNumber: contactNumber || user.shopContactNumber || user.contactNumber,
            operatingHours: operatingHours || user.operatingHours,
            facebookUrl: facebook || user.facebookUrl,
            instagramUrl: instagram || user.instagramUrl,
            businessPermit: businessPermitUrl,
            dtiRegistration: dtiRegistrationUrl,
            contactNumber: contactNumber || user.contactNumber
        });

        const updatedUser = await User.findByPk(id, {
            attributes: { exclude: ['password'] }
        });

        res.json({
            success: true,
            message: "Shop profile updated successfully",
            shopProfile: {
                shopName: updatedUser.shopName,
                description: updatedUser.shopDescription,
                address: updatedUser.shopAddress,
                city: updatedUser.shopCity,
                contactNumber: updatedUser.shopContactNumber,
                operatingHours: updatedUser.operatingHours,
                socialMedia: {
                    facebook: updatedUser.facebookUrl,
                    instagram: updatedUser.instagramUrl
                },
                verified: updatedUser.verified,
                verifiedAt: updatedUser.verifiedAt,
                businessPermit: updatedUser.businessPermit,
                dtiRegistration: updatedUser.dtiRegistration
            }
        });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// API to get shop profile by owner ID
export const getShopProfile = async (req, res) => {
    try {
        const { ownerId } = req.params;

        console.log('📋 Get shop profile request for ownerId:', ownerId);

        const owner = await User.findByPk(ownerId, {
            attributes: { exclude: ['password'] }
        });

        if (!owner) {
            console.log('❌ Owner not found:', ownerId);
            return res.status(404).json({ success: false, message: "Owner not found" });
        }

        if (owner.role !== 'owner') {
            console.log('❌ User is not an owner:', ownerId);
            return res.status(404).json({ success: false, message: "User is not an owner" });
        }

        console.log('✅ Shop profile found for:', owner.name);

        res.json({
            success: true,
            owner: {
                id: owner.id,
                name: owner.name,
                email: owner.email,
                contactNumber: owner.contactNumber,
                shopProfile: {
                    shopName: owner.shopName,
                    description: owner.shopDescription,
                    address: owner.shopAddress,
                    city: owner.shopCity,
                    contactNumber: owner.shopContactNumber,
                    operatingHours: owner.operatingHours,
                    socialMedia: {
                        facebook: owner.facebookUrl,
                        instagram: owner.instagramUrl
                    },
                    verified: owner.verified,
                    verifiedAt: owner.verifiedAt,
                    businessPermit: owner.businessPermit,
                    dtiRegistration: owner.dtiRegistration
                },
                joinedDate: owner.createdAt
            }
        });

    } catch (error) {
        console.log('❌ Error in getShopProfile:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}
