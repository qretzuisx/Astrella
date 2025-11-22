import User from "../models/User.js"
import Gown from "../models/Gown.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'


// jwt token
const generateToken = (userId)=>{
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// register user
export const registerUser = async (req, res)=>{
    try {
        const {name, email, password} = req.body

        if(!name || !email || !password || password.length < 8){
            return res.json({sucess: false, message: 'Fill all the Fields !'})
        }

        const userExists = await User.findOne({email})
        if(userExists){
            return res.json({sucess: false, message: 'User already exists'})
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({name, email, password: hashedPassword})
        const token = generateToken(user._id.toString())
        res.json({sucess: true, token})


    } catch (error) {
        console.log(error.message);
        res.json({sucess: false, message: error.message})
    }
}

// login user
export const loginUser = async (req, res)=>{
    try {
        const {email, password} = req.body
        const user = await User.findOne({email})
        if(!user){
            return res.json({sucess: false, message: "User not found"})
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if(!isMatch){
            return res.json({sucess: false, message: "Invalid Credentials"})
        }
        const token = generateToken(user._id.toString())
        res.json({sucess: true, token})
    
    } catch (error) {
        console.log(error.message);
        res.json({sucess: false, message: error.message})
    }
}

// user data using jwt
export const getUserData = async (req, res) =>{
    try {
        const {user} = req;
        res.json({sucess: true, user})
    } catch (error) {
        console.log(error.message);
        res.json({sucess:false, message: error.message})
    }
}

// Request to become owner
export const requestOwnerRole = async (req, res) => {
    try {
        const { _id } = req.user;
        const { message } = req.body;

        // Check if user is already an owner
        const user = await User.findById(_id);
        if (user.role === 'owner' || user.role === 'admin') {
            return res.json({ success: false, message: "You already have owner or admin privileges" });
        }

        // Check if there's already a pending request
        const OwnerRequest = (await import("../models/OwnerRequest.js")).default;
        const existingRequest = await OwnerRequest.findOne({ 
            user: _id, 
            status: 'pending' 
        });

        if (existingRequest) {
            return res.json({ success: false, message: "You already have a pending request" });
        }

        // Create new request
        await OwnerRequest.create({
            user: _id,
            message: message || '',
            status: 'pending'
        });

        res.json({ success: true, message: "Owner request submitted successfully. Admin will review it." });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Get user's owner request status
export const getOwnerRequestStatus = async (req, res) => {
    try {
        const { _id } = req.user;
        const OwnerRequest = (await import("../models/OwnerRequest.js")).default;
        
        const request = await OwnerRequest.findOne({ user: _id })
            .sort({ createdAt: -1 });

        res.json({ success: true, request: request || null });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// AI Recommendation algorithm
const calculateRecommendationScore = (gown, preferences) => {
    let score = 0;
    const maxScore = 100;

    // Event Type Match (30 points)
    if (preferences.eventType) {
        const gownEventType = gown.eventType?.toLowerCase();
        const userEventType = preferences.eventType.toLowerCase();
        if (gownEventType === userEventType) {
            score += 30;
        } else if (gownEventType?.includes(userEventType) || userEventType.includes(gownEventType)) {
            score += 20;
        }
    }

    // Body Type Recommendations (25 points)
    const bodyTypeRecommendations = {
        'Hourglass': {
            colors: ['Navy', 'Black', 'Burgundy', 'Emerald'],
            fabrics: ['Satin', 'Silk', 'Chiffon'],
            styles: ['A-line', 'Mermaid', 'Fit and Flare']
        },
        'Pear': {
            colors: ['Dark', 'Navy', 'Black', 'Deep'],
            fabrics: ['Chiffon', 'Tulle', 'Organza'],
            styles: ['A-line', 'Ball Gown', 'Empire']
        },
        'Rectangle': {
            colors: ['All'],
            fabrics: ['Chiffon', 'Tulle', 'Organza', 'Satin'],
            styles: ['A-line', 'Ball Gown', 'Mermaid']
        },
        'Diamond': {
            colors: ['Dark', 'Navy', 'Black'],
            fabrics: ['Chiffon', 'Tulle'],
            styles: ['A-line', 'Empire']
        }
    };

    if (preferences.bodyType && bodyTypeRecommendations[preferences.bodyType]) {
        const rec = bodyTypeRecommendations[preferences.bodyType];
        const gownColor = gown.color?.toLowerCase();
        const gownFabric = gown.fabric?.toLowerCase();
        
        if (rec.colors.some(c => gownColor?.includes(c.toLowerCase()))) {
            score += 10;
        }
        if (rec.fabrics.some(f => gownFabric?.includes(f.toLowerCase()))) {
            score += 10;
        }
        score += 5; // Base score for body type consideration
    }

    // Skin Tone Color Recommendations (20 points)
    const skinToneColors = {
        'Warm': ['Gold', 'Peach', 'Coral', 'Ivory', 'Warm White', 'Blush', 'Cream'],
        'Cold': ['Silver', 'Blue', 'Pink', 'Cool White', 'Lavender', 'Mint'],
        'Neutral': ['All colors work well'],
        'Nuetral': ['All colors work well'] // Handle typo in assets
    };

    if (preferences.skinTone && skinToneColors[preferences.skinTone]) {
        const recommendedColors = skinToneColors[preferences.skinTone];
        const gownColor = gown.color?.toLowerCase();
        
        if (recommendedColors.some(c => gownColor?.includes(c.toLowerCase()))) {
            score += 20;
        } else if (recommendedColors[0] === 'All colors work well') {
            score += 15; // Neutral skin tone gets moderate score
        }
    }

    // Height Recommendations (15 points)
    if (preferences.height) {
        const gownFabric = gown.fabric?.toLowerCase();
        if (preferences.height === 'Small') {
            // Avoid heavy fabrics, prefer lighter ones
            if (['chiffon', 'tulle', 'organza'].some(f => gownFabric?.includes(f))) {
                score += 15;
            } else {
                score += 5;
            }
        } else if (preferences.height === 'Tall') {
            // Can handle heavier fabrics
            if (['satin', 'silk', 'velvet'].some(f => gownFabric?.includes(f))) {
                score += 15;
            } else {
                score += 10;
            }
        } else {
            // Medium height - flexible
            score += 12;
        }
    }

    // Face Shape Recommendations (10 points)
    const faceShapeRecommendations = {
        'Oval': { necklines: ['All'], accessories: 'Versatile' },
        'Square': { necklines: ['V-neck', 'Sweetheart', 'Round'], accessories: 'Soft' },
        'Round': { necklines: ['V-neck', 'Square', 'Off-shoulder'], accessories: 'Angular' },
        'Heart': { necklines: ['V-neck', 'Sweetheart'], accessories: 'Balanced' },
        'Diamond': { necklines: ['V-neck', 'Round', 'Sweetheart'], accessories: 'Soft' }
    };

    if (preferences.faceShape && faceShapeRecommendations[preferences.faceShape]) {
        score += 10; // Base score for face shape consideration
    }

    return Math.min(score, maxScore);
};

// Get AI Recommendations
export const getRecommendations = async (req, res) => {
    try {
        const { bodyType, skinTone, height, eventType, faceShape } = req.query;

        // Get all available and verified gowns
        const allGowns = await Gown.find({ available: true, verified: true })
            .populate('owner', 'name')
            .sort({ createdAt: -1 });

        if (allGowns.length === 0) {
            return res.json({ 
                success: true, 
                recommendations: [],
                message: "No gowns available at the moment" 
            });
        }

        // If no preferences provided, return all gowns
        if (!bodyType && !skinTone && !height && !eventType && !faceShape) {
            return res.json({ 
                success: true, 
                recommendations: allGowns.map(gown => ({
                    gown,
                    score: 50, // Default score
                    matchReason: "General recommendation"
                }))
            });
        }

        // Calculate scores for each gown
        const preferences = { bodyType, skinTone, height, eventType, faceShape };
        const scoredGowns = allGowns.map(gown => {
            const score = calculateRecommendationScore(gown, preferences);
            return {
                gown,
                score,
                matchReason: score >= 70 ? "Excellent match" : 
                            score >= 50 ? "Good match" : 
                            score >= 30 ? "Fair match" : "Consider"
            };
        });

        // Sort by score (highest first)
        scoredGowns.sort((a, b) => b.score - a.score);

        // Filter to show only gowns with score >= 20, or top 20 if all scores are low
        const filteredGowns = scoredGowns.filter(item => item.score >= 20);
        const recommendations = filteredGowns.length > 0 
            ? filteredGowns 
            : scoredGowns.slice(0, 20);

        res.json({ 
            success: true, 
            recommendations,
            preferences,
            totalMatches: recommendations.length
        });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}