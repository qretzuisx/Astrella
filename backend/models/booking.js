import mongoose from "mongoose";
const {ObjectId} = mongoose.Schema.Types

const bookingSchema = new mongoose.Schema({
    gown: {type: ObjectId, ref: "Gown", required: true},
    user: {type: ObjectId, ref: "User", required: true},
    owner: {type: ObjectId, ref: "User", required: true},
    // Booking lifecycle:
    // reservation: pending -> confirmed -> completed OR canceled
    // trial: trial -> canceled/expired OR converted to pending
    status: {
        type: String,
        enum: ["trial", "pending", "confirmed", "canceled", "completed", "expired"],
        default: "pending"
    },
    bookingType: {
        type: String,
        enum: ["reservation", "trial"],
        default: "reservation"
    },
    // Used only for trial bookings. If now > trialExpiresAt, the hold should be treated as expired.
    trialExpiresAt: { type: Date },

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
        method: { type: String, enum: ['gcash', 'in_store'], default: 'gcash' },
        depositAmount: { type: Number, required: function () { return this.bookingType !== 'trial'; }, default: 0 },
        totalAmount: { type: Number, required: function () { return this.bookingType !== 'trial'; }, default: 0 },
        remainingBalance: { type: Number },
        transactionRef: { type: String },
        screenshot: { type: String }, // URL to uploaded screenshot
        status: {
            type: String,
            enum: ['pending', 'verified', 'rejected', 'paid'],
            default: 'pending'
        },
        verifiedAt: { type: Date },
        verifiedBy: { type: ObjectId, ref: 'User' },
        rejectionReason: { type: String }
    },
    // Booking rejection reason (when owner rejects the booking)
    rejectionReason: { type: String, default: '' },
    balancePaidAt: { type: Date },
    balancePaidAmount: { type: Number }
}, {timestamps: true})

const Booking = mongoose.model('Booking', bookingSchema)
export default Booking;