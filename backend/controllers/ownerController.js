import imageKit from "../configs/imagekit.js";
import Booking from "../models/booking.js";
import Gown from "../models/Gown.js";
import User from "../models/User.js";
import fs from "fs";
import { calculateActualGownStatus, batchUpdateGownStatuses } from "./bookingController.js";
import { combineDateAndTime, toLocalDateString } from "../utils/dateUtils.js";

// [SECTION] OWNER UTILITIES
const clampLaundryDays = (value) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
        return 0;
    }
    return Math.min(Math.floor(parsed), 14);
};

// [SECTION] OWNER DASHBOARD DATA
/**
 * [INFO] Aggregates financial and inventory metrics for the owner's dashboard.
 */
// [SECTION] OWNER HELPER FUNCTIONS
const normalizeOptionalTags = (gown) => {
    let normalizedAgeGroup = []
    if (Array.isArray(gown.ageGroup)) {
        normalizedAgeGroup = gown.ageGroup.filter(a => typeof a === 'string' && a.trim() !== '').map(a => a.trim())
    } else if (typeof gown.ageGroup === 'string' && gown.ageGroup.trim() !== '') {
        normalizedAgeGroup = [gown.ageGroup.trim()]
    }

    let normalizedSex = typeof gown.sex === 'string' ? gown.sex.trim() : ''
    if (normalizedSex) {
        const s = normalizedSex.toLowerCase()
        if (s === 'male') normalizedSex = 'Male'
        else if (s === 'female') normalizedSex = 'Female'
        else if (s === 'unisex') normalizedSex = 'Unisex'
    }
    return { normalizedAgeGroup, normalizedSex }
}

const uploadAndOptimizeGownImage = async (imageFile) => {
    let fileBuffer;
    if (imageFile.buffer) {
        fileBuffer = imageFile.buffer;
    } else if (imageFile.path) {
        fileBuffer = fs.readFileSync(imageFile.path);
    } else {
        throw new Error('No image data found (buffer or path missing)');
    }

    const response = await imageKit.upload({
        file: fileBuffer,
        fileName: imageFile.originalname,
        folder: '/gown',
    })

    const optimizedImageUrl = imageKit.url({
        path: response.filePath,
        transformation: [
            { width: '1280' },
            { quality: 'auto' },
            { format: 'webp' }
        ]
    })

    return optimizedImageUrl
}

export const addGown = async (req, res) => {
    try {
        const { _id } = req.user;
        let gown;
        try {
            gown = JSON.parse(req.body.gownData);
        } catch (parseErr) {
            return res.status(400).json({ success: false, message: "Invalid gown data" });
        }
        const imageFile = req.file;
        const laundryDays = clampLaundryDays(gown.laundryDays ?? 1);

        if (!imageFile) {
            return res
                .status(400)
                .json({ success: false, message: "No image uploaded" });
        }

        // Fetch user's shop profile
        const user = await User.findById(_id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Validate that shop profile has required information
        if (!user.shopProfile?.address || user.shopProfile.address.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Please update your shop profile with a valid address before adding gowns."
            });
        }

        // Check contact number from either location
        const contactNumber = user.shopProfile?.contactNumber || user.contactNumber || ''
        if (!contactNumber || contactNumber.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Please update your shop profile with a valid contact number before adding gowns."
            });
        }

        const optimizedImageUrl = await uploadAndOptimizeGownImage(imageFile)

        // Save image as array (model expects array)
        const image = [optimizedImageUrl];


        // Normalize ageGroup/sex (optional)
        const { normalizedAgeGroup, normalizedSex } = normalizeOptionalTags(gown)

        if (normalizedAgeGroup.length === 0) {
            return res.status(400).json({ success: false, message: "Age group is required" });
        }

        if (!normalizedSex) {
            return res.status(400).json({ success: false, message: "Sex/Gender is required" });
        }

        await Gown.create({
            ...gown,
            description: typeof gown.description === 'string' ? gown.description : '',
            ageGroup: normalizedAgeGroup,
            sex: normalizedSex,
            owner: _id,
            image,
            verified: true,
            laundryDays,
            location: user.shopProfile.address,
            contactNumber
        });

        res.json({ success: true, message: "Gown Added" })


    } catch (error) {
        console.error(`[AddGown Error]`, error);
        res.status(500).json({ success: false, message: error.message })
    }
}

// API to list owner gowns
export const getOwnersGowns = async (req, res) => {
    try {
        const { _id } = req.user;
        const gowns = await Gown.find({ owner: _id })
        
        // Calculate actual status for each gown in batch to avoid N+1 queries
        await batchUpdateGownStatuses(gowns);

        res.json({ success: true, gowns })
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message })
    }
}

// API to get all public gowns (available for browsing)
export const getAllGowns = async (req, res) => {
    try {
        let gowns = await Gown.find({ 
            statusOverride: { $ne: 'Sold Out' }
        })
            .populate('owner', 'name')
            .sort({ views: -1, createdAt: -1 })
        
        // Filter out gowns whose owners were deleted
        gowns = gowns.filter(gown => gown.owner !== null);

        // Calculate actual status for ALL gowns in batch to avoid N+1 queries
        await batchUpdateGownStatuses(gowns);

        res.json({ success: true, gowns })
    } catch (error) {
        console.error('getAllGowns:', error);
        res.status(500).json({ success: false, message: error.message })
    }
}

// API to get a single gown by id (public, for detail page)
export const getGownById = async (req, res) => {
    try {
        const { id } = req.params;
        const gown = await Gown.findByIdAndUpdate(
            id, 
            { $inc: { views: 1 } }, 
            { new: true }
        ).populate('owner', 'name shopName shopProfile contactNumber');
        if (!gown) {
            return res.status(404).json({ success: false, message: 'Gown not found' });
        }
        // Respect owner's manual status override, otherwise calculate dynamically
        gown.status = await calculateActualGownStatus(gown._id);
        res.json({ success: true, gown });
    } catch (error) {
        console.error('getGownById:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// API to toggle Gown Availability
export const ToggleGownAvailability = async (req, res) => {
    try {
        const { _id } = req.user;
        const { gownID } = req.body
        const gown = await Gown.findById(gownID)

        if (!gown) {
            return res.status(404).json({ success: false, message: 'Gown not found' })
        }

        if (gown.owner.toString() !== _id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        gown.available = !gown.available;
        await gown.save();
        res.json({ success: true, message: "Availability Toggled", available: gown.available })
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message })
    }
}

// API to delete a gown
export const DeleteGown = async (req, res) => {
    try {
        const { _id } = req.user;
        const { gownID } = req.body
        const gown = await Gown.findById(gownID)

        if (!gown) {
            return res.status(404).json({ success: false, message: 'Gown not found' })
        }

        if (gown.owner.toString() !== _id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        // Check if there are any active bookings for this gown
        const activeBookings = await Booking.findOne({
            gown: gownID,
            status: { $nin: ['canceled', 'completed'] }
        })

        if (activeBookings) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete gown with active bookings. Please cancel or complete all bookings first.'
            })
        }

        // Delete all bookings associated with this gown (completed and canceled ones)
        await Booking.deleteMany({ gown: gownID })

        // Delete the gown from the database
        await Gown.findByIdAndDelete(gownID)
        res.json({ success: true, message: "Gown and all associated booking records deleted successfully" })
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message })
    }
}

export const updateLaundryDays = async (req, res) => {
    try {
        const { _id } = req.user;
        const { gownID, laundryDays } = req.body;

        if (!gownID) {
            return res.status(400).json({ success: false, message: "Missing gownID" });
        }

        const gown = await Gown.findById(gownID);
        if (!gown) {
            return res.status(404).json({ success: false, message: "Gown not found" });
        }

        if (gown.owner?.toString() !== _id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        const oldDays = gown.laundryDays;
        gown.laundryDays = clampLaundryDays(laundryDays);
        await gown.save();

        res.json({ success: true, message: "Laundry day updated", laundryDays: gown.laundryDays });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// API to update gown details (name, price, description, size, etc.)
export const updateGown = async (req, res) => {
    try {
        const { _id } = req.user;
        const { gownID } = req.body;

        if (!gownID) {
            return res.status(400).json({ success: false, message: "Missing gownID" });
        }

        const gown = await Gown.findById(gownID);
        if (!gown) {
            return res.status(404).json({ success: false, message: "Gown not found" });
        }

        if (gown.owner?.toString() !== _id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        // Fields that can be updated
        const updatableFields = ['name', 'price', 'description', 'size', 'eventType', 'fabric', 'color', 'ageGroup', 'sex', 'statusOverride', 'available'];

        // Update each provided field
        updatableFields.forEach(field => {
            if (req.body.hasOwnProperty(field) && req.body[field] !== undefined) {
                gown[field] = req.body[field];
            }
        });

        // Normalize ageGroup/sex (optional)
        const { normalizedAgeGroup, normalizedSex } = normalizeOptionalTags(gown);

        if (normalizedAgeGroup.length === 0) {
            return res.status(400).json({ success: false, message: "Age group is required" });
        }

        if (!normalizedSex) {
            return res.status(400).json({ success: false, message: "Sex/Gender is required" });
        }

        gown.ageGroup = normalizedAgeGroup;
        gown.sex = normalizedSex;

        await gown.save();

        res.json({
            success: true,
            message: "Gown updated successfully",
            gown
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// API Dashboard data
export const getDashboardData = async (req, res) => {
    try {
        const { _id, role } = req.user;

        if (role !== 'owner') {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        const gowns = await Gown.find({ owner: _id });
        const allBookings = await Booking.find({ owner: _id })
            .populate('gown')
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        const now = new Date();
        const bookings = allBookings.filter(booking => {
            if (booking.status !== 'trial') return true;
            return !(booking.trialExpiresAt && new Date(booking.trialExpiresAt) < now);
        });

        const pendingBookings = await Booking.find({ owner: _id, status: 'pending' })
        const completedBookings = await Booking.find({ owner: _id, status: 'completed' })

        // Monthly revenue: count confirmed AND completed bookings whose event (pickupDate) falls in the current month
        const currentYearMonth = toLocalDateString(now).substring(0, 7); // e.g. "2026-07"
        const monthlyRevenue = bookings.filter(booking =>
            (booking.status === 'confirmed' || booking.status === 'completed') &&
            toLocalDateString(booking.pickupDate).startsWith(currentYearMonth)
        ).reduce((acc, booking) => acc + (booking.price || 0), 0);

        const dashboardData = {
            totalGowns: gowns.length,
            totalBookings: bookings.length,
            pendingBookings: pendingBookings.length,
            completedBookings: completedBookings.length,
            recentBookings: bookings.slice(0, 3),
            monthlyRevenue
        }

        res.json({ success: true, dashboardData });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message })
    }
}

//API to update profile img

export const updateUserImage = async (req, res) => {
    try {
        const { _id } = req.user;

        const imageFile = req.file;

        if (!imageFile) {
            return res
                .status(400)
                .json({ success: false, message: "No image uploaded" });
        }

        let fileBuffer;
        if (imageFile.buffer) {
            fileBuffer = imageFile.buffer;
        } else if (imageFile.path) {
            fileBuffer = fs.readFileSync(imageFile.path);
        } else {
            return res.status(400).json({ success: false, message: "No image data found" });
        }

        const response = await imageKit.upload({
            file: fileBuffer,
            fileName: imageFile.originalname,
            folder: '/users',
        })

        const optimizedImageUrl = imageKit.url({
            path: response.filePath,
            transformation: [
                { width: '400' },
                { quality: 'auto' },
                { format: 'webp' }
            ]
        });

        const image = optimizedImageUrl;
        await User.findByIdAndUpdate(_id, { image });

        res.json({ success: true, message: "Image Update" })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}


// Optimized API to get trending gowns (most booked)
export const getTrendingGowns = async (req, res) => {
    try {
        // 1. Get top booked gowns via aggregation
        const trendingData = await Booking.aggregate([
            {
                $match: {
                    status: { $in: ['confirmed', 'completed'] }
                }
            },
            {
                $group: {
                    _id: '$gown',
                    bookingCount: { $sum: 1 }
                }
            },
            {
                $sort: { bookingCount: -1 }
            },
            {
                $limit: 10
            }
        ]);

        const trendingIds = trendingData.map(item => item._id);
        
        // 2. Fetch specific gowns + fallback if needed
        let initialGowns = await Gown.find({ 
            _id: { $in: trendingIds },
            statusOverride: { $ne: 'Sold Out' },
            available: true,
            verified: true
        }).populate('owner', 'name shopName');

        // Filter out orphaned gowns
        initialGowns = initialGowns.filter(gown => gown.owner !== null);

        let gowns = initialGowns;
        let gownIds = gowns.map(g => g._id);

        if (gowns.length < 5) {
            let recentGowns = await Gown.find({
                _id: { $nin: gownIds },
                available: true,
                statusOverride: { $ne: 'Sold Out' }
                // Removed strict verified filter for fallback to ensure something shows up
                // to avoid empty trending choice section
            })
            .populate('owner', 'name shopName')
            .sort({ verified: -1, createdAt: -1 }) // Prioritize verified if available
            .limit(10 - gowns.length);
            
            // Filter out orphaned gowns
            recentGowns = recentGowns.filter(g => g.owner !== null);
            
            gowns = [...gowns, ...recentGowns];
            gownIds = gowns.map(g => g._id);
        }

        // 4. Calculate statuses using the batch utility
        const finalizedGowns = await batchUpdateGownStatuses(gowns);

        // 5. Restore original trending order for the first set
        const trendingOrderMap = {};
        trendingIds.forEach((id, idx) => { trendingOrderMap[id.toString()] = idx; });
        
        finalizedGowns.sort((a, b) => {
            const idxA = trendingOrderMap[a._id.toString()] ?? 999;
            const idxB = trendingOrderMap[b._id.toString()] ?? 999;
            if (idxA !== idxB) return idxA - idxB;
            // secondary sort by newest if both were fallback
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.json({ success: true, gowns: finalizedGowns.slice(0, 10) });
    } catch (error) {
        console.error('getTrendingGowns:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// API to get existing attributes for suggestions
export const getExistingAttributes = async (req, res) => {
    try {
        const uniqueFabrics = await Gown.distinct('fabric');
        const uniqueColors = await Gown.distinct('color');
        
        // Clean up: filter out nulls/empties and trim
        const fabrics = [...new Set(uniqueFabrics.filter(f => f).map(f => f.trim()))].sort();
        const colors = [...new Set(uniqueColors.filter(c => c).map(c => c.trim()))].sort();
        
        res.json({ success: true, fabrics, colors });
    } catch (error) {
        console.error('getExistingAttributes:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
