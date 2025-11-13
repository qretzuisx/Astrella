import User from "../models/User.js";
import OwnerRequest from "../models/OwnerRequest.js";

// Get all pending owner requests
export const getPendingOwnerRequests = async (req, res) => {
    try {
        const { role } = req.user;
        
        if (role !== 'admin') {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }

        const requests = await OwnerRequest.find({ status: 'pending' })
            .populate('user', 'name email image')
            .sort({ createdAt: -1 });

        res.json({ success: true, requests });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Approve owner request
export const approveOwnerRequest = async (req, res) => {
    try {
        const { _id, role } = req.user;
        const { requestId, adminNote } = req.body;

        if (role !== 'admin') {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }

        const request = await OwnerRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        if (request.status !== 'pending') {
            return res.json({ success: false, message: "Request already processed" });
        }

        // Update user role to owner
        await User.findByIdAndUpdate(request.user, { role: 'owner' });

        // Update request status
        request.status = 'approved';
        request.reviewedBy = _id;
        request.adminNote = adminNote || '';
        await request.save();

        res.json({ success: true, message: "Owner request approved" });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Reject owner request
export const rejectOwnerRequest = async (req, res) => {
    try {
        const { _id, role } = req.user;
        const { requestId, adminNote } = req.body;

        if (role !== 'admin') {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }

        const request = await OwnerRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        if (request.status !== 'pending') {
            return res.json({ success: false, message: "Request already processed" });
        }

        // Update request status
        request.status = 'rejected';
        request.reviewedBy = _id;
        request.adminNote = adminNote || '';
        await request.save();

        res.json({ success: true, message: "Owner request rejected" });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
    try {
        const { role } = req.user;
        
        if (role !== 'admin') {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }

        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        res.json({ success: true, users });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Manually change user role (admin only)
export const changeUserRole = async (req, res) => {
    try {
        const { role } = req.user;
        const { userId, newRole } = req.body;

        if (role !== 'admin') {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }

        if (!['user', 'owner', 'admin'].includes(newRole)) {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }

        await User.findByIdAndUpdate(userId, { role: newRole });
        res.json({ success: true, message: `User role changed to ${newRole}` });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

