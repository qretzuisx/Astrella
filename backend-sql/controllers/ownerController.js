// ImageKit removed for offline support
import Booking from "../models/Booking.js";
import Gown from "../models/Gown.js";
import User from "../models/User.js";

const clampLaundryDays = (value) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
        return 0;
    }
    return Math.min(Math.floor(parsed), 14);
};

// API to list gowns
export const addGown = async (req, res) => {
    try {
        const { id } = req.user;
        let gown = JSON.parse(req.body.gownData);
        const imageFile = req.file;
        const laundryDays = clampLaundryDays(gown.laundryDays ?? 1);

        if (!imageFile) {
            return res
                .status(400)
                .json({ success: false, message: "No image uploaded" });
        }

        // Fetch user's shop profile
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Validate that shop profile has required information
        if (!user.shopAddress || user.shopAddress.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Please update your shop profile with a valid address before adding gowns."
            });
        }

        // Check contact number from either location
        const contactNumber = user.shopContactNumber || user.contactNumber || '';
        if (!contactNumber || contactNumber.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Please update your shop profile with a valid contact number before adding gowns."
            });
        }

        // Store image as base64 for offline support
        const base64Image = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
        const image = [base64Image];

        // Get contact number from either location (shopProfile takes priority)
        const gownContactNumber = user.shopContactNumber || user.contactNumber || '';

        // Auto-verify gowns added by owners
        await Gown.create({
            ...gown,
            ownerId: id,
            image,
            verified: true,
            laundryDays,
            location: user.shopAddress,
            contactNumber: gownContactNumber
        });

        res.json({ success: true, message: "Gown Added" });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// API to list owner gowns
export const getOwnersGowns = async (req, res) => {
    try {
        const { id } = req.user;
        const gowns = await Gown.findAll({ where: { ownerId: id } });
        res.json({ success: true, gowns });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// API to get all public gowns (available for browsing)
export const getAllGowns = async (req, res) => {
    try {
        const gowns = await Gown.findAll({
            where: { available: true, verified: true },
            include: [{
                model: User,
                as: 'owner',
                attributes: ['id', 'name']
            }],
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, gowns });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// API to toggle Gown Availability
export const ToggleGownAvailability = async (req, res) => {
    try {
        const { id } = req.user;
        const { gownID } = req.body;
        const gown = await Gown.findByPk(gownID);

        if (!gown) {
            return res.status(404).json({ success: false, message: 'Gown not found' });
        }

        if (gown.ownerId !== id) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        await gown.update({ available: !gown.available });
        res.json({ success: true, message: "Availability Toggled", available: gown.available });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// API to delete a gown
export const DeleteGown = async (req, res) => {
    try {
        const { id } = req.user;
        const { gownID } = req.body;
        const gown = await Gown.findByPk(gownID);

        if (!gown) {
            return res.status(404).json({ success: false, message: 'Gown not found' });
        }

        if (gown.ownerId !== id) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        // Actually delete the gown from database
        await gown.destroy();

        res.json({ success: true, message: "Gown Deleted" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

export const updateLaundryDays = async (req, res) => {
    try {
        const { id } = req.user;
        const { gownID, laundryDays } = req.body;

        if (!gownID) {
            return res.status(400).json({ success: false, message: "Missing gownID" });
        }

        const gown = await Gown.findByPk(gownID);
        if (!gown) {
            return res.status(404).json({ success: false, message: "Gown not found" });
        }

        if (gown.ownerId !== id) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        const clampedDays = clampLaundryDays(laundryDays);
        await gown.update({ laundryDays: clampedDays });

        res.json({ success: true, message: "Laundry day updated", laundryDays: gown.laundryDays });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// API Dashboard data
export const getDashboardData = async (req, res) => {
    try {
        const { id, role } = req.user;

        if (role !== 'owner') {
            return res.json({ success: false, message: "Unauthorized" });
        }

        const gowns = await Gown.findAll({ where: { ownerId: id } });
        const bookings = await Booking.findAll({
            where: { ownerId: id },
            include: [
                {
                    model: Gown,
                    as: 'gown'
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        const pendingBookings = bookings.filter(b => b.status === 'pending');
        const completedBookings = bookings.filter(b => b.status === 'completed');

        // Monthly revenue: count confirmed AND completed bookings (completed were previously confirmed)
        const monthlyRevenue = bookings
            .filter(booking => booking.status === 'confirmed' || booking.status === 'completed')
            .reduce((acc, booking) => acc + (parseFloat(booking.price) || 0), 0);

        // Transform recent bookings to match frontend expectations
        const transformedRecentBookings = bookings.slice(0, 3).map(booking => {
            const bookingData = booking.toJSON ? booking.toJSON() : booking;
            return {
                ...bookingData,
                _id: bookingData.id,
                measurements: bookingData.waist || bookingData.hips ? {
                    waist: bookingData.waist,
                    hips: bookingData.hips,
                    unit: bookingData.measurementUnit || 'inches'
                } : undefined,
                payment: {
                    method: bookingData.paymentMethod || 'gcash',
                    depositAmount: bookingData.depositAmount,
                    totalAmount: bookingData.totalAmount,
                    remainingBalance: bookingData.remainingBalance,
                    transactionRef: bookingData.transactionRef,
                    screenshot: bookingData.paymentScreenshot,
                    status: bookingData.paymentStatus || 'pending',
                    verifiedAt: bookingData.paymentVerifiedAt,
                    verifiedBy: bookingData.paymentVerifiedBy,
                    rejectionReason: bookingData.rejectionReason
                }
            };
        });

        const dashboardData = {
            totalGowns: gowns.length,
            totalBookings: bookings.length,
            pendingBookings: pendingBookings.length,
            completedBookings: completedBookings.length,
            recentBookings: transformedRecentBookings,
            monthlyRevenue
        };

        res.json({ success: true, dashboardData });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

//API to update profile img
export const updateUserImage = async (req, res) => {
    try {
        const { id } = req.user;
        const imageFile = req.file;

        if (!imageFile) {
            return res
                .status(400)
                .json({ success: false, message: "No image uploaded" });
        }

        // Store image as base64 for offline support
        const base64Image = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;

        await User.update({ image: base64Image }, { where: { id } });

        res.json({ success: true, message: "Image Updated" });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}
