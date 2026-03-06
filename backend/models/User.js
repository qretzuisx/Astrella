import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    role: {type: String, enum: ["owner", "user"], default: 'user'},
    image: {type: String, default: ''},
    contactNumber: {type: String, required: true},
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    // Shop Profile (for owners)
    shopProfile: {
        shopName: {type: String, default: ''},
        description: {type: String, default: ''},
        address: {type: String, default: ''},
        city: {type: String, default: ''},
        contactNumber: {type: String, default: ''}, // Synced with root contactNumber
        // Operating hours - stored as separate opening and closing times for booking validation
        openingTime: {type: String, default: '09:00'}, // Format: HH:MM (24-hour)
        closingTime: {type: String, default: '18:00'}, // Format: HH:MM (24-hour)
        operatingHours: {type: String, default: ''}, // Human-readable format for display
        availableDays: {type: [String], default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']},
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
