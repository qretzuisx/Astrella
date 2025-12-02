export const verifyOwner = (req, res, next) => {
  if (!req.user) {
    return res.json({ success: false, message: "not authorized" });
  }
  
  if (req.user.role !== 'owner') {
    return res.json({ success: false, message: "Access denied. Owner role required." });
  }
  
  next();
};

export const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.json({ success: false, message: "not authorized" });
  }
  
  if (req.user.role !== 'admin') {
    return res.json({ success: false, message: "Access denied. Admin role required." });
  }
  
  next();
};
