import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types

/**
 * [SECTION] BOOKING SCHEMA DEFINITION
 * [INFO] Manages the rental lifecycle, trial holds, and financial transactions for gowns.
 */
const bookingSchema = new mongoose.Schema({
    // [SECTION] ASSOCIATIONS
    gown: { type: ObjectId, ref: "Gown", required: true },
    user: { type: ObjectId, ref: "User", required: true },
    owner: { type: ObjectId, ref: "User", required: true }, // [INFO] The boutique owner
    
    // [SECTION] BOOKING LIFECYCLE
    /**
     * [INFO] Status Flow:
     * - Reservation: pending -> confirmed -> completed OR canceled
     * - Trial: trial -> canceled/expired OR converted to pending (reservation)
     */
    status: {
        type: String,
        enum: ["trial", "pending", "confirmed", "canceled", "completed", "expired", "overdue"],
        default: "pending"
    },
    bookingType: {
        type: String,
        enum: ["reservation", "trial"],
        default: "reservation"
    },
    
    // [INFO] 24-hour hold for trials. If now > trialExpiresAt, the gown is released.
    trialExpiresAt: { type: Date }, 
    
    // [SECTION] SCHEDULE
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    pickupTime: { type: String },
    returnTime: { type: String },
    
    // [SECTION] OWNER CONFIRMATIONS
    // [INFO] Used to verify when the physical hand-off and return actually happened.
    pickupConfirmedAt: { type: Date },
    returnConfirmedAt: { type: Date },
    
    // [SECTION] PRICING & MEASUREMENTS
    price: { type: Number, required: true },
    contactNumber: { type: String, default: '' },
    measurements: {
        waist: { type: Number },
        hips: { type: Number },
        unit: { type: String, default: 'inches' }
    },
    
    // [SECTION] PAYMENT INFORMATION
    payment: {
        method: { type: String, enum: ['gcash', 'in_store'], default: 'gcash' },
        depositAmount: { type: Number, required: function () { return this.bookingType !== 'trial'; }, default: 0 },
        totalAmount: { type: Number, required: function () { return this.bookingType !== 'trial'; }, default: 0 },
        remainingBalance: { type: Number },
        transactionRef: { type: String },
        screenshot: { type: String }, // [INFO] ImageKit URL to payment proof
        status: {
            type: String,
            enum: ['pending', 'verified', 'rejected', 'paid'],
            default: 'pending'
        },
        verifiedAt: { type: Date },
        verifiedBy: { type: ObjectId, ref: 'User' },
        rejectionReason: { type: String }
    },
    
    // [SECTION] REJECTION & SETTLEMENT
    rejectionReason: { type: String, default: '' },
    balancePaidAt: { type: Date },
    balancePaidAmount: { type: Number }
}, { timestamps: true })

// [SECTION] PERFORMANCE INDEXES
bookingSchema.index({ gown: 1, status: 1 });
bookingSchema.index({ status: 1, pickupDate: 1, returnDate: 1 });

const Booking = mongoose.model('Booking', bookingSchema)
export default Booking;