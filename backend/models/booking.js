import mongoose from "mongoose";
const {ObjectId} = mongoose.Schema.Types

const bookingSchema = new mongoose.Schema({
    gown: {type: ObjectId, ref: "Gown", required: true},
    user: {type: ObjectId, ref: "User", required: true},
    owner: {type: ObjectId, ref: "User", required: true},
    // Booking lifecycle for Manage Booking:
    // pending -> confirmed (pickup confirmed by owner) -> completed (return confirmed by owner)
    // or canceled at any point before completion
    status: {
        type: String,
        enum: ["pending", "confirmed", "canceled", "completed"],
        default: "pending"
    },
    pickupDate: {type: Date, required: true},
    returnDate: {type: Date, required: true},
    pickupTime: {type: String},
    returnTime: {type: String},
    // Timestamps for owner confirmations, used by Manage Booking UI
    pickupConfirmedAt: { type: Date },
    returnConfirmedAt: { type: Date },
    price: {type: Number, required: true},
    contactNumber: {type: String, default: ''},
    measurements: {
        waist: {type: Number},
        hips: {type: Number},
        unit: {type: String, default: 'inches'}
    },
    // Payment information
    payment: {
        method: { type: String, enum: ['gcash'], default: 'gcash' },
        depositAmount: { type: Number, required: true },
        totalAmount: { type: Number, required: true },
        remainingBalance: { type: Number },
        transactionRef: { type: String },
        screenshot: { type: String }, // URL to uploaded screenshot
        status: { 
            type: String, 
            enum: ['pending', 'verified', 'rejected'], 
            default: 'pending' 
        },
        verifiedAt: { type: Date },
        verifiedBy: { type: ObjectId, ref: 'User' },
        rejectionReason: { type: String }
    },
    balancePaidAt: { type: Date },
    balancePaidAmount: { type: Number }
}, {timestamps: true})

const Booking = mongoose.model('Booking', bookingSchema)
export default Booking;