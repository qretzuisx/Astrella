import imageKit from "../configs/imagekit.js";
import Booking from "../models/booking.js";
import Gown from "../models/Gown.js";
import User from "../models/User.js";
import fs from "fs";

const clampLaundryDays = (value) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
        return 0;
    }
    return Math.min(Math.floor(parsed), 14);
};

// API to list gowns
const normalizeOptionalTags = (gown) => {
    const normalizedAgeGroup = typeof gown.ageGroup === 'string' ? gown.ageGroup.trim() : ''
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
    const fileBuffer = fs.readFileSync(imageFile.path)
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

export const addGown = async (req, res) =>{
    try {
        const {_id} = req.user;
        let gown = JSON.parse(req.body.gownData);
        const imageFile = req.file;
        const laundryDays = clampLaundryDays(gown.laundryDays ?? 1);

        if(!imageFile) {
            return res
            .status(400)
            .json({success: false, message: "No image uploaded"});
        }

        // Fetch user's shop profile
        const user = await User.findById(_id);
        if (!user) {
            return res.status(404).json({success: false, message: "User not found"});
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

        // Get contact number from either location (shopProfile takes priority)
        const gownContactNumber = user.shopProfile?.contactNumber || user.contactNumber || ''

        // Normalize ageGroup/sex (optional)
        const { normalizedAgeGroup, normalizedSex } = normalizeOptionalTags(gown)

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
            contactNumber: gownContactNumber
        });

        res.json({success: true, message: "Gown Added"})


    } catch (error) {
            console.error(error);
            res.json({success: false, message: error.message})
    }
}

// API to list owner gowns
export const getOwnersGowns = async (req, res)=>{
    try {
        const {_id} = req.user;
        const gowns = await Gown.find({owner: _id })
        res.json({success: true, gowns})
    } catch (error) {
            console.error(error);
            res.json({success: false, message: error.message})
        
    }
}

// API to get all public gowns (available for browsing)
export const getAllGowns = async (req, res) => {
    try {
        const gowns = await Gown.find({})
            .populate('owner', 'name')
            .sort({ createdAt: -1 })
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
        const gown = await Gown.findById(id).populate('owner', 'name shopName');
        if (!gown) {
            return res.status(404).json({ success: false, message: 'Gown not found' });
        }
        res.json({ success: true, gown });
    } catch (error) {
        console.error('getGownById:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// API to toggle Gown Availability
export const ToggleGownAvailability = async (req, res)=>{
    try {
         const {_id} = req.user;
         const {gownID} = req.body
        const gown = await Gown.findById(gownID)

        if (!gown) {
            return res.status(404).json({ success: false, message: 'Gown not found' })
        }

        if(gown.owner.toString() !== _id.toString()){
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        gown.available = !gown.available;
        await gown.save();
        res.json({success: true, message: "Availability Toggled", available: gown.available})
    } catch (error) {
        console.error(error);
        res.json({success: false, message: error.message})
        
    }
}

// API to delete a gown
export const DeleteGown = async (req, res)=>{
    try {
         const {_id} = req.user;
         const {gownID} = req.body
        const gown = await Gown.findById(gownID)

        if (!gown) {
            return res.status(404).json({ success: false, message: 'Gown not found' })
        }

        if(gown.owner.toString() !== _id.toString()){
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
        res.json({success: true, message: "Gown and all associated booking records deleted successfully"})
    } catch (error) {
        console.error(error);
        res.json({success: false, message: error.message})
        
    }
}

export const updateLaundryDays = async (req, res) => {
    try {
        const {_id} = req.user;
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

        gown.laundryDays = clampLaundryDays(laundryDays);
        await gown.save();

        res.json({ success: true, message: "Laundry day updated", laundryDays: gown.laundryDays });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
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
        const updatableFields = ['name', 'price', 'description', 'size', 'eventType', 'fabric', 'color', 'ageGroup', 'sex', 'status'];
        
        // Update each provided field
        updatableFields.forEach(field => {
            if (req.body.hasOwnProperty(field) && req.body[field] !== undefined) {
                gown[field] = req.body[field];
            }
        });

        // Normalize ageGroup/sex (optional)
        const { normalizedAgeGroup, normalizedSex } = normalizeOptionalTags(gown);
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
export const getDashboardData = async (req, res)=>{
    try {
        const {_id, role } = req.user;

        if(role !== 'owner'){
            return res.json({ success: false, message: "Unauthorized" });
        }

        const gowns = await Gown.find({owner: _id})
        const bookings = await Booking.find({owner: _id})
            .populate('gown')
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        const pendingBookings = await Booking.find({owner: _id, status: 'pending'})
        const completedBookings = await Booking.find({owner: _id, status: 'completed'})

        // Monthly revenue: count confirmed AND completed bookings (completed were previously confirmed)
        const monthlyRevenue = bookings.filter(booking => 
            booking.status === 'confirmed' || booking.status === 'completed'
        ).reduce((acc, booking) => acc + (booking.price || 0), 0)

        const dashboardData = {
            totalGowns: gowns.length,
            totalBookings: bookings.length,
            pendingBookings: pendingBookings.length,
            completedBookings: completedBookings.length,
            recentBookings: bookings.slice(0, 3),
            monthlyRevenue
        }

    res.json({success: true, dashboardData});

    } catch (error) {
         console.error(error);
        res.json({success: false, message: error.message})
    }
}

//API to update profile img

export const updateUserImage = async (req, res)=>{
    try {
        const {_id} = req.user;

        const imageFile = req.file;

        if(!imageFile) {
            return res
            .status(400)
            .json({success: false, message: "No image uploaded"});
        }

        const fileBuffer = fs.readFileSync(imageFile.path)
        const response = await imageKit.upload({
            file: fileBuffer,
            fileName: imageFile.originalname,
            folder: '/users',
        })

        const optimizedImageUrl = imageKit.url({
            path : response.filePath,
            transformation : [
                {width: '400'},
                {quality: 'auto'},
                {format: 'webp'}
            ]
        });

        const image = optimizedImageUrl;
        await User.findByIdAndUpdate(_id, {image});

        res.json({success: true, message: "Image Update"})
      
    } catch (error) {
        console.error(error)
        res.json({success: false, message: error.message}) 
    }
}

