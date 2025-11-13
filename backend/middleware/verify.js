


export const verifyOwner = async (req, res, next) =>{
    if(!req.user){
        return res.status(401).json({ success: false, message: "Not authenticated"});
    }
    if(req.user.role !== "owner" && req.user.role !== "admin"){
        return res.status(403).json({ success: false, message: "Access denied. Owners only." });
    }
    next();
}

export const verifyAdmin = async (req, res, next) =>{
    if(!req.user){
        return res.status(401).json({ success: false, message: "Not authenticated"});
        }
        if(req.user.role !== "admin"){
            return res.status(403).json({ success: false, message: "Access denied. Admin only." });
        }
        next();
    }