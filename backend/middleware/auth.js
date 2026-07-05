import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next)=>{
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).json({success: false, message: "not authorized"});
  }
  // support "Bearer <token>" or raw token
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.id || payload;
    if(!userId){
      return res.status(401).json({success: false, message: "not authorized"});
    }
    req.user = await User.findById(userId).select("-password");
    if(!req.user){
      return res.status(401).json({success: false, message: "not authorized"});
    }
    next();
  } catch (error) {
    return res.status(401).json({success: false, message: "not authorized"});
  }
}

export const optionalProtect = async (req, res, next)=>{
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return next();
  }
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.id || payload;
    if(userId){
      req.user = await User.findById(userId).select("-password");
    }
  } catch (error) {
    // Fail silently and proceed as guest
  }
  next();
}
