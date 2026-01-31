const express = require('express');
const router = express.Router();
const Request = require('../models/Request');

// INLINE AUTH (matches your authRouter.js)
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = 'supersecretkey12345skillswappro';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;  // { id: user._id }
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

router.post('/', auth, async (req, res) => {
  try {
    console.log('📥 GOT:', req.body);
    
    const { fromUserId, toUserId, fromSkillId, toSkillId } = req.body;
    
    // VALIDATE ALL 4 FIELDS
    if (!fromUserId || !toUserId || !fromSkillId || !toSkillId) {
      console.log('❌ MISSING:', { fromUserId, toUserId, fromSkillId, toSkillId });
      return res.status(400).json({ 
        message: `Missing fields: ${!fromUserId ? 'fromUserId' : ''} ${!toUserId ? 'toUserId' : ''} ${!fromSkillId ? 'fromSkillId' : ''} ${!toSkillId ? 'toSkillId' : ''}` 
      });
    }

    const request = new Request({
      fromUser: fromUserId,
      toUser: toUserId, 
      fromSkill: fromSkillId,
      toSkill: toSkillId
    });

    await request.save();
    const populated = await Request.findById(request._id)
      .populate('fromUser toUser fromSkill toSkill');
    
    console.log('✅ SAVED:', request._id);
    res.status(201).json(populated);
  } catch (error) {
    console.error('💥 ERROR:', error);
    res.status(500).json({ message: error.message });
  }
});


// GET /api/requests/me
router.get('/me', auth, async (req, res) => {
  try {
    const sentRequests = await Request.find({ fromUser: req.user.id })
      .populate('toUser', 'name email avatar')
      .populate('fromSkill', 'title description level')
      .populate('toSkill', 'title description level')
      .sort({ createdAt: -1 });

    const receivedRequests = await Request.find({ toUser: req.user.id })
      .populate('fromUser', 'name email avatar')
      .populate('fromSkill', 'title description level')
      .populate('toSkill', 'title description level')
      .sort({ createdAt: -1 });

    res.json({ sentRequests, receivedRequests });
  } catch (error) {
    console.error('💥 GET /me ERROR:', error);
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log('🔄 PUT request:', { 
      requestId: id, 
      status, 
      loggedInUserId: req.user.id,
      tokenUserId: req.user.id 
    });
    
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const request = await Request.findById(id);
    if (!request) {
      console.log('❌ Request not found:', id);
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // 🔥 CRITICAL DEBUG - Show ALL IDs
    console.log('🔍 DEBUG INFO:');
    console.log('   Request.toUser:', request.toUser);
    console.log('   Request.toUser.toString():', request.toUser.toString());
    console.log('   Logged in user:', req.user.id);
    console.log('   MATCH?', request.toUser.toString() === req.user.id);
    
    // 🔥 MAIN FIX - More flexible auth check
    const isReceiver = request.toUser.toString() === req.user.id;
    console.log('🔍 Is receiver?', isReceiver);
    
    if (!isReceiver) {
      console.log('❌ AUTH FAILED - User is not receiver');
      return res.status(403).json({ 
        message: 'Only the receiver can accept/reject requests',
        debug: {
          expectedReceiver: request.toUser.toString(),
          actualUser: req.user.id,
          isReceiver
        }
      });
    }
    
    request.status = status;
    await request.save();
    
    console.log('✅ SUCCESS - Status updated to:', status);
    res.json({ message: 'Success', status });
    
  } catch (error) {
    console.error('💥 FULL ERROR:', error);
    console.error('💥 Stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
});

// ADD this route to your authRouter.js (after /me route):
router.get('/profile/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user profile + swap stats
    const user = await User.findById(userId)
      .select('name email avatar bio totalSwaps rating socialLinks createdAt');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Count completed swaps
    const completedSwaps = await Request.countDocuments({
      $or: [
        { fromUser: userId, status: 'accepted' },
        { toUser: userId, status: 'accepted' }
      ]
    });
    
    res.json({
      ...user._doc,
      totalSwaps: completedSwaps,
      skillsTaught: await Request.countDocuments({ fromUser: userId, status: 'accepted' }),
      skillsLearned: await Request.countDocuments({ toUser: userId, status: 'accepted' })
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
