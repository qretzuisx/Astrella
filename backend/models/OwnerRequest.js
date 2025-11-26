import mongoose from "mongoose";
const {ObjectId} = mongoose.Schema.Types

const ownerRequestSchema = new mongoose.Schema({
    user: {type: ObjectId, ref: 'User', required: true},
    status: {type: String, enum: ["pending", "approved", "rejected"], default: "pending"},
    message: {type: String, default: ''}, // Optional message from user
    systemNote: {type: String, default: ''}, // System note/response
    reviewedBy: {type: ObjectId, ref: 'User'},
}, {timestamps: true})

const OwnerRequest = mongoose.model('OwnerRequest', ownerRequestSchema)
export default OwnerRequest

