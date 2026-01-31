const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Request = require('../models/Request'); 
const router = express.Router();


const JWT_SECRET = 'supersecretkey12345skillswappro';

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = new User({ name, email, password });
    await user.save();
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ token, user: { id: user._id, name, email } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});




router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔍 Login attempt:', { email });
    
    const user = await User.findOne({ email });
    console.log('👤 User found:', user ? user.name : 'NOT FOUND');
    
    if (!user) {
      console.log('❌ No user found');
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔑 Password match:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Password mismatch');
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // 👇 FIX: GENERATE JWT TOKEN (LINE 56)
    const payload = {
      id: user._id,
      email: user.email,
      name: user.name
    };
    
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-key-12345', {
      expiresIn: '24h'
    });
    
    console.log('✅ Login SUCCESS - Token generated');
    res.json({ 
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(400).json({ error: 'Login failed' });
  }
});



router.get('/profile/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('name email avatar bio createdAt');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // 🔥 REAL COUNTS FROM Request collection
    const totalSwaps = await Request.countDocuments({
      $or: [
        { fromUser: userId, status: 'accepted' },
        { toUser: userId, status: 'accepted' }
      ]
    });
    
    const skillsTaught = await Request.countDocuments({
      fromUser: userId, 
      status: 'accepted'
    });
    
    const skillsLearned = await Request.countDocuments({
      toUser: userId, 
      status: 'accepted'
    });
    
    console.log(`📊 ${user.name}: ${totalSwaps} swaps, ${skillsTaught} taught, ${skillsLearned} learned`);
    
    res.json({
      ...user._doc,
      totalSwaps,
      skillsTaught,
      skillsLearned
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: error.message });
  }
});

// 👈 ADD UPDATE PROFILE ROUTE
router.patch('/update-profile', auth, async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (avatar) updates.avatar = avatar;
    
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      updates, 
      { new: true, runValidators: true }
    ).select('-password');
    
    console.log('✅ Profile updated:', user.name);
    res.json({ 
      message: 'Profile updated successfully!',
      user 
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(400).json({ error: error.message });
  }
});


router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
