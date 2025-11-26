import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    role: {type: String, enum: ["owner", "user"], default: 'user'},
    image: {type: String, default: ''},
    contactNumber: {type: String, default: ''},
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    
    // Shop Profile (for owners)
    shopProfile: {
        shopName: {type: String, default: ''},
        description: {type: String, default: ''},
        address: {type: String, default: ''},
        city: {type: String, default: ''},
        operatingHours: {type: String, default: ''},
        businessPermit: {type: String, default: ''}, // URL to uploaded document
        dtiRegistration: {type: String, default: ''}, // URL to uploaded document
        verified: {type: Boolean, default: false},
        verifiedAt: {type: Date},
        socialMedia: {
            facebook: {type: String, default: ''},
            instagram: {type: String, default: ''}
        }
    }
},{timestamps: true})

const User = mongoose.model('User', userSchema)

export default User