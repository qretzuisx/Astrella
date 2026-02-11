import mongoose from "mongoose";
const {ObjectId} = mongoose.Schema.Types

const gownSchema = new mongoose.Schema({
    owner: {type: ObjectId, ref: 'User'},
    name: {type: String, required: true},
    location: {type: String, required: true},
    contactNumber: {type: String, required: true},
    eventType: {type: [String], enum: ["wedding", "traditional", "prom", "formal", "themed"], default: []},
    fabric: {type: String, required: true},
    description: {type: String, default: ''},
    price: {type: Number, required: true},
    size: {type: [String], default: ["Free Size"]},
    color: {type: String, required: true},
    image: { type: [String], required: true},
    available: {type: Boolean, default: true},
    verified: {type: Boolean, default: false},
    laundryDays: {type: Number, default: 1, min: 0, max: 14},
    // Status field for gown availability
    status: {
        type: String,
        enum: ['Available', 'Unavailable', 'In-Laundry', 'Reserved', 'In-Use'],
        default: 'Available'
    },
    // Optional demographic tags to improve browsing/recommendations
    ageGroup: {type: String, default: ''},
    sex: {type: String, enum: ['Male', 'Female', 'Unisex', ''], default: ''},
}, {timestamps: true})

const Gown = mongoose.model('Gown', gownSchema) 

export default Gown
