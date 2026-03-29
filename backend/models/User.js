import mongoose from "mongoose";

/**
 * [SECTION] USER SCHEMA DEFINITION
 * [INFO] Defines the structure for all users (Customers and Shop Owners) in the Astrella platform.
 */
const userSchema = new mongoose.Schema({
    // [SECTION] BASIC IDENTITY
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    
    // [INFO] Roles: 'user' for Customers, 'owner' for Boutique Owners
    role: {type: String, enum: ["owner", "user"], default: 'user'},
    image: {type: String, default: ''},
    
    // [SECTION] CONTACT & VALIDATION
    contactNumber: {
        type: String, 
        required: true,
        validate: {
            validator: function(v) {
                // [INFO] Enforces 11-digit Philippine mobile number format
                return /^\d{11}$/.test(v);
            },
            message: 'Phone number must be exactly 11 digits'
        }
    },
    
    // [SECTION] SECURITY & RECOVERY
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    // [SECTION] SHOP PROFILE (OWNERS ONLY)
    // [INFO] This nested object stores boutique-specific details if the user is an owner.
    shopProfile: {
        shopName: {type: String, default: ''},
        description: {type: String, default: ''},
        address: {type: String, default: ''},
        city: {type: String, default: ''},
        contactNumber: {
            type: String, 
            default: '',
            validate: {
                validator: function(v) {
                    // Allow empty string (since default is ''), but validate if provided
                    if (v === '') return true;
                    return /^\d{11}$/.test(v);
                },
                message: 'Phone number must be exactly 11 digits'
            }
        }, 
        
        // [SECTION] OPERATIONS & BOOKING CONSTRAINTS
        // [INFO] Operating hours are used to validate appointment times during the booking flow.
        openingTime: {type: String, default: '09:00'}, // Format: HH:MM (24-hour)
        closingTime: {type: String, default: '18:00'}, // Format: HH:MM (24-hour)
        operatingHours: {type: String, default: ''}, // Human-readable format for display
        availableDays: {type: [String], default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']},
        
        // [SECTION] VERIFICATION DOCUMENTS
        businessPermit: {type: String, default: ''}, // URL to uploaded document (ImageKit)
        dtiRegistration: {type: String, default: ''}, // URL to uploaded document (ImageKit)
        verified: {type: Boolean, default: false},
        verifiedAt: {type: Date},
        
        // [SECTION] SOCIAL ENGAGEMENT
        socialMedia: {
            facebook: {type: String, default: ''}
        }
    }
},{timestamps: true})

const User = mongoose.model('User', userSchema)

export default User
