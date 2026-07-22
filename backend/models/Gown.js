import mongoose from "mongoose";
const {ObjectId} = mongoose.Schema.Types

/**
 * [SECTION] GOWN SCHEMA DEFINITION
 * [INFO] Represents a single gown/apparel item listed by a Shop Owner.
 */
const gownSchema = new mongoose.Schema({
    // [SECTION] OWNERSHIP & LOCATION
    owner: {type: ObjectId, ref: 'User'}, 
    location: {type: String, required: true},
    contactNumber: {type: String, required: true},
    
    // [SECTION] APPAREL DETAILS
    name: {type: String, required: true},
    description: {type: String, default: ''},
    eventType: {type: [String], enum: ["wedding", "traditional", "prom", "formal", "themed"], default: []},
    fabric: {type: String, required: true},
    size: {type: [String], default: ["Free Size"]},
    color: {type: String, required: true},
    image: { type: [String], required: true}, // [INFO] Array of ImageKit URLs
    
    // [SECTION] PRICING & LOGISTICS
    price: {type: Number, required: true},
    replacementCost: {type: Number, default: 0}, // [INFO] Full replacement value if gown is lost/destroyed
    laundryDays: {type: Number, default: 1, min: 0, max: 14}, // [INFO] Days required for laundry after a rental
    
    // [SECTION] AVAILABILITY & STATUS
    available: {type: Boolean, default: true},
    verified: {type: Boolean, default: false}, // [INFO] Flag for admin-verified premium items
    
    // [INFO] Current operational status (calculated dynamically in most views)
    status: {
        type: String,
        enum: ['Available', 'Unavailable', 'In-Laundry', 'Reserved', 'In-Use', 'Sold Out'],
        default: 'Available'
    },
    
    // [INFO] Owner-set manual status override. Takes priority over dynamic calculation.
    statusOverride: {
        type: String,
        enum: ['', 'Available', 'In-Laundry', 'Unavailable', 'Sold Out'],
        default: ''
    },
    
    // [SECTION] DISCOVERY & RECOMMENDATIONS
    // [INFO] Demographic tags used by the AI Stylist recommendation engine.
    ageGroup: {type: [String], default: []},
    sex: {type: String, enum: ['Male', 'Female', 'Unisex', ''], default: ''},
    silhouette: {
        type: String,
        enum: ['', 'A-Line', 'Mermaid', 'Ball Gown', 'Sheath', 'Empire', 'Shift', 'Wrap', 'Peplum', 'Trumpet'],
        default: ''
    },
    
    // [SECTION] METRICS
    views: { type: Number, default: 0 } // [INFO] Tracks popularity/clicks for trending sections
}, {timestamps: true})

// [SECTION] INDEXES (Performance Optimization)
gownSchema.index({ views: -1, createdAt: -1 });
gownSchema.index({ available: 1, verified: 1, createdAt: -1 });

const Gown = mongoose.model('Gown', gownSchema) 

export default Gown
