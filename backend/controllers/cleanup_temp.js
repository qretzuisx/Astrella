export const cleanupExpiredTrials = async (req, res) => {
  try {
    const now = new Date();
    // Find all trial bookings that have expired
    const expiredTrials = await Booking.find({
      status: 'trial',
      trialExpiresAt: { $lt: now }
    });

    if (expiredTrials.length === 0) {
      return res.json({ success: true, message: "No expired trials found", count: 0 });
    }

    // Update them to 'expired' (or 'canceled')
    // Here we use 'canceled' or a new status 'expired' if you prefer. 
    // The user mentioned "automatically be removed from managing bookings", 
    // and our frontend already filters out expired trials.
    // Setting them to 'canceled' ensures they don't show up in any active lists.
    const result = await Booking.updateMany(
      { _id: { $in: expiredTrials.map(b => b._id) } },
      { $set: { status: 'canceled' } }
    );

    res.json({ 
      success: true, 
      message: `${expiredTrials.length} expired trials cleaned up`, 
      count: expiredTrials.length 
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.json({ success: false, message: error.message });
  }
};
