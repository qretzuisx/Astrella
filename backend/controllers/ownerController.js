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

// upload img to imagekit
        const fileBuffer = fs.readFileSync(imageFile.path)
        const response = await imageKit.upload({
            file: fileBuffer,
            fileName: imageFile.originalname,
            folder: '/gown',
        })

// optimize through imagekit url
        const optimizedImageUrl = imageKit.url({
            path : response.filePath,
            transformation : [
                {width: '1280'},
                {quality: 'auto'},
                {format: 'webp'}
            ]
        });

        // Save image as array (model expects array)
        const image = [optimizedImageUrl];
        // Auto-verify gowns added by owners
        await Gown.create({...gown, owner: _id, image, verified: true, laundryDays});

        res.json({success: true, message: "Gown Added"})


    } catch (error) {
            console.log(error.message);
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
            console.log(error.message);
            res.json({success: false, message: error.message})
        
    }
}

// API to get all public gowns (available for browsing)
export const getAllGowns = async (req, res) => {
    try {
        const gowns = await Gown.find({ available: true, verified: true })
            .populate('owner', 'name')
            .sort({ createdAt: -1 })
        res.json({ success: true, gowns })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

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
        console.log(error.message);
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

        // Remove ownership and mark unavailable
        gown.owner = null;
        gown.available = false;

        await gown.save();
        res.json({success: true, message: "Gown Removed"})
    } catch (error) {
        console.log(error.message);
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

        res.json({ success: true, message: "Laundry buffer updated", laundryDays: gown.laundryDays });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
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

        // Monthly revenue when booking is confirmed
        const monthlyRevenue = bookings.filter(booking => 
            booking.status === 'confirmed'
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
         console.log(error.message);
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
        console.log(error.message)
        res.json({success: false, message: error.message}) 
    }
}

